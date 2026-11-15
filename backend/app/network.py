"""The Network: the investor's own contacts as an intelligence layer on top of Push and Pull.

Everything here is rules over the facts in data/network.json (SYNTHETIC demo people) and over what the filings
themselves say. No model decides who is connected to whom; a match always lists the facts it rests on (`evidence`).
The only model call is the planner of the question box (`ask`): it picks a tool, code runs the tool, and the answer is
assembled from the tool's matches, so the agent cannot invent a person or a link.

  company_insight(symbol)      who has worked at / knows this company
  management_insight(...)      people from a management-change filing -> overlap with my contacts
  event_insight(...)           best contact for a material event (M&A, capex, litigation, QIP)
  warm_nudges(...)             contacts whose former employer just filed something -> a reason to reconnect
  expertise_map()              my go-to people per theme
"""
from __future__ import annotations

import json
import logging
import re
from datetime import date, datetime
from functools import lru_cache

from app import db, universe
from app import models as m
from app.llm import run_task
from app.pipeline.results import load_enrichments
from app.settings import REPO_ROOT
from app.signals.eod import IST

log = logging.getLogger(__name__)
_STOP = {"and", "the", "india", "limited", "ltd", "company", "industries", "private", "sector", "services", "group",
         "head", "former", "ex"}
EVENT_TAGS = {
    "m_and_a": ("m&a", "integration", "strategy", "due diligence"),
    "capex": ("capex", "plant", "manufacturing", "projects", "epc", "infrastructure"),
    "litigation": ("legal", "regulatory", "governance", "compliance"),
    "fund_raise": ("capital markets", "fund raising", "qip", "treasury"),
    "management_change": ("governance",),
}
EVENT_LABEL = {"m_and_a": "M&A", "capex": "capex", "litigation": "litigation", "fund_raise": "fund raise"}
_FUND_RAISE_BIG = re.compile(r"\b(qip|rights issue|preferential|warrant)", re.IGNORECASE)
NUDGE_AFTER_DAYS = 45
NUDGE_WINDOW_DAYS = 14


# ───────────────────────────── data ─────────────────────────────
@lru_cache
def _raw() -> dict:
    return json.loads((REPO_ROOT / "data" / "network.json").read_text("utf-8"))


def people() -> list[m.NetworkPerson]:
    return [m.NetworkPerson.model_validate(p) for p in _raw().get("people", [])]


def _stems(text: str) -> set[str]:
    return {w[:5] for w in re.findall(r"[a-z&]{3,}", text.lower()) if w not in _STOP}


def _years(job: m.NetworkJob) -> str:
    return f"{job.start_year}-{job.end_year if job.end_year else 'now'}"


def _fit(a: set[str], b: set[str]) -> bool:
    return bool(a & b)


def _company(symbol: str) -> universe.Company | None:
    return next((c for c in universe.universe() if c.symbol == symbol), None)


def _short(name: str) -> str:
    """Drop corporate suffixes for display. 'of India' is part of a name (State Bank of India), not a suffix."""
    out = re.sub(r"\b(Ltd|Limited|Company|Industries)\b\.?", "", name)
    out = re.sub(r"(?<!of )\bIndia\b", "", out)
    return re.sub(r"\s+", " ", out).strip(" ,")


def _trim(s: str, n: int) -> str:
    return s if len(s) <= n else s[: n - 1].rstrip() + "…"


def _match(p: m.NetworkPerson, link: m.NetworkLink, why: str, evidence: list[str], score: float) -> m.PersonMatch:
    return m.PersonMatch(person_id=p.id, name=p.name, headline=p.headline, strength=p.relationship.strength, link=link,
                         why=_trim(why, 140), evidence=evidence, score=round(score, 2))


def _affinity(p: m.NetworkPerson, category: str | None) -> str | None:
    if not category:
        return None
    for tag in p.expertise:
        if any(k in tag.lower() for k in EVENT_TAGS.get(category, ())):
            return tag
    return None


# ───────────────────────────── company / event matches ─────────────────────────────
def _worked_at(symbol: str, category: str | None = None) -> list[m.PersonMatch]:
    out = []
    for p in people():
        for j in p.jobs:
            if j.nse_symbol != symbol:
                continue
            tag = _affinity(p, category)
            base = 4.0 if j.end_year is None else 3.0 + (0.5 if j.end_year >= 2018 else 0.0)
            why = f"{'Works' if j.end_year is None else 'Worked'} at {j.org} {_years(j)} as {j.role}"
            if tag:
                why += f"; {tag} expertise"
            out.append(_match(p, "worked_at_company", why, [f"{j.org} {_years(j)}, {j.role}"] + ([f"expertise: {tag}"] if tag else []),
                              base + 0.6 * p.relationship.strength + (1.5 if tag else 0)))
    return out


