"""Filing classification into the 17-category taxonomy.

T0 (no LLM): BSE's own (CATEGORYNAME, SUBCATNAME) pairs + headline patterns. Built from the real inventory in
docs/bse-subcategories.md. Only filings the rules can't place go to T1 (`classify_batch`, ~30 per call, cached).

Two things are decided here and consumed by score.py:
  category      one of app.models.Category
  results-related filings that merely *echo* results (deck, press release, newspaper ad, board-meeting notice)
  stay in category `results` (the reference doc says so) but get a low priority in score.py via the subcategory.
"""
from __future__ import annotations

import json
import re
from datetime import datetime

from app import db
from app.llm import LLMUnavailable, run_task
from app.models import Category as C
from app.signals.eod import IST

BATCH = 30

# Subcategory -> category for subcategories whose meaning is unambiguous.
SUBCAT: dict[str, C] = {
    "Financial Results": C.results,
    "Credit Rating": C.credit_rating,
    "Earnings Call Transcript": C.earnings_call,
    "Acquisition": C.m_and_a,
    "Scheme of Arrangement": C.m_and_a,
    "Issue of Securities": C.fund_raise,
    "Preferential Issue": C.fund_raise,
    "Qualified Institutional Placement": C.fund_raise,
    "Intimation of Repayment of Commercial Paper (CP)": C.unclassified,   # repaying debt is not raising money (G3 review #3)
    "Change in Management": C.management_change,
    "Change in Directorate": C.management_change,
    "Resignation of Director": C.management_change,
    "Retirement": C.management_change,
    "Award of Order / Receipt of Order": C.press_release,
    "Clarification": C.press_release,
    "Dividend": C.dividend,
    "Date of payment of Dividend": C.dividend,
    "Postal Ballot": C.postal_ballot,
    "AGM": C.agm_egm,
    "EGM": C.agm_egm,
    "Allotment of ESOP / ESPS": C.unclassified,
    "Closure of Trading Window": C.unclassified,
    "Certificate under Reg. 74 (5) of SEBI (DP) Regulations, 2018": C.unclassified,
    "Appointment of Statutory Auditor/s": C.unclassified,
    "Amendments to Memorandum & Articles of Association": C.unclassified,
    "Board Meeting Rescheduled": C.unclassified,
    "Monitoring Agency Report": C.unclassified,
    "Half Yearly Report (SEBI Circular No. CIR/IMD/DF-1/67/2017)": C.unclassified,
    "Disclosures under Reg. 31(1) and 31(2) of SEBI (SAST) Regulations, 2011": C.pledging,
    "Disclosures under Reg. 29(2) of SEBI (SAST) Regulations, 2011": C.insider_trading,
    "Disclosures under Reg. 10(7) of SEBI (SAST) Regulations, 2011": C.insider_trading,
}

# Headline patterns, tried in order (earnings-call before results: a call recording is about the call, not the numbers). Used for generic subcategories (General, Others, Board Meeting outcomes,
# Press Release, Investor Presentation, Analyst/Investor Meet, Newspaper Publication, Allotment of Equity Shares ...).
HEADLINE_RULES: list[tuple[re.Pattern[str], C]] = [(re.compile(p, re.IGNORECASE), c) for p, c in [
    (r"pledg|encumbr|invocation of", C.pledging),
    (r"earnings call|conference call|concall|call recording|audio recording|transcript", C.earnings_call),
    (r"financial results|quarterly results|unaudited.{0,40}results|audited.{0,40}results|results for the quarter|"
     r"analyst presentation|outcome for the quarter|quarter and half.year ended", C.results),
    (r"resign|cessation|change in (the )?(senior )?management|\bCFO\b|\bCEO\b|managing director|"
     r"key managerial|appointment of (mr|ms|mrs|dr|shri|smt)\b|appointed as", C.management_change),
    (r"acqui|amalgamat|merger|demerger|takeover|joint venture|\bJV\b|divest|stake (sale|purchase)|(majority|controlling|strategic) stake", C.m_and_a),
    (r"\bQIP\b|rights issue|preferential|warrant|buy-?back|commercial paper|\bNCDs?\b|non-convertible|"
     r"debenture|fund ?rais|capital raise", C.fund_raise),
    (r"\bdividend\b", C.dividend),
    (r"bonus (issue|shares)|stock split|sub-?division of", C.bonus_split),
    (r"credit rating|\bCRISIL\b|\bICRA\b|\bCARE ratings\b|india ratings", C.credit_rating),
    (r"show cause|penalt|\bNCLT\b|insolvency|litigation|tax demand|search and seizure|adjudicat|"
     r"\bSEBI order\b|\bGST\b.{0,30}(order|demand)", C.litigation),
    (r"capex|capital expenditure|capacity expansion|new plant|greenfield|brownfield", C.capex),
    (r"postal ballot", C.postal_ballot),
    (r"\bAGM\b|\bEGM\b|annual general meeting|extraordinary general meeting", C.agm_egm),
    (r"investor meet|analyst meet|one-on-one|investor conference|roadshow|institutional investors? meeting", C.investor_meetings),
    (r"order (win|received)|bagged|\bbags\b|\bwins?\b.{0,25}\borders?\b|awarded|letter of (award|intent)|"
     r"launch(es|ed)?\b|partnership|clarification", C.press_release),
    (r"^(press|media) release\b", C.press_release),
    (r"newspaper (clipping|advertisement)s?|grant of (stock )?options|\bESOP\b|\bESPS\b", C.unclassified),
]]

