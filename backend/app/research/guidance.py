"""C2: management guidance extraction (map step). One LLM call per transcript, cached forever by transcript content.

  transcript pages -> guidance_map (T2) -> items {metric, target, horizon, quote, page}
                   -> verify each quote against the page text (research/verify.py) -> drop what can't be verified
"""
from __future__ import annotations

import hashlib
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass

from app.llm import run_task, store
from app.research import loader
from app.research.verify import verify_quote
from app.settings import get_settings

PARALLEL = 3          # transcripts read at once (each call mostly waits on a model)


@dataclass(frozen=True)
class Guidance:
    gid: str                 # stable id, e.g. 'INFY:concall_Q4FY26#3'
    doc_id: str
    period: str              # call period, e.g. 'Q4 FY26'
    metric: str
    target: str
    horizon: str | None
    quote: str
    page: int                # page the quote was VERIFIED on (may differ by 1 from what the model cited)


# A guidance statement looks FORWARD. "AI services revenue was 8.2% of revenue" is a reported fact, not guidance.
_FORWARD = re.compile(r"expect|guid|will\b|won't|target|aim|plan|forecast|anticipat|outlook|range|between|should|looking|"
                      r"assum|project|going to|continu|remain|maintain|intend|estimate|likely|\bby (fy|q|march|december)|"
                      r"to be (between|in)|growth of|decline|reduction|impact", re.IGNORECASE)

_QUOTE_CHARS = " \"'`\u201c\u201d\u2018\u2019"


def clean_quote(q: str) -> str:
    """Strip stray outer quote marks the model sometimes copies along with the passage."""
    return q.strip().strip(_QUOTE_CHARS).strip()


def numbered(pages: list[str]) -> str:
    return "\n\n".join(f"[page {i}]\n{t}" for i, t in enumerate(pages, 1))


def extract_for_doc(doc_id: str, period: str, symbol: str) -> tuple[list[Guidance], dict]:
    """-> (verified guidance items, stats {raw, verified, dropped}). Raises LLMUnavailable if no model could answer."""
    pages = loader.load_pages(doc_id)
    if not pages:
        return [], {"raw": 0, "verified": 0, "dropped": 0}
    text = numbered(pages)
    out = run_task("guidance_map", {"transcript_pages": text}, feature="pull.guidance", unit=symbol,
                   cache_key_extra=f"{doc_id}|{hashlib.sha256(text.encode()).hexdigest()[:16]}")
    items, dropped = [], 0
    seen: set[tuple[str, str, str | None]] = set()
    for it in out.items:
        if not _FORWARD.search(f"{it.target} {it.quote}"):
            continue                                       # a reported actual, not forward-looking guidance
        page = verify_quote(it.quote, pages, it.page)
        if page is None:
            dropped += 1
            continue
        key = (it.metric.lower(), it.target.lower(), (it.horizon or "").lower())
        if key in seen:                                   # the model sometimes repeats a confirmation
            continue
        seen.add(key)
        items.append(Guidance(f"{doc_id}#{len(items) + 1}", doc_id, period, it.metric, it.target, it.horizon,
                              clean_quote(it.quote), page))
    if dropped:
        store.incr(get_settings().llm_db_path, "grounding_dropped", dropped)
    return items, {"raw": len(out.items), "verified": len(items), "dropped": dropped}


def extract_all(symbol: str, progress=None) -> tuple[list[Guidance], list[str]]:
    """Guidance from every stored transcript of `symbol`, oldest call first. -> (items, notes)."""
    docs = sorted((d for d in loader.stored_docs(symbol) if d["kind"] == "concall"), key=lambda d: d["doc_id"])
    # order by fiscal period (doc ids sort badly: Q1FY27 < Q2FY26 lexicographically) -> sort by (FY, Q)
    def key(d: dict) -> tuple[int, int]:
        q, fy = d["period"].split()
        return int(fy[2:]), int(q[1])
    docs.sort(key=key)
    results: dict[int, tuple[list[Guidance], dict] | Exception] = {}

    def one(i: int, d: dict) -> None:
        try:
            results[i] = extract_for_doc(d["doc_id"], d["period"], symbol)
        except Exception as e:  # noqa: BLE001 - one bad transcript must not sink the report
            results[i] = e

    # the calls are independent and mostly waiting on a model: read the transcripts side by side
    if progress and docs:
        progress(f"Reading {len(docs)} earnings calls side by side")
    with ThreadPoolExecutor(max_workers=PARALLEL) as pool:
        futures = {pool.submit(one, i, d): i for i, d in enumerate(docs)}
        for n, fut in enumerate(as_completed(futures), 1):
            fut.result()
            if progress:
                progress(f"Read the {docs[futures[fut]]['period']} call ({n}/{len(docs)})")
    allg: list[Guidance] = []
    notes: list[str] = []
    for i, d in enumerate(docs):                                  # oldest call first, as before
        got = results[i]
        if isinstance(got, Exception):
            notes.append(f"{d['period']} call: guidance extraction failed ({type(got).__name__})")
            continue
        items, st = got
        allg += items
        if st["dropped"]:
            notes.append(f"{d['period']} call: {st['dropped']} unverifiable quote(s) dropped")
    return allg, notes