def _sector_experts(symbol: str, exclude: set[str], category: str | None = None) -> list[m.PersonMatch]:
    co = _company(symbol)
    if not co:
        return []
    want = _stems(f"{co.sector or ''} {co.name}")
    out = []
    for p in people():
        if p.id in exclude:
            continue
        tags = [t for t in p.expertise if _fit(_stems(t), want)]
        if not tags:
            continue
        tag = tags[0]
        out.append(_match(p, "sector_expert", f"{tag} expert ({p.headline.lower()}); no direct tie to {_short(co.name)}",
                          [f"expertise: {tag}"], 1.5 + 0.5 * p.relationship.strength + (1.0 if _affinity(p, category) else 0)))
    return out


def _top(matches: list[m.PersonMatch], n: int) -> list[m.PersonMatch]:
    best: dict[str, m.PersonMatch] = {}
    for x in matches:
        if x.person_id not in best or x.score > best[x.person_id].score:
            best[x.person_id] = x
    return sorted(best.values(), key=lambda x: -x.score)[:n]


def company_insight(symbol: str) -> m.NetworkInsight:
    co = _company(symbol)
    direct = _worked_at(symbol)
    matches = _top(direct + _sector_experts(symbol, {x.person_id for x in direct}), 4)
    name = _short(co.name) if co else symbol
    k = sum(1 for x in matches if x.link == "worked_at_company")
    head = (f"{k} contact{'s' if k != 1 else ''} worked at {name}" if k else
            (f"No one worked at {name}; closest: {matches[0].name}" if matches else f"No contacts near {name}"))
    return m.NetworkInsight(key=symbol, kind="company", symbol=symbol, headline=_trim(head, 90), subject=None,
                            matches=matches)


def event_insight(filing_id: str, symbol: str, category: str) -> m.NetworkInsight | None:
    direct = _worked_at(symbol, category)
    matches = _top(direct + _sector_experts(symbol, {x.person_id for x in direct}, category), 3)
    if not matches:
        return None
    co = _company(symbol)
    label = EVENT_LABEL.get(category, "event")
    head = f"Best person to call on this {label}: {matches[0].name}"
    return m.NetworkInsight(key=filing_id, kind="material_event", symbol=symbol, headline=_trim(head, 90), subject=None,
                            matches=matches,
                            note=None if direct else f"No contact has worked at {_short(co.name) if co else symbol}; matched on expertise")


# ───────────────────────────── management change ─────────────────────────────
def _tenure(card: m.BioCard, filed_year: int) -> tuple[str | None, int | None, int | None]:
    """The filing's own words about the person's tenure -> (org token, start year, end year). Never guessed."""
    end = int(card.effective[:4]) if card.effective else filed_year
    text = " ".join(card.background)
    m1 = re.search(r"since (\d{4})", text)
    m2 = re.search(r"(\d+)\+?\s+years?", text)
    start = int(m1.group(1)) if m1 else (end - int(m2.group(1)) if m2 else None)
    return (text.lower() or None), start, end if start else None


def management_insight(filing_id: str, symbol: str, card: m.BioCard, filed_year: int) -> m.NetworkInsight | None:
    co = _company(symbol)
    text, start, end = _tenure(card, filed_year)
    matches: list[m.PersonMatch] = []
    for p in people():
        for j in p.jobs:
            token = j.org.split()[0].lower()
            at_filer = j.nse_symbol == symbol
            named = bool(text) and len(token) >= 4 and token in (text or "")
            if start and (at_filer or named):
                lo, hi = max(start, j.start_year), min(end or 9999, j.end_year or 2026)
                if hi >= lo:
                    yrs = hi - lo + 1
                    matches.append(_match(p, "overlapped_with_person",
                                          f"Overlapped ~{yrs} yrs at {j.org} with {card.person} ({j.role}, {_years(j)})",
                                          [f"{j.org} {_years(j)}", f"filing: {card.person} tenure since ~{start}"],
                                          6.0 + 0.3 * yrs + 0.6 * p.relationship.strength))
        for e in p.education:
            if len(e.school) >= 3 and text and e.school.lower() in text:
                matches.append(_match(p, "same_school", f"Both at {e.school}: the filing names it in {card.person}'s background",
                                      [f"{e.school} {e.year or ''}".strip()], 5.0 + 0.6 * p.relationship.strength))
    direct = _worked_at(symbol, "management_change")
    matches += direct + _sector_experts(symbol, {x.person_id for x in direct}, "management_change")
    top = _top(matches, 3)
    if not top:
        return None
    overlaps = [x for x in top if x.link in ("overlapped_with_person", "same_school")]
    if overlaps:
        k = len(overlaps)
        head = f"{k} contact{'s' if k != 1 else ''} overlapped with {card.person}"
        note = None
    else:
        k = sum(1 for x in top if x.link == "worked_at_company")
        head = f"{k} contact{'s' if k != 1 else ''} know {_short(co.name) if co else symbol}" if k else f"Closest: {top[0].name}"
        note = ("The filing gives no career history for this person, so FINN matches on the employer only. "
                "A licensed profile source would add the full path.")
    return m.NetworkInsight(key=filing_id, kind="management_change", symbol=symbol, headline=_trim(head, 90),
                            subject=card.person, matches=top, note=note)


