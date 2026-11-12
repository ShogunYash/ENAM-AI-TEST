"""Financial snapshot + trajectory + balance-sheet / cash-quality ratios straight from screener.in's standardised
tables (themselves derived from company filings). NO LLM: every number here is a table cell or simple arithmetic on
table cells, so it can never be hallucinated.
"""
from __future__ import annotations

import re

from app import models as m
from app.ingest import screener

_YEAR = re.compile(r"^Mar (\d{4})$")


def _row(rows: dict, *labels: str) -> list[float | None] | None:
    for lab in labels:
        for key, vals in rows.items():
            if key == lab or key.startswith(lab):
                return vals
    return None


def _by_year(headers: list[str], vals: list[float | None] | None) -> dict[int, float | None]:
    out: dict[int, float | None] = {}
    for h, v in zip(headers, vals or []):
        if (mm := _YEAR.match(h)):
            out[int(mm.group(1))] = v
    return out


def _growth(cur: float | None, prev: float | None) -> float | None:
    return None if cur is None or prev in (None, 0) else round((cur - prev) / abs(prev) * 100, 1)


def _top_ratios(html: str) -> dict[str, float | None]:
    from selectolax.lexbor import LexborHTMLParser

    out: dict[str, float | None] = {}
    for li in LexborHTMLParser(html).css("#top-ratios li"):
        name, num = li.css_first(".name"), li.css_first(".number")
        if name and num:
            out[re.sub(r"\s+", " ", name.text(strip=True)).lower()] = screener.parse_num(num.text(strip=True))
    return out


def build_snapshot(html: str, years: int = 5) -> m.FinancialSnapshot | None:
    """screener company-page HTML -> FinancialSnapshot (None if the P&L table is missing)."""
    try:
        ph, pl = screener.parse_table(html, "profit-loss")
        bh, bs = screener.parse_table(html, "balance-sheet")
        ch, cf = screener.parse_table(html, "cash-flow")
    except screener.ScreenerError:
        return None
    sales = _by_year(ph, _row(pl, "sales", "revenue"))
    opm = _by_year(ph, _row(pl, "opm %", "financing margin %"))
    pat = _by_year(ph, _row(pl, "net profit"))
    cfo = _by_year(ch, _row(cf, "cash from operating activity"))
    borrow = _by_year(bh, _row(bs, "borrowings", "borrowing"))
    equity = _by_year(bh, _row(bs, "equity capital"))
    reserves = _by_year(bh, _row(bs, "reserves"))
    yrs = sorted(sales)[-years:]
    if not yrs:
        return None
    last, prev = yrs[-1], (yrs[-2] if len(yrs) > 1 else None)

    def series(d: dict[int, float | None]) -> list[float | None]:
        return [d.get(y) for y in yrs]

    ttm_idx = len(ph) - 1 if ph and ph[-1] == "TTM" else None
    ttm_sales = (_row(pl, "sales", "revenue") or [None] * len(ph))[ttm_idx] if ttm_idx is not None else None
    ttm_pat = (_row(pl, "net profit") or [None] * len(ph))[ttm_idx] if ttm_idx is not None else None
    top = _top_ratios(html)
    lender = _row(pl, "financing profit") is not None      # banks/NBFCs: CFO is negative by construction (loan growth)
    pats, cfos = [pat.get(y) for y in yrs], [cfo.get(y) for y in yrs]
    pairs = [(c, p) for c, p in zip(cfos, pats) if c is not None and p not in (None, 0)]
    cash_conv = (round(sum(c for c, _ in pairs) / sum(p for _, p in pairs), 2)
                 if pairs and sum(p for _, p in pairs) and not lender else None)
    eq_total = (equity.get(last) or 0) + (reserves.get(last) or 0)
    de = round(borrow[last] / eq_total, 2) if borrow.get(last) is not None and eq_total else None
    try:
        _, ratios_tbl = screener.parse_table(html, "ratios")
        wc = (_row(ratios_tbl, "working capital days") or [None])[-1]
    except screener.ScreenerError:
        wc = None
    if lender:
        wc = None                                           # working-capital days is not meaningful for a lender
    fy = f"FY{last % 100:02d}"
    headline = [
        m.HeadlineNumber(name=f"Revenue ({fy})", value=sales.get(last), unit="INR_CR", yoy_pct=_growth(sales.get(last), sales.get(prev))),
        m.HeadlineNumber(name=f"Operating margin ({fy})", value=opm.get(last), unit="pct", yoy_pct=None),
        m.HeadlineNumber(name=f"PAT ({fy})", value=pat.get(last), unit="INR_CR", yoy_pct=_growth(pat.get(last), pat.get(prev))),
    ]
    if ttm_sales is not None:
        headline.append(m.HeadlineNumber(name="Revenue (TTM)", value=ttm_sales, unit="INR_CR", yoy_pct=None))
    if ttm_pat is not None:
        headline.append(m.HeadlineNumber(name="PAT (TTM)", value=ttm_pat, unit="INR_CR", yoy_pct=None))
    return m.FinancialSnapshot(
        latest_period=fy, headline=headline,
        series=m.Series(years=[f"FY{y % 100:02d}" for y in yrs], revenue=series(sales), ebitda_margin=series(opm),
                        pat=series(pat), cfo=series(cfo), borrowings=series(borrow)),
        ratios=m.Ratios(roce=top.get("roce"), roe=top.get("roe"),
                        debt_equity=de, cash_conversion=cash_conv, working_capital_days=wc))
