"""C3: promised vs delivered (reduce step).

  guidance items (from earlier calls)  +  relevant passages from LATER calls (keyword retrieval, no embeddings)
  +  actuals from screener.in tables with CODE-computed growth (the model never does arithmetic)
      -> pvd_reduce (T3) -> verdicts {met, missed, slipped, quietly_dropped, pending, raised, cut} + verified sources

Every source quote the model returns is verified against the page text (research/verify.py); judgments that lose all
their evidence are dropped. Verdict definitions live in the prompt and in .claude/skills/finn-grounding/SKILL.md.
"""

from __future__ import annotations

import json
import math
import re
from collections import Counter

from app import models as m
from app.ingest import screener
from app.llm import run_task, store
from app.research import loader
from app.research.guidance import Guidance
from app.research.verify import verify_quote
from app.settings import get_settings

BATCH = 6  # guidance items per reduce call (keeps reasoning + output manageable)
PASSAGES_PER_CALL = 2
PASSAGE_CHARS = 700
MAX_ITEMS = 12

_STOP = {
    "a",
    "an",
    "the",
    "and",
    "or",
    "of",
    "to",
    "in",
    "on",
    "for",
    "with",
    "by",
    "at",
    "from",
    "as",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "this",
    "that",
    "these",
    "those",
    "it",
    "its",
    "we",
    "our",
    "us",
    "you",
    "your",
    "they",
    "their",
    "will",
    "would",
    "shall",
    "should",
    "can",
    "could",
    "may",
    "might",
    "per",
    "than",
    "then",
    "so",
    "such",
    "not",
    "no",
    "also",
    "over",
    "under",
    "into",
    "out",
    "up",
    "down",
    "about",
    "after",
    "before",
    "during",
    "between",
    "quarter",
    "year",
    "years",
    "financial",
    "fy",
    "growth",
    "guidance",
    "expect",
    "expected",
    "expecting",
    "continue",
    "continued",
    "around",
    "approximately",
    "roughly",
}
_MEASURABLE = re.compile(
    r"growth|margin|revenue|ebitda|ebit|profit|pat|capex|aum|loan|credit cost|nim|opex|cost|order|"
    r"deal|headcount|tax|dividend|debt|leverage|capacity",
    re.IGNORECASE,
)


def keywords(*texts: str) -> set[str]:
    words = re.findall(r"[a-z][a-z\-]{2,}|\d+(?:\.\d+)?%?", " ".join(texts).lower())
    return {w for w in words if w not in _STOP}


def chunks(pages: list[str], size: int = PASSAGE_CHARS) -> list[tuple[int, str]]:
    """Paragraph-ish windows of ~`size` chars, each tagged with its 1-based page."""
    out: list[tuple[int, str]] = []
    for pno, text in enumerate(pages, 1):
        buf = ""
        for para in re.split(r"\n\s*\n|(?<=[.?!])\s*\n", text):
            para = re.sub(r"\s+", " ", para).strip()
            if not para:
                continue
            if buf and len(buf) + len(para) > size:
                out.append((pno, buf))
                buf = ""
            buf = f"{buf} {para}".strip()
        if buf:
            out.append((pno, buf))
    return out


def top_passages(g: Guidance, pages: list[str], k: int = PASSAGES_PER_CALL) -> list[dict]:
    """The k passages of a LATER call that overlap most with the guided metric/target (tf-idf-lite)."""
    cs = chunks(pages)
    if not cs:
        return []
    want = keywords(g.metric, g.target, g.horizon or "")
    if not want:
        return []
    df = Counter(w for _, t in cs for w in keywords(t) & want)
    n = len(cs)
    scored = []
    for pno, t in cs:
        kw = keywords(t) & want
        s = sum(math.log(1 + n / (1 + df[w])) for w in kw)
        if re.search(r"\d", t):
            s *= 1.15  # passages with numbers are what settle a target
        scored.append((s, pno, t))
    scored.sort(key=lambda x: -x[0])
    return [{"page": p, "text": t[: PASSAGE_CHARS + 200]} for s, p, t in scored[:k] if s > 0]


def select_items(items: list[Guidance], max_n: int = MAX_ITEMS) -> list[Guidance]:
    """Prefer measurable guidance that has at least one later call to be judged against; newest-judgeable first."""

    def rank(g: Guidance) -> tuple[int, int]:
        fy, q = int(g.period.split()[1][2:]), int(g.period.split()[0][1])
        return (0 if _MEASURABLE.search(g.metric) else 1, -(fy * 10 + q))

    return sorted(items, key=rank)[:max_n]


