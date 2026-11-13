"""Build the Digest (push) from ingested + classified filings. No LLM calls here: everything it needs is already
in finn.sqlite (filings, classifications, bars). Enrichment (results card, bio, one-liner) is attached by B3/B4."""
from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta

from app import db
from app import models as m
from app.ingest import bse
from app.models import Category as C
from app.models import Priority as P
from app.pipeline import mgmt_bio
from app.pipeline import results as R
from app.pipeline import score as S
from app.signals import alerts as A
from app.signals.eod import IST

WINDOWS = {"24h": timedelta(hours=24), "3d": timedelta(days=3), "7d": timedelta(days=7), "30d": timedelta(days=30)}
ROUTINE_ITEM_CAP = 80
NEEDS_YOU_MAX = 5


def _pdf(name: str, age: timedelta) -> str | None:
    return bse.pdf_link(name, age)


def _reaction(snap: m.PriceSnapshot | None, filed_at: datetime) -> m.PriceReaction | None:
    """Attach the latest session's move to filings made in the ~2 days up to that session."""
    if not snap or not (timedelta(0) <= snap.as_of - filed_at <= timedelta(days=2)):
        return None
    return m.PriceReaction(pct_1d=snap.pct_1d, vol_ratio=snap.vol_ratio)


def filings_between(start: datetime, end: datetime, symbols: set[str] | None = None) -> list[dict]:
    q = ("SELECT f.id, f.symbol, f.company_name, f.filed_at, f.subcategory, f.headline, f.pdf_name, "
         "c.category, c.source, c.confidence FROM filings f JOIN classifications c ON c.id=f.id "
         "WHERE f.filed_at >= ? AND f.filed_at <= ? ORDER BY f.filed_at DESC")
    with db.connect() as con:
        rows = [dict(r) for r in con.execute(q, (start.isoformat(), end.isoformat()))]
    return [r for r in rows if not symbols or r["symbol"] in symbols]


def to_filing(row: dict, settings: m.Settings, snaps: dict[str, m.PriceSnapshot], now: datetime) -> m.Filing:
    filed = datetime.fromisoformat(row["filed_at"])
    w = S.weight(row["category"], row["subcategory"] or "", row["headline"] or "")
    reaction = _reaction(snaps.get(row["symbol"]), filed)
    sc = S.score(w, row["category"], interests={C(c).value for c in settings.categories_of_interest},
                 muted={C(c).value for c in settings.muted_categories}, reaction=reaction, filed_at=filed, now=now)
    return m.Filing(
        id=row["id"], symbol=row["symbol"], company_name=row["company_name"] or row["symbol"], filed_at=filed,
        headline=row["headline"] or "(no headline)", so_what=None, category=C(row["category"]),
        category_source=row["source"], priority=S.priority_for(w), score=sc,
        pdf_url=_pdf(row["pdf_name"], now - filed), price_reaction=reaction,
        enrichment=None)


def attach_enrichments(filings: list[m.Filing]) -> None:
    """Attach stored enrichment cards (results/bio/one-liner) and the code-derived one-liner for results."""
    found = R.load_enrichments([f.id for f in filings])
    for f in filings:
        card = found.get(f.id)
        if card is None:
            continue
        f.enrichment = card
        if isinstance(card, m.ResultsCard) and not f.so_what:
            f.so_what = R.so_what(card)
        elif isinstance(card, m.BioCard) and not f.so_what:
            f.so_what = mgmt_bio.so_what(card)
        elif isinstance(card, m.OneLiner) and not f.so_what:
            f.so_what = card.text[:70]                      # verified line from pipeline/oneliner.py (<= 70 chars already)


def resolve_window(label: str, now: datetime, start: datetime | None, end: datetime | None) -> m.DigestWindow:
    if label == "custom":
        if not (start and end):
            raise ValueError("custom window needs start and end")
        return m.DigestWindow(label="custom", start=start, end=end)
    return m.DigestWindow(label=label, start=now - WINDOWS[label], end=now)


