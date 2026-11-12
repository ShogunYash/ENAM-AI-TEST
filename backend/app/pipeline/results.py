"""Quarterly results -> ResultsCard. The LLM only COPIES printed figures (prompt results_extract); everything numeric
happens here, deterministically: amount parsing, unit conversion to INR crore, EBITDA derivation, QoQ/YoY, margin and
the screener.in cross-check.

EBITDA: printed only rarely. When absent the model returns the four components and WE evaluate
    EBITDA = PBT + finance cost + depreciation & amortisation - other income        (validated: equals screener.in's
"Operating Profit" for TCS Q2 FY27, 18,815). Exceptional items are not separated, so screener.in's figure can differ
in quarters with exceptionals; that is why the cross-check only gates revenue / PBT / PAT.
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timedelta

import httpx
from pydantic import TypeAdapter

from app import db
from app import models as m
from app.ingest import bse, docs, screener
from app.llm import run_task
from app.llm.schemas import ResultCell, ResultsExtraction
from app.signals.eod import IST

TOLERANCE_PCT = 2.0             # cross-check tolerance vs screener.in (contract: mismatch badge beyond 2%)
METRICS: tuple[m.MetricName, ...] = ("revenue", "ebitda", "pbt", "pat")
# Sectors where EBITDA / "revenue from operations" are not meaningful -> EBITDA is left empty.
NO_EBITDA_SECTORS = ("banking", "lending", "finance")

_UNITS = [  # (regex, INR-crore per unit), checked in order
    (r"cror|\bcr\b|\bcrs\b", 1.0), (r"lakh|lac\b|lacs\b", 0.01), (r"\bmn\b|million|\bmm\b", 0.1),
    (r"\bbn\b|billion", 100.0), (r"thousand", 0.0001),
]
_NON_INR = re.compile(r"\$|usd|us\$|eur|gbp", re.IGNORECASE)


def parse_amount(printed: str | None) -> float | None:
    """'(1,234.5)' -> -1234.5, '1,45,463' -> 145463.0, '-' / '' -> None (a dash is never assumed to be zero)."""
    if not printed:
        return None
    t = printed.strip().replace("−", "-").replace("–", "-").replace("—", "-")
    neg = t.startswith("(") and t.endswith(")")
    t = re.sub(r"[()\s,₹`]|rs\.?|inr", "", t, flags=re.IGNORECASE)
    if t in ("", "-"):
        return None
    try:
        v = float(t)
    except ValueError:
        return None
    return -abs(v) if neg else v


def scale_to_crore(unit: str | None) -> float | None:
    """INR crore per printed unit; None when the currency/scale is not recognisable or not INR."""
    if not unit or _NON_INR.search(unit):
        return None
    u = unit.lower()
    return next((s for pat, s in _UNITS if re.search(pat, u)), None)


def _val(src: object) -> float | None:
    amount, scale = parse_amount(getattr(src, "printed", None)), scale_to_crore(getattr(src, "unit", None))
    return None if amount is None or scale is None else amount * scale


def cell_value(cell: ResultCell) -> tuple[float | None, str]:
    """-> (value in INR crore | None, status). We recompute from the printed text rather than trusting the model's
    value_inr_cr, so a mis-scaled model number can never reach the card."""
    if cell.status == "reported" and cell.source:
        v = _val(cell.source)
        return (round(v, 2), "reported") if v is not None else (None, "missing")
    if cell.status == "derived" and cell.components:
        c = cell.components
        parts = {k: _val(src) for k, src in c.items()}
        if any(v is None for v in parts.values()):
            return None, "missing"
        if {"pbt", "finance_cost", "depreciation_amortisation", "other_income"} <= set(c):   # EBITDA
            ebitda = parts["pbt"] + abs(parts["finance_cost"]) + abs(parts["depreciation_amortisation"]) - parts["other_income"]
            return round(ebitda, 2), "derived"
        if all(k.startswith("line_") for k in c):                                        # revenue sub-lines, no printed total
            return round(sum(parts.values()), 2), "derived"
    return None, "missing"


def pct_change(cur: float | None, base: float | None) -> float | None:
    if cur is None or base is None or base == 0:
        return None
    return round((cur - base) / abs(base) * 100, 1)


def fy_label(date_iso: str | None) -> str:
    """Quarter-end date -> Indian FY label: 2026-09-30 -> 'Q2 FY27'."""
    if not date_iso:
        return "Latest quarter"
    d = datetime.fromisoformat(date_iso)
    q = ((d.month - 4) % 12) // 3 + 1
    return f"Q{q} FY{(d.year + (1 if d.month >= 4 else 0)) % 100:02d}"


def cross_check(values: dict[str, dict[str, float | None]], periods: dict[str, str | None], symbol: str, basis: str,
                quarters: dict | None = None) -> m.CrossCheck:
    """Compare revenue / PBT / PAT of ALL THREE periods (current, previous quarter, year-ago) with screener.in's
    standardised quarterly table. Checking the earlier columns too catches swapped/misread columns, which would
    otherwise corrupt QoQ / YoY silently. `values` = {"current": {"revenue": .., "pbt": .., "pat": ..}, ...}."""
    if not periods.get("current"):
        return m.CrossCheck(status="unavailable", note="period not identified")
    try:
        q = quarters if quarters is not None else screener.fetch_quarters(symbol, basis == "consolidated")
    except screener.ScreenerError as e:
        return m.CrossCheck(status="unavailable", note=f"screener.in unavailable ({e})")
    pairs = {"revenue": "sales", "pbt": "pbt", "pat": "net_profit"}
    diffs, checked = [], 0
    for which in ("current", "previous", "year_ago"):
        date = periods.get(which)
        col = q.get(screener.quarter_key(date)) if date else None
        if not col:
            continue
        for ours, theirs in pairs.items():
            a, b = values.get(which, {}).get(ours), col.get(theirs)
            if a is None or b is None or b == 0:
                continue
            checked += 1
            d = (a - b) / abs(b) * 100
            if abs(d) > TOLERANCE_PCT:
                label = "Revenue" if ours == "revenue" else ours.upper()
                diffs.append(f"{label} {fy_label(date)} {a:,.0f} vs screener {b:,.0f} ({d:+.1f}%)")
    if not checked:
        return m.CrossCheck(status="unavailable", note="no comparable figures on screener.in")
    return m.CrossCheck(status="mismatch", note="; ".join(diffs)) if diffs else m.CrossCheck(status="match", note=None)


def build_card(ext: ResultsExtraction, doc_url: str, symbol: str, sector: str | None = None,
               quarters: dict | None = None) -> m.ResultsCard | None:
    """ResultsExtraction -> ResultsCard, or None when the current-quarter revenue/PAT could not be read."""
    if ext.basis is None:
        return None
    no_ebitda = bool(sector) and any(s in sector.lower() for s in NO_EBITDA_SECTORS)
    vals: dict[str, dict[str, float | None]] = {}
    for name in METRICS:
        cells = getattr(ext.metrics, name)
        vals[name] = {p: (None if (name == "ebitda" and no_ebitda) else cell_value(getattr(cells, p))[0])
                      for p in ("current", "previous", "year_ago")}
    if vals["revenue"]["current"] is None and vals["pat"]["current"] is None:
        return None
    metrics = [m.ResultsMetric(
        name=n, value=v["current"], prev_q=v["previous"], prev_y=v["year_ago"],
        qoq_pct=pct_change(v["current"], v["previous"]), yoy_pct=pct_change(v["current"], v["year_ago"]))
        for n, v in vals.items()]
    rev, eb = vals["revenue"]["current"], vals["ebitda"]["current"]
    page = next((s.page for s in (getattr(ext.metrics, n).current.source for n in ("revenue", "pat", "pbt")) if s), None)
    return m.ResultsCard(
        period=fy_label(ext.periods.current), basis=ext.basis, metrics=metrics,
        margin_ebitda_pct=round(eb / rev * 100, 1) if rev and eb is not None else None,
        cross_check=cross_check({p: {n: vals[n][p] for n in METRICS} for p in ("current", "previous", "year_ago")},
                                ext.periods.model_dump(), symbol, ext.basis, quarters),
        source=m.DocRef(doc_url=doc_url, page=page))


def so_what(card: m.ResultsCard) -> str | None:
    """Deterministic one-liner for a results filing (no LLM): '<Rev> / <PAT> YoY', <= 70 chars."""
    by = {x.name: x for x in card.metrics}
    bits = []
    for label, key in (("PAT", "pat"), ("Rev", "revenue")):
        y = by[key].yoy_pct
        if y is not None:
            bits.append(f"{label} {y:+.0f}%".replace("-", "−"))
    if not bits:
        return None
    tail = "YoY" if by["pat"].yoy_pct is not None or by["revenue"].yoy_pct is not None else ""
    line = f"{card.period}: " + ", ".join(bits) + f" {tail}".rstrip()
    if card.margin_ebitda_pct is not None and len(line) <= 50:
        line += f" · EBITDA margin {card.margin_ebitda_pct:.1f}%"
    return line[:70]


# ───────────────────────── persistence + orchestration ─────────────────────────
_ENRICH = TypeAdapter(m.Enrichment)


def save_enrichment(filing_id: str, card: m.ResultsCard | m.BioCard | m.OneLiner) -> None:
    with db.connect() as con:
        con.execute("INSERT OR REPLACE INTO enrichments (filing_id,type,payload,created_at) VALUES (?,?,?,?)",
                    (filing_id, card.type, card.model_dump_json(), datetime.now(IST).isoformat()))


def load_enrichments(ids: list[str]) -> dict[str, m.ResultsCard | m.BioCard | m.OneLiner]:
    if not ids:
        return {}
    with db.connect() as con:
        rows = con.execute(f"SELECT filing_id, payload FROM enrichments WHERE filing_id IN ({','.join('?' * len(ids))})",
                           ids).fetchall()
    return {r["filing_id"]: _ENRICH.validate_python(json.loads(r["payload"])) for r in rows}


_RANK = {"match": 2, "unavailable": 1, "mismatch": 0}


def _worse(new: m.ResultsCard, old: m.ResultsCard) -> bool:
    """A rebuilt card must not replace an existing one that cross-checks better (e.g. a weaker fallback model's output
    flagged `mismatch` must not overwrite a card that matched screener.in)."""
    return _RANK[new.cross_check.status] < _RANK[old.cross_check.status]


def enrich_results(filing_id: str, symbol: str, pdf_name: str, sector: str | None = None,
                   client: httpx.Client | None = None, force: bool = False, cache_only: bool = False,
                   pdf: bytes | None = None, refresh: bool = False) -> m.ResultsCard | None:
    """Download the results PDF, extract with Gemini (native PDF), build + store the card. Returns the card or None.
    The LLM answer is cached by the filing's attachment name (immutable), not by the sliced bytes."""
    have = load_enrichments([filing_id]).get(filing_id)
    have = have if isinstance(have, m.ResultsCard) else None
    if have and not force:
        return have
    if pdf is None:
        pdf, _total = docs.fit_for_inline(docs.get_pdf(pdf_name, client))
    ext = run_task("results_extract",
                   {"results_pdf": "The attached PDF is the results filing. Page numbers are the physical, 1-based "
                                   "pages of the PDF."},
                   feature="push.results", unit=symbol, pdf=pdf, pdf_key=pdf_name, cache_key_extra=filing_id,
                   cache_only=cache_only, bypass_cache=refresh)
    with db.connect() as con:
        row = con.execute("SELECT filed_at FROM filings WHERE id=?", (filing_id,)).fetchone()
    age = datetime.now(IST) - datetime.fromisoformat(row["filed_at"]) if row else timedelta(days=30)
    card = build_card(ext, bse.pdf_link(pdf_name, age) or "", symbol, sector)
    if card and have and _worse(card, have):
        return have                       # keep the better-checked card
    if card:
        save_enrichment(filing_id, card)
    return card
