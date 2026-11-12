"""POST /ask: answer a question about the filing or research report on screen, grounded in that evidence only.

Evidence blocks (numbered, so a citation names its block):
  filing screen  -> block 1..n = the filing PDF's first pages (verbatim text), plus the structured card (results numbers etc.)
  research screen -> block 1..n = the verified quotes already in the cached report, plus its structured verdicts

Server-side checks on the model's answer (it is never trusted):
  1. every citation quote must verify against its evidence block (fuzzy match AND every number on the block)
  2. every number in the answer must already exist in the evidence (structured data or text): the model may not calculate
  3. an answer that is neither cited nor made purely of structured-card figures is rejected
Otherwise: answerable=False with a plain sentence. A model outage is also reported plainly, never faked.
"""
from __future__ import annotations

import json
import re

from app import db
from app import models as m
from app.ingest import docs
from app.llm import LLMUnavailable, run_task
from app.pipeline import mgmt_bio
from app.pipeline.results import load_enrichments
from app.research import build as research_build
from app.research.verify import verify_quote

FILING_PAGES = 4
NOT_IN_EVIDENCE = "That isn't stated in this filing, so FINN won't guess."
NOT_IN_REPORT = "That isn't covered by this research report, so FINN won't guess."
NO_MODEL = "FINN can't reach a model right now (free-tier quota). Try again in a while."
_NUM = re.compile(r"\d[\d,]*(?:\.\d+)?")


_PERIOD_LABEL = re.compile(r"\b(?:FY|Q|H)\s*'?\d{1,4}\b", re.IGNORECASE)      # FY26, Q3, H1, FY'27: labels, not figures


def _floats(text: str) -> list[float]:
    out = []
    for n in _NUM.findall(_PERIOD_LABEL.sub(" ", text or "")):
        try:
            out.append(float(n.replace(",", "")))
        except ValueError:
            continue
    return out


def numbers_supported(answer: str, evidence: str, question: str = "") -> bool:
    """Every figure in the answer must appear in the evidence (or the question) within rounding: ₹65,436 vs 65436.2."""
    have = _floats(evidence) + _floats(question)
    # relative 0.5% (₹65,436 vs 65436.2) with a 0.05 floor for decimal rounding (3,699.59 vs 3699.6). NOT a loose absolute
    # tolerance: that let "17%" pass because an unrelated 16.8 sat in the evidence.
    return all(any(abs(a - e) <= max(0.05, 0.005 * abs(e)) for e in have) for a in _floats(answer))


def card_facts(card) -> dict | None:
    """Structured, already-verified numbers of an enrichment card (never page text)."""
    if isinstance(card, m.ResultsCard):
        return {"type": "results", "period": card.period, "basis": card.basis, "unit": "INR crore",
                "metrics": {x.name: {"value": x.value, "qoq_pct": x.qoq_pct, "yoy_pct": x.yoy_pct,
                                     "previous_quarter": x.prev_q, "year_ago": x.prev_y} for x in card.metrics},
                "ebitda_margin_pct": card.margin_ebitda_pct, "screener_cross_check": card.cross_check.status}
    if isinstance(card, m.BioCard):
        return {"type": "management", "person": card.person, "role": card.role, "change": card.change,
                "effective": card.effective, "background": card.background}
    if isinstance(card, m.OneLiner):
        return {"type": "summary", "text": card.text}
    return None


def filing_evidence(filing_id: str) -> dict | None:
    with db.connect() as con:
        row = con.execute("SELECT f.id,f.symbol,f.company_name,f.headline,f.subcategory,f.pdf_name,f.filed_at,c.category "
                          "FROM filings f LEFT JOIN classifications c ON c.id=f.id WHERE f.id=?", (filing_id,)).fetchone()
    if not row:
        return None
    pages: list[str] = []
    if row["pdf_name"]:
        try:
            import pymupdf
            doc = pymupdf.open(stream=docs.get_pdf(row["pdf_name"]), filetype="pdf")
            pages = [doc[i].get_text().strip() for i in range(min(FILING_PAGES, len(doc)))]
        except Exception:  # noqa: BLE001 - a missing PDF just means less evidence (answer from the card/headline)
            pages = []
    facts = card_facts(load_enrichments([filing_id]).get(filing_id))
    return {"title": f"{row['company_name'] or row['symbol']}: {row['headline']}", "symbol": row["symbol"],
            "doc": f"{row['symbol']}:filing_{filing_id[:8]}", "pages": pages, "facts": facts,
            "headline": row["headline"], "category": row["category"]}