def build_digest(label: str = "24h", start: datetime | None = None, end: datetime | None = None,
                 settings: m.Settings | None = None, now: datetime | None = None,
                 snaps: list[m.PriceSnapshot] | None = None) -> m.Digest:
    now = now or datetime.now(IST)
    settings = settings or m.Settings()
    window = resolve_window(label, now, start, end)
    snaps = snaps or []
    by_sym = {s.symbol: s for s in snaps}
    muted = {C(c).value for c in settings.muted_categories}

    rows = filings_between(window.start, window.end)
    filings = [to_filing(r, settings, by_sym, now) for r in rows]
    attach_enrichments(filings)

    def significant(f: m.Filing) -> bool:
        rc = f.price_reaction
        return bool(rc and (abs(rc.pct_1d) >= settings.price_move_pct or rc.vol_ratio >= settings.volume_multiple))

    visible = [f for f in filings if C(f.category).value not in muted]
    candidates = sorted((f for f in visible if f.priority == P.high.value
                         or (f.priority == P.medium.value and significant(f))), key=lambda f: -f.score)
    # One card per company event: a QIP, for example, is often filed 3x (committee notice, outcome, allotment).
    # Keep the top-scoring filing per (company, category); the siblings drop to "also material".
    needs_you, seen = [], set()
    for f in candidates:
        key = (f.symbol, C(f.category).value)
        if key not in seen and len(needs_you) < NEEDS_YOU_MAX:
            seen.add(key)
            needs_you.append(f)
    taken = {f.id for f in needs_you}
    also = sorted((f for f in visible if f.priority in (P.high.value, P.medium.value) and f.id not in taken),
                  key=lambda f: -f.score)
    taken |= {f.id for f in also}
    routine = sorted((f for f in filings if f.id not in taken), key=lambda f: -f.score)

    src = Counter(f.category_source for f in filings)
    alerts = (A.filing_alerts(filings, settings) + A.price_alerts(snaps, settings))
    alerts.sort(key=lambda a: a.triggered_at, reverse=True)
    return m.Digest(
        window=window, generated_at=now, needs_you=needs_you, also_material=also,
        routine=m.RoutineGroup(count=len(routine), by_category=dict(Counter(C(f.category).value for f in routine)),
                               items=routine[:ROUTINE_ITEM_CAP]),
        alerts=alerts, counts=m.DigestCounts(total=len(filings), rule_classified=src.get("rule", 0),
                                             llm_classified=src.get("llm", 0)))


# ───────────────────────── by-company view (the 30-day window) ─────────────────────────
def _window_filings(label: str, start: datetime | None, end: datetime | None, settings: m.Settings, now: datetime,
                    snaps: list[m.PriceSnapshot]) -> tuple[m.DigestWindow, list[m.Filing]]:
    window = resolve_window(label, now, start, end)
    by_sym = {s.symbol: s for s in snaps}
    filings = [to_filing(r, settings, by_sym, now) for r in filings_between(window.start, window.end)]
    attach_enrichments(filings)
    return window, filings


def _material(f: m.Filing, muted: set[str]) -> bool:
    return f.priority in (P.high.value, P.medium.value) and C(f.category).value not in muted


def build_company_list(companies: list[tuple[str, str, str | None]], label: str = "30d", start: datetime | None = None,
                       end: datetime | None = None, settings: m.Settings | None = None, now: datetime | None = None,
                       snaps: list[m.PriceSnapshot] | None = None) -> m.CompanyList:
    """One row per portfolio company: counts, material categories, the best headline and the latest price move."""
    now, settings, snaps = now or datetime.now(IST), settings or m.Settings(), snaps or []
    window, filings = _window_filings(label, start, end, settings, now, snaps)
    muted = {C(c).value for c in settings.muted_categories}
    by_symbol: dict[str, list[m.Filing]] = {}
    for f in filings:
        by_symbol.setdefault(f.symbol, []).append(f)
    snap_by = {s.symbol: s for s in snaps}
    rows = []
    for symbol, name, sector in companies:
        fs = by_symbol.get(symbol, [])
        material = [f for f in fs if _material(f, muted)]
        top = max(material, key=lambda f: f.score, default=None)
        s = snap_by.get(symbol)
        rows.append(m.CompanySummary(
            symbol=symbol, name=name, sector=sector, total=len(fs), material=len(material),
            categories=dict(Counter(C(f.category).value for f in material)), top=top,
            price=m.PriceReaction(pct_1d=s.pct_1d, vol_ratio=s.vol_ratio) if s else None))
    rows.sort(key=lambda r: (-(r.top.score if r.top else -1.0), -r.total, r.symbol))
    return m.CompanyList(window=window, generated_at=now, companies=rows)


def build_company_filings(symbol: str, name: str | None = None, label: str = "30d", start: datetime | None = None,
                          end: datetime | None = None, settings: m.Settings | None = None, now: datetime | None = None,
                          snaps: list[m.PriceSnapshot] | None = None) -> m.CompanyFilings:
    """All of one company's filings in the window (no caps): important ones first, the rest collapsed."""
    now, settings = now or datetime.now(IST), settings or m.Settings()
    window, filings = _window_filings(label, start, end, settings, now, snaps or [])
    mine = sorted((f for f in filings if f.symbol == symbol), key=lambda f: (-f.score, f.filed_at), reverse=False)
    muted = {C(c).value for c in settings.muted_categories}
    important = [f for f in mine if _material(f, muted)]
    routine = sorted((f for f in mine if not _material(f, muted)), key=lambda f: f.filed_at, reverse=True)
    src = Counter(f.category_source for f in mine)
    return m.CompanyFilings(
        symbol=symbol, name=name or (mine[0].company_name if mine else symbol), window=window, generated_at=now,
        counts=m.DigestCounts(total=len(mine), rule_classified=src.get("rule", 0), llm_classified=src.get("llm", 0)),
        important=important,
        routine=m.RoutineGroup(count=len(routine), by_category=dict(Counter(C(f.category).value for f in routine)),
                               items=routine))