ESOP = re.compile(r"ESOP|ESPS|\bRSUs?\b|stock option|employee (stock|share)", re.IGNORECASE)


def classify_rule(subcategory: str, headline: str) -> C | None:
    """Return a category, or None when the rules can't decide (-> T1 batch)."""
    sub, head = (subcategory or "").strip(), headline or ""
    if sub in SUBCAT:
        return SUBCAT[sub]
    if sub == "Allotment of Equity Shares":
        return C.unclassified if ESOP.search(head) else C.fund_raise
    if sub == "Meeting Updates" and re.search(r"\bQIP\b|fund ?rais|preferential", head, re.IGNORECASE):
        return C.fund_raise
    if sub == "Analyst / Investor Meet":
        # Recordings/transcripts of the results call are filed here too.
        for pat, cat in HEADLINE_RULES:
            if cat in (C.earnings_call, C.results):
                if pat.search(head):
                    return C.earnings_call if cat is C.earnings_call else C.results
        return C.investor_meetings
    if sub in ("Newspaper Publication", "Press Release / Media Release", "Investor Presentation",
               "Board Meeting", "Outcome of Board Meeting"):
        for pat, cat in HEADLINE_RULES:
            if pat.search(head):
                return cat
        # No pattern matched. The LLM would only see this same headline, so decide by subcategory instead.
        return {"Press Release / Media Release": C.press_release,
                "Investor Presentation": C.results,         # the results deck (reference doc: category results)
                "Newspaper Publication": C.unclassified,    # routine advertisements
                "Board Meeting": C.unclassified,            # a scheduling notice with no recognisable agenda
                }.get(sub)                                   # "Outcome of Board Meeting" -> None -> LLM
    for pat, cat in HEADLINE_RULES:          # General / Others / "" / unseen subcategories
        if pat.search(head):
            return cat
    if len(head.strip()) < 25:               # "Enclosed", "Statement of the Company": no content for any model to use
        return C.unclassified
    return None


# ───────────────────────── persistence + batch LLM ─────────────────────────
def _store(rows: list[tuple[str, str, str, float | None]]) -> None:
    now = datetime.now(IST).isoformat()
    with db.connect() as con:
        con.executemany(
            "INSERT OR REPLACE INTO classifications (id,category,source,confidence,classified_at) VALUES (?,?,?,?,?)",
            [(i, c, s, conf, now) for i, c, s, conf in rows])


def classify_pending(use_llm: bool = True, limit: int | None = None) -> dict:
    """Classify every filing that has no classification yet. Returns a stats dict."""
    with db.connect() as con:
        q = ("SELECT f.id, f.subcategory, f.headline FROM filings f LEFT JOIN classifications c ON c.id=f.id "
             "WHERE c.id IS NULL ORDER BY f.filed_at DESC")
        todo = [dict(r) for r in con.execute(q + (f" LIMIT {int(limit)}" if limit else ""))]
    ruled, left = [], []
    for r in todo:
        cat = classify_rule(r["subcategory"], r["headline"])
        if cat is None:
            left.append(r)
        else:
            ruled.append((r["id"], cat.value, "rule", 1.0))
    _store(ruled)

    llm_done, llm_calls, llm_failed = 0, 0, 0
    if use_llm:
        for i in range(0, len(left), BATCH):
            batch = left[i:i + BATCH]
            payload = [{"id": r["id"], "headline": (r["headline"] or "")[:220], "subcategory": r["subcategory"]}
                       for r in batch]
            try:
                out = run_task("classify_batch", {"filings": json.dumps(payload, ensure_ascii=False)},
                               feature="push.classify", cache_key_extra="|".join(r["id"] for r in batch))
            except LLMUnavailable:
                llm_failed += len(batch)
                continue
            llm_calls += 1
            known = {r["id"] for r in batch}
            got = [(it.id, it.category if isinstance(it.category, str) else it.category.value, "llm", it.confidence)
                   for it in out.items if it.id in known]
            _store(got)
            llm_done += len(got)
    return {"todo": len(todo), "rule": len(ruled), "llm": llm_done, "llm_calls": llm_calls,
            "unclassified_left": len(left) - llm_done, "llm_failed": llm_failed,
            "rule_pct": round(100 * len(ruled) / len(todo), 1) if todo else 100.0}