def research_evidence(symbol: str) -> dict | None:
    rep = research_build.get_cached(symbol)
    if rep is None or rep.status == "failed":
        return None
    blocks: list[tuple[str, int, str]] = []          # (doc_id, page, quote): each verified quote is one evidence block
    verdicts = []
    for it in rep.pvd:
        refs = []
        for claim in (it.promised, it.outcome):
            for s in (claim.sources if claim else []):
                blocks.append((s.doc_id, s.page, s.quote))
                refs.append(len(blocks))
        verdicts.append({"metric": it.metric, "said_in": it.said_in, "horizon": it.horizon, "verdict": it.verdict,
                         "reason": it.reason, "evidence_blocks": refs,
                         "filed_actual": it.actual.model_dump() if it.actual else None})
    snap = rep.snapshot.model_dump() if rep.snapshot else None
    return {"title": f"{rep.name or symbol}: research report", "symbol": symbol, "doc": symbol, "pages": [b[2] for b in blocks],
            "block_meta": blocks, "facts": {"type": "research", "verdicts": verdicts, "financial_snapshot": snap,
                                            "gaps": rep.gaps}, "headline": rep.name or symbol, "category": None}


def build_input(question: str, ev: dict) -> str:
    parts = [f"question: {question}", f"document set: {ev['title']}"]
    if ev["facts"]:
        parts.append("structured data (verified numbers):\n" + json.dumps(ev["facts"], ensure_ascii=False, default=str))
    for i, text in enumerate(ev["pages"], 1):
        parts.append(f"evidence block {i}:\n{text}")
    return "\n\n".join(parts)


def answer(req: m.AskRequest) -> m.AskResponse:
    ctx = req.context
    ev = (filing_evidence(ctx.filing_id) if ctx.filing_id else research_evidence(ctx.symbol) if ctx.symbol else None)
    if ev is None or (not ev["pages"] and not ev["facts"]):
        return m.AskResponse(answer="FINN has no document open for this question.", claims=[], answerable=False)
    not_found = NOT_IN_REPORT if ctx.screen == "research" else NOT_IN_EVIDENCE
    try:
        out = run_task("ask", {"ask_input": build_input(req.question, ev)}, feature="ask", unit=ev["symbol"],
                       cache_key_extra=f"{ctx.filing_id or ctx.symbol}|{re.sub(r'\s+', ' ', req.question.lower()).strip()}")
    except LLMUnavailable:
        return m.AskResponse(answer=NO_MODEL, claims=[], answerable=False)
    if not out.answerable or not out.answer.strip():
        return m.AskResponse(answer=not_found, claims=[], answerable=False)

    sources: list[m.Source] = []
    for c in out.citations:
        if not (1 <= c.source <= len(ev["pages"])):
            continue
        if "block_meta" in ev:                      # research: blocks are already-verified quotes with known doc/page
            doc_id, page, _ = ev["block_meta"][c.source - 1]
            if verify_quote(c.quote, [ev["pages"][c.source - 1]], 1) is not None:
                sources.append(m.Source(doc_id=doc_id, page=page, quote=c.quote))
        else:
            page = verify_quote(c.quote, ev["pages"], c.source)
            if page is not None:
                sources.append(m.Source(doc_id=ev["doc"], page=page, quote=c.quote))
    evidence_text = json.dumps(ev["facts"], default=str) + "\n" + "\n".join(ev["pages"]) + "\n" + ev["headline"]
    if not numbers_supported(out.answer, evidence_text, req.question):
        return m.AskResponse(answer=not_found, claims=[], answerable=False)         # a figure FINN can't point to
    structured_only = bool(ev["facts"]) and not sources and not _quoted_text_needed(out.answer, ev)
    if not sources and not structured_only:
        return m.AskResponse(answer=not_found, claims=[], answerable=False)         # uncited, not from the card
    claims = [m.Claim(text=out.answer.strip(), kind="fact", sources=sources, verified=True)] if sources else []
    return m.AskResponse(answer=out.answer.strip(), claims=claims, answerable=True)


def _quoted_text_needed(answer: str, ev: dict) -> bool:
    """An uncited answer is acceptable only if its figures all live in the structured data (the card), not page text."""
    facts_text = json.dumps(ev["facts"], default=str)
    return not numbers_supported(answer, facts_text) or not _floats(answer)


_UNUSED = mgmt_bio