def period_key(period: str) -> tuple[int, int]:
    q, fy = period.split()
    return int(fy[2:]), int(q[1])


DEFINITIONS = {
    "revenue": "Reported consolidated revenue in INR crore. NOT constant currency, NOT a segment.",
    "operating_margin_pct": "Operating profit before depreciation / revenue, reported INR. This is an EBITDA-type margin, "
                            "NOT an EBIT or operating margin after depreciation.",
    "net_profit": "Reported consolidated net profit in INR crore.",
}
COMPARISON_RULES = [
    "Table actuals are reported-INR figures. They cannot settle guidance stated in constant currency (cc), for a segment, "
    "or as an EBIT / operating margin after depreciation. Settle those only from management's own later statements.",
    "A table actual may settle plain revenue or net-profit growth guidance, or an EBITDA-margin guidance.",
    "Prefer management's own later statement of the outcome when it exists; cite its page and quote.",
]
_CC = re.compile(r"constant currency|\bcc\b|\bc\.c\.", re.IGNORECASE)


def actual_is_comparable(g: Guidance, fact: dict) -> bool:
    """Hard guard on top of the prompt: a screener table cell may only settle a promise it actually measures."""
    text = f"{g.metric} {g.target} {g.quote}"
    if _CC.search(text):
        return False                                       # reported INR can't settle constant-currency guidance
    if fact["metric"] == "operating_margin_pct" and not re.search(r"ebitda|opm", text, re.IGNORECASE):
        return False                                       # 'operating margin' guidance is usually EBIT-type
    return not (fact["unit"] == "pct" and "margin" not in g.metric.lower() and "margin" not in g.quote.lower())


# ───────────────────────── actuals with code-computed growth ─────────────────────────
def actuals_from_screener(html: str) -> list[dict]:
    """Referenced facts for the model: quarterly + annual sales / operating margin / net profit, with growth computed
    HERE. Each fact has a stable `actual_ref` the model must cite (it may not invent table cells)."""
    out: list[dict] = []

    def add(
        table: str,
        headers: list[str],
        rows: dict,
        label_alts: tuple[str, ...],
        name: str,
        unit: str,
        last_n: int,
        yoy_lag: int | None,
    ) -> None:
        row = next((rows[k] for lab in label_alts for k in rows if k == lab or k.startswith(lab)), None)
        if not row:
            return
        idx = [i for i, h in enumerate(headers) if h != "TTM"][-last_n:]
        for i in idx:
            v = row[i] if i < len(row) else None
            if v is None:
                continue
            ref = f"screener.{table}.{name}.{headers[i].replace(' ', '')}"
            fact = {"actual_ref": ref, "metric": name, "period": headers[i], "value": v, "unit": unit,
                    "definition": DEFINITIONS[name], "source": "screener.in standardised table (primary filings)"}
            if yoy_lag and i - yoy_lag >= 0 and row[i - yoy_lag] not in (None, 0) and unit == "INR_CR":
                fact["yoy_growth_pct"] = round((v - row[i - yoy_lag]) / abs(row[i - yoy_lag]) * 100, 1)
            out.append(fact)

    for table, lag, n in (("quarters", 4, 8), ("profit-loss", 1, 5)):
        try:
            h, r = screener.parse_table(html, table)
        except screener.ScreenerError:
            continue
        add(table, h, r, ("sales", "revenue"), "revenue", "INR_CR", n, lag)
        add(table, h, r, ("opm %", "financing margin %"), "operating_margin_pct", "pct", n, None)
        add(table, h, r, ("net profit",), "net_profit", "INR_CR", n, lag)
    return out


# ───────────────────────── evidence + reduce ─────────────────────────
def build_evidence(
    batch: list[Guidance],
    later_docs: dict[str, list[tuple[str, list[str]]]],
    actuals: list[dict],
    gaps: list[str],
    as_of: str,
) -> str:
    """JSON text handed to pvd_reduce. later_docs[period] -> docs after that period as (doc_id, pages)."""
    payload = {"as_of": as_of, "coverage_gaps": gaps, "comparison_rules": COMPARISON_RULES, "guidance": [],
               "actuals": actuals}
    for g in batch:
        calls = later_docs.get(g.period, [])
        payload["guidance"].append(
            {
                "guidance_id": g.gid,
                "doc_id": g.doc_id,
                "page": g.page,
                "said_in": g.period,
                "metric": g.metric,
                "target": g.target,
                "horizon": g.horizon,
                "quote": g.quote,
                "subsequent_calls_in_order": [d for d, _ in calls],
                "relevant_passages": [
                    {"doc_id": d, **p} for d, pages in calls for p in top_passages(g, pages)
                ],
            }
        )
    return json.dumps(payload, ensure_ascii=False)