# ───────────────────────────── insights over the filing database ─────────────────────────────
def _filings(days: int = 30) -> list[dict]:
    q = ("SELECT f.id, f.symbol, f.headline, f.filed_at, c.category FROM filings f JOIN classifications c ON c.id=f.id "
         "WHERE f.filed_at >= datetime('now', ?) ORDER BY f.filed_at DESC")
    with db.connect() as con:
        return [dict(r) for r in con.execute(q, (f"-{days} days",))]


def insights(days: int = 30) -> list[m.NetworkInsight]:
    rows = [r for r in _filings(days) if r["symbol"] in universe.all_symbols()]
    enrich = load_enrichments([r["id"] for r in rows if r["category"] == "management_change"])
    out: list[m.NetworkInsight] = []
    seen: dict[tuple[str, str], int] = {}
    for r in rows:
        cat = r["category"]
        if cat == "management_change":
            card = enrich.get(r["id"])
            if isinstance(card, m.BioCard):
                ins = management_insight(r["id"], r["symbol"], card, int(r["filed_at"][:4]))
                if ins:
                    out.append(ins)
        elif cat in ("m_and_a", "capex", "litigation") or (cat == "fund_raise" and _FUND_RAISE_BIG.search(r["headline"] or "")):
            key = (r["symbol"], cat)
            if seen.get(key, 0) >= 2:
                continue
            seen[key] = seen.get(key, 0) + 1
            ins = event_insight(r["id"], r["symbol"], cat)
            if ins:
                out.append(ins)
    return out


# ───────────────────────────── keep the network warm ─────────────────────────────
OPENERS = {
    "results": "Saw {co}'s {what}. Thought of your time there. How does it look from the outside?",
    "m_and_a": "{co} just announced a deal. You know that business better than most: any quick read?",
    "capex": "{co} has announced a capex plan. Would love your view from your time there.",
    "litigation": "Noticed the {co} legal update. Is this as significant as it reads?",
    "fund_raise": "{co} is raising capital. You'd know how the market will take it.",
    "management_change": "{co} has a leadership change. Do you know the person coming in?",
}


def warm_nudges(today: date | None = None) -> list[m.WarmNudge]:
    today = today or datetime.now(IST).date()
    rows = [r for r in _filings(NUDGE_WINDOW_DAYS) if r["symbol"] in universe.all_symbols()
            and r["category"] in OPENERS and (r["category"] != "fund_raise" or _FUND_RAISE_BIG.search(r["headline"] or ""))]
    enrich = load_enrichments([r["id"] for r in rows if r["category"] == "results"])
    out: list[m.WarmNudge] = []
    for p in people():
        days = (today - date.fromisoformat(p.relationship.last_contact)).days
        if days < NUDGE_AFTER_DAYS:
            continue
        symbols = {j.nse_symbol for j in p.jobs if j.nse_symbol}
        hit = next((r for r in rows if r["symbol"] in symbols), None)       # newest first
        if not hit:
            continue
        co = _company(hit["symbol"])
        name = _short(co.name) if co else hit["symbol"]
        card = enrich.get(hit["id"])
        what = "results"
        if isinstance(card, m.ResultsCard):
            from app.pipeline.results import so_what
            what = so_what(card) or "results"
        has_numbers = hit["category"] == "results" and what != "results"
        trigger = f"{name}: {what}" if has_numbers else f"{name}: {(hit['headline'] or '')[:70]}"
        out.append(m.WarmNudge(person_id=p.id, name=p.name, headline=p.headline, last_contact=p.relationship.last_contact,
                               days_since=days, symbol=hit["symbol"], trigger=_trim(trigger, 120), filing_id=hit["id"],
                               opener=_trim(OPENERS[hit["category"]].format(co=name, what=what), 200)))
    return sorted(out, key=lambda n: -n.days_since * next(p.relationship.strength for p in people() if p.id == n.person_id))


