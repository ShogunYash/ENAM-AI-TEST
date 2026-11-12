"""Priority + score for a classified filing. Pure functions, no LLM.

priority  = bucket of the category weight (below), after a few headline-driven adjustments
score     = weight x interest(category) x (1 + price_reaction_boost) x recency_decay      (ranks "Needs you")

Weights follow .claude/skills/finn-data-sources/taxonomy.md. The judgement calls live in `weight()`.
"""
from __future__ import annotations

import re
from datetime import datetime

from app import models as m
from app.models import Category as C
from app.models import Priority as P

BASE: dict[C, float] = {
    C.results: 9, C.management_change: 8, C.m_and_a: 8, C.fund_raise: 7, C.litigation: 7,
    C.credit_rating: 5, C.pledging: 5, C.capex: 5, C.insider_trading: 3, C.press_release: 3,
    C.dividend: 3, C.bonus_split: 3, C.earnings_call: 2, C.investor_meetings: 1, C.agm_egm: 1,
    C.postal_ballot: 1, C.unclassified: 0.1,
}
HALF_LIFE_H = 72.0

_TOP_ROLE = re.compile(r"\bCEO\b|\bCFO\b|\bCOO\b|managing director|chief (executive|financial|operating)|chairm[ae]n", re.IGNORECASE)
_BAD_NEWS = re.compile(r"downgrad|negative|withdraw|invocation|invoked|default|fraud|show cause|penalt", re.IGNORECASE)
_ROUTINE_RATING = re.compile(r"reaffirm|re-affirm|assigned|retained|maintained", re.IGNORECASE)
_ROUTINE_DEBT = re.compile(r"commercial paper|\bNCDs?\b|non-convertible|debenture|redemption|repayment", re.IGNORECASE)


def weight(category: C | str, subcategory: str = "", headline: str = "") -> float:
    c = C(category)
    w = BASE[c]
    if c is C.results and subcategory != "Financial Results":
        return 2.0          # deck / press release / newspaper ad / board-meeting echo of results already shown
    if c is C.management_change:
        return 8.0 if _TOP_ROLE.search(headline) else 5.0
    if c is C.credit_rating:
        return 8.0 if _BAD_NEWS.search(headline) else (3.0 if _ROUTINE_RATING.search(headline) else w)
    if c is C.pledging and _BAD_NEWS.search(headline):
        return 8.0
    if c is C.fund_raise and _ROUTINE_DEBT.search(headline):
        return 2.0 if re.search(r"repayment|redemption", headline, re.IGNORECASE) else 4.0
    if c is C.litigation and not _BAD_NEWS.search(headline):
        return 6.0
    return w


def priority_for(w: float) -> P:
    return P.high if w >= 7 else P.medium if w >= 4 else P.low if w >= 1 else P.hidden


def reaction_boost(r: m.PriceReaction | None) -> float:
    if not r:
        return 0.0
    return min(0.5, abs(r.pct_1d) / 10) + min(0.5, max(0.0, r.vol_ratio - 1) / 8)


def score(w: float, category: C | str, *, interests: set[str], muted: set[str], reaction: m.PriceReaction | None,
          filed_at: datetime, now: datetime) -> float:
    cat = C(category).value
    interest = 0.0 if cat in muted else 1.5 if cat in interests else 1.0
    age_h = max(0.0, (now - filed_at).total_seconds() / 3600)
    return round(w * interest * (1 + reaction_boost(reaction)) * 0.5 ** (age_h / HALF_LIFE_H), 3)