def _claim(text: str, kind: str, srcs: list[tuple[str, int, str]]) -> m.Claim:
    return m.Claim(
        text=text, kind=kind, verified=True, sources=[m.Source(doc_id=d, page=p, quote=q) for d, p, q in srcs]
    )


def reduce_batch(
    symbol: str,
    batch: list[Guidance],
    evidence: str,
    docs_by_id: dict[str, list[str]],
    by_gid: dict[str, Guidance],
    actual_index: dict[str, dict],
) -> tuple[list[m.PvDItem], int]:
    """Run pvd_reduce on one batch; verify sources; build contract PvDItems. -> (items, n_dropped)."""
    out = run_task(
        "pvd_reduce",
        {"research_evidence": evidence},
        feature="pull.pvd",
        unit=symbol,
        cache_key_extra=f"{symbol}|{'|'.join(g.gid for g in batch)}",
    )
    items: list[m.PvDItem] = []
    dropped = 0
    for v in out.verdicts:
        g = by_gid.get(v.guidance_id)
        if g is None:
            continue
        verified: list[tuple[str, int, str]] = []
        actual: m.Actual | None = None
        for s in v.sources:
            if s.actual_ref and s.actual_ref in actual_index:  # table fact: no quote to verify
                f = actual_index[s.actual_ref]
                if actual_is_comparable(g, f):
                    actual = m.Actual(value=f["value"], unit=f["unit"], source=s.actual_ref)
                else:
                    dropped += 1      # e.g. reported-INR growth offered for a constant-currency promise
                continue
            if s.quote and s.page and s.doc_id in docs_by_id:
                page = verify_quote(s.quote, docs_by_id[s.doc_id], s.page)
                if page is not None:
                    verified.append((s.doc_id, page, s.quote))
                    continue
            dropped += 1
        outcome_srcs = [x for x in verified if not (x[0] == g.doc_id and x[1] == g.page)]
        # a judgment about the future/past needs evidence beyond the original promise, except pending/quietly_dropped
        if v.verdict not in ("pending", "quietly_dropped") and not outcome_srcs and actual is None:
            dropped += 1
            continue
        promised = _claim(
            f"{g.metric}: {g.target}" + (f" ({g.horizon})" if g.horizon else ""),
            "guidance",
            [(g.doc_id, g.page, g.quote)],
        )
        outcome = _claim(v.reason[:160], "fact", outcome_srcs[:2]) if outcome_srcs else None
        items.append(
            m.PvDItem(
                metric=g.metric,
                said_in=g.period,
                horizon=g.horizon,
                promised=promised,
                outcome=outcome,
                actual=actual,
                verdict=v.verdict,
                reason=v.reason[:120],
            )
        )
    if dropped:
        store.incr(get_settings().llm_db_path, "grounding_dropped", dropped)
    return items, dropped


def build_pvd(
    symbol: str, guidance: list[Guidance], html: str, gaps: list[str], progress=None
) -> list[m.PvDItem]:
    """All promised-vs-delivered items for a symbol (oldest calls judged against everything that came after)."""
    docs = sorted(
        (d for d in loader.stored_docs(symbol) if d["kind"] == "concall"),
        key=lambda d: period_key(d["period"]),
    )
    pages = {d["doc_id"]: loader.load_pages(d["doc_id"]) for d in docs}
    later: dict[str, list[tuple[str, list[str]]]] = {}
    for d in docs:
        later[d["period"]] = [
            (x["doc_id"], pages[x["doc_id"]])
            for x in docs
            if period_key(x["period"]) > period_key(d["period"])
        ]
    chosen = select_items(
        [g for g in guidance if later.get(g.period)]
    )  # needs >=1 later call to judge against
    actuals = actuals_from_screener(html)
    actual_index = {a["actual_ref"]: a for a in actuals}
    by_gid = {g.gid: g for g in chosen}
    as_of = f"{docs[-1]['period']} earnings call" if docs else "latest available"
    items: list[m.PvDItem] = []
    for i in range(0, len(chosen), BATCH):
        batch = chosen[i : i + BATCH]
        if progress:
            progress(f"Judging promises vs outcomes {min(i + BATCH, len(chosen))}/{len(chosen)}")
        ev = build_evidence(batch, later, actuals, gaps, as_of)
        try:
            got, _ = reduce_batch(symbol, batch, ev, pages, by_gid, actual_index)
        except Exception as e:  # noqa: BLE001
            gaps.append(
                f"Judgment batch {i // BATCH + 1} failed ({type(e).__name__}); those promises are not shown"
            )
            continue
        items += got
    return items
