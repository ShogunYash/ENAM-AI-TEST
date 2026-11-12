"""Deterministic checks that must not depend on a model's judgement.

1. Plain revenue / net-profit GROWTH promises for a CLOSED fiscal year are tested directly against screener.in's annual table
   with the +-10 % rule from the verdict definitions (see .claude/skills/finn-grounding). This is what catches a company
   saying "we fully delivered 25%+ growth" when its own filed numbers show 21.6 %.
2. A 'met' that rests only on mid-year commentary is premature: it is turned into 'pending' (on track).

Everything here is plain arithmetic and regexes: no LLM.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

TOLERANCE = 0.10          # verdict definition: within +-10 % of a numeric target counts as met

_NUM = r"(\d+(?:\.\d+)?)"
_RANGE = re.compile(rf"{_NUM}\s*%?\s*(?:to|-|–|—|and)\s*{_NUM}\s*%", re.IGNORECASE)
_FLOOR_AFTER = re.compile(rf"{_NUM}\s*%?\s*(?:\+|plus\b|or more|or higher|and above|or above)", re.IGNORECASE)
_FLOOR_BEFORE = re.compile(rf"(?:minimum|at least|more than|over|above|north of)\s*(?:of\s*)?{_NUM}\s*%", re.IGNORECASE)
_POINT = re.compile(rf"{_NUM}\s*%", re.IGNORECASE)

_GROWTH_REVENUE = re.compile(r"revenue growth|growth in revenue|top[- ]?line growth|sales growth|revenue\b.*\bgrowth", re.IGNORECASE)
_GROWTH_PROFIT = re.compile(r"(pat|net profit|profit after tax)\b.*\bgrowth|growth in (pat|net profit)", re.IGNORECASE)
_EXCLUDE = re.compile(r"constant currency|\bcc\b|segment|vertical|region|domestic|international|export|aum|order|book|"
                      r"margin|ebitda|credit|npa|loan|deposit|nim\b|per (share|employee)", re.IGNORECASE)


@dataclass(frozen=True)
class Target:
    kind: str                 # band | floor | point
    low: float
    high: float | None
    text: str                 # how it reads: '25%+', '10-12%', '~25%'


def parse_target(target: str, quote: str = "") -> Target | None:
    """'25% plus' / '10% to 12%' / 'approx 25%' -> Target. Tries the target text first, then the quote."""
    for src in (target or "", quote or ""):
        if m := _RANGE.search(src):
            lo, hi = sorted((float(m.group(1)), float(m.group(2))))
            return Target("band", lo, hi, f"{lo:g}-{hi:g}%")
        if m := _FLOOR_AFTER.search(src) or _FLOOR_BEFORE.search(src):
            v = float(m.group(1))
            return Target("floor", v, None, f"{v:g}%+")
        if m := _POINT.search(src):
            v = float(m.group(1))
            return Target("point", v, v, f"~{v:g}%")
    return None


def fy_of(horizon: str | None) -> int | None:
    """'FY26' / "FY'26" / 'FY 2026' / 'FY2026' -> 2026."""
    if not horizon:
        return None
    m = re.search(r"FY\s*'?\s*(\d{2,4})\b", horizon, re.IGNORECASE)
    if not m:
        return None
    y = int(m.group(1))
    return 2000 + y if y < 100 else y


def growth_kind(metric: str, target: str) -> str | None:
    """'revenue' | 'profit' when the promise is a plain whole-company growth rate that a screener annual table can settle."""
    text = f"{metric} {target}"
    if _EXCLUDE.search(text):
        return None
    if re.search(r"stand-?alone", metric, re.IGNORECASE) and not re.search(r"consol", metric, re.IGNORECASE):
        return None
    if _GROWTH_PROFIT.search(metric):
        return "profit"
    if _GROWTH_REVENUE.search(metric):
        return "revenue"
    return None


def verdict_for(t: Target, actual: float) -> tuple[str, str]:
    """(verdict, wording) by the +-10 % definition. Beating a band or floor counts as delivered."""
    if t.kind == "band":
        lo, hi = t.low, t.high or t.low
        if lo * (1 - TOLERANCE) <= actual:
            return "met", ("inside the band" if lo <= actual <= hi else
                           "above the band" if actual > hi else "within 10% of the band")
        return "missed", "below the band"
    if t.kind == "floor":
        if actual >= t.low:
            return "met", "at or above the floor"
        return ("met", "within 10% of the floor") if actual >= t.low * (1 - TOLERANCE) else ("missed", "below the floor")
    if abs(actual - t.low) <= t.low * TOLERANCE:
        return "met", "within 10% of the target"
    return ("met", "above the target") if actual > t.low else ("missed", "below the target")


def call_year_quarter(doc_id: str) -> tuple[int, int] | None:
    """'INFY:concall_Q3FY26' -> (2026, 3): fiscal year and quarter of the call."""
    m = re.search(r"_Q(\d)FY(\d{2})$", doc_id)
    return (2000 + int(m.group(2)), int(m.group(1))) if m else None


def is_premature(horizon: str | None, outcome_doc_ids: list[str]) -> bool:
    """True when a 'met' verdict cites ONLY calls before the promised year closed (before its Q4 call)."""
    fy = fy_of(horizon)
    if fy is None or not outcome_doc_ids:
        return False
    periods = [call_year_quarter(d) for d in outcome_doc_ids]
    if any(p is None for p in periods):
        return False
    return all(p < (fy, 4) for p in periods)         # (FY, Q4) = the call that reports the full year