# ───────────────────────────── expertise map ─────────────────────────────
def expertise_map() -> list[m.ExpertiseTheme]:
    themes: dict[str, list[m.ExpertiseMember]] = {}
    for p in people():
        for tag in p.expertise:
            themes.setdefault(tag.lower(), []).append(m.ExpertiseMember(person_id=p.id, name=p.name,
                                                                       strength=p.relationship.strength))
    out = []
    for tag, members in themes.items():
        want = _stems(tag)
        cos = [c.symbol for c in universe.universe() if _fit(want, _stems(f"{c.sector or ''} {c.name}"))]
        out.append(m.ExpertiseTheme(theme=tag, members=sorted(members, key=lambda x: -x.strength), companies=cos))
    return sorted(out, key=lambda t: (-len(t.members), t.theme))


# ───────────────────────────── the question box: a small tool-using agent ─────────────────────────────
def _theme_matches(question: str, n: int = 4) -> list[m.PersonMatch]:
    want = _stems(question)
    out = []
    for p in people():
        hits = [t for t in p.expertise if _fit(_stems(t), want)] or ([p.headline] if _fit(_stems(p.headline), want) else [])
        if hits:
            out.append(_match(p, "sector_expert", f"{hits[0]}: {p.headline}", [f"expertise: {hits[0]}"],
                              2.0 + p.relationship.strength + len(hits)))
    return _top(out, n)


def _find_symbol(text: str) -> str | None:
    low = text.lower()
    for c in universe.universe():
        if re.search(rf"\b{re.escape(c.symbol.lower())}\b", low) or _short(c.name).lower() in low:
            return c.symbol
    return None


def _plan(question: str) -> tuple[str, str]:
    """Which tool answers this question? One cheap model call, with a rule-based fallback if no model answers."""
    try:
        from app.llm.schemas import NetworkPlan
        plan = run_task("network_plan", {"question": question,
                                         "companies": ", ".join(f"{c.symbol} ({_short(c.name)})" for c in universe.universe())},
                        feature="network.plan", unit="network")
        assert isinstance(plan, NetworkPlan)
        if plan.tool in ("company_contacts", "theme_experts", "warm_contacts", "person_lookup"):
            return plan.tool, plan.argument
    except Exception as e:  # noqa: BLE001 - the box must keep working without a model (LLMUnavailable, bad output, ...)
        log.info("network planner fell back to rules: %s", type(e).__name__)
    if re.search(r"warm|reconnect|haven'?t (spoken|talked)|lost touch|catch up", question, re.IGNORECASE):
        return "warm_contacts", ""
    sym = _find_symbol(question)
    return ("company_contacts", sym) if sym else ("theme_experts", question)


def ask(question: str) -> m.NetworkAskResponse:
    tool, arg = _plan(question)
    steps = [m.AgentStep(tool="plan", input=question[:120], summary=f"use {tool}({arg or '-'})")]
    matches: list[m.PersonMatch] = []
    if tool == "company_contacts" and (_company(arg) is not None or _find_symbol(arg)):
        sym = arg if _company(arg) else _find_symbol(arg)
        ins = company_insight(sym)  # type: ignore[arg-type]
        matches = ins.matches
        steps.append(m.AgentStep(tool=tool, input=sym, summary=ins.headline))  # type: ignore[arg-type]
    elif tool == "warm_contacts":
        nudges = warm_nudges()
        for n in nudges[:3]:
            p = next(p for p in people() if p.id == n.person_id)
            matches.append(_match(p, "worked_at_company", f"{n.trigger}. Last spoke {n.days_since} days ago", [n.trigger], 5.0))
        steps.append(m.AgentStep(tool=tool, input="recent filings x last contact", summary=f"{len(nudges)} reconnect reasons"))
    elif tool == "person_lookup":
        hit = next((p for p in people() if arg.lower() in p.name.lower()), None)
        if hit:
            matches = [_match(hit, "sector_expert", f"{hit.headline}. Met: {hit.relationship.how_met}", [hit.headline], 5.0)]
        steps.append(m.AgentStep(tool=tool, input=arg, summary="found" if hit else "no such contact"))
    else:
        matches = _theme_matches(arg or question)
        steps.append(m.AgentStep(tool="theme_experts", input=arg or question, summary=f"{len(matches)} people"))
    if not matches:
        return m.NetworkAskResponse(answer="No one in your network matches that yet. Try a company name or a theme such as "
                                           "'wires and cables' or 'consumer lending'.", matches=[], steps=steps, answerable=False)
    lead = "; ".join(f"{x.name} ({x.why})" for x in matches[:2])
    return m.NetworkAskResponse(answer=_trim(f"Start with {lead}.", 400), matches=matches, steps=steps)
