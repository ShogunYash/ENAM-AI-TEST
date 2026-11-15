"""FINN API.

Push routes (/companies /prices /digest /alerts /filings/{id}) serve REAL ingested data once finn.sqlite has
classified filings; until then (fresh checkout, or the demo DB missing) they fall back to the illustrative mocks in
docs/examples/. Pull (/research) and /ask are still mocks (plan tasks C1-C6). Shapes are the contract and must not
change (docs/CONTRACT.md). Run from backend/:  uv run uvicorn app.main:app --reload
"""
from __future__ import annotations

import json
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app import charts as charts_mod
from app import db, ops, universe
from app import models as m
from app import network as network_mod
from app.ingest import prices as prices_mod
from app.llm import store as llm_store
from app.pipeline import ask as ask_pipeline
from app.pipeline import digest as digest_mod
from app.research import build as research_build
from app.seed import ensure_seed
from app.settings import get_settings

EXAMPLES = Path(__file__).resolve().parents[2] / "docs" / "examples"

app = FastAPI(title="FINN API", version="0.1.0",
              description="Mobile-first financial investment agent. Contract: docs/CONTRACT.md")
ensure_seed()   # fresh container (ephemeral disk) -> restore the committed demo database + LLM cache
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET", "POST"], allow_headers=["*"])


@lru_cache
def example(name: str) -> Any:
    path = EXAMPLES / f"{name}.json"
    if not path.exists():
        raise HTTPException(404, f"no example {name}")
    return json.loads(path.read_text("utf-8"))


def _symbols() -> list[str]:
    """Portfolio symbols (holdings): what the ranked digest, alerts and /prices cover."""
    return sorted(universe.portfolio_symbols())


def _has_real_data() -> bool:
    try:
        with db.connect() as con:
            return con.execute("SELECT 1 FROM classifications LIMIT 1").fetchone() is not None
    except Exception:  # noqa: BLE001 — a missing/corrupt DB must never take the API down
        return False


def _csv_categories(raw: str | None) -> list[m.Category]:
    out = []
    for part in (raw or "").split(","):
        try:
            out.append(m.Category(part.strip()))
        except ValueError:
            continue
    return out


def _settings(volume_multiple: float, price_move_pct: float, interests: str | None, muted: str | None) -> m.Settings:
    base = m.Settings(volume_multiple=volume_multiple, price_move_pct=price_move_pct)
    if interests is not None:
        base.categories_of_interest = _csv_categories(interests)
    if muted is not None:
        base.muted_categories = _csv_categories(muted)
    return base


@app.get("/health", response_model=m.Health)
def health() -> Any:
    snaps = prices_mod.snapshots(_symbols()) if _has_real_data() else []
    as_of = max((s.as_of for s in snaps), default=None)
    live = _has_real_data()
    return {**example("health"), "mode": "live" if live else "mock",
            "snapshot_as_of": as_of.isoformat() if as_of else example("health")["snapshot_as_of"]}


@app.get("/network/people", response_model=list[m.NetworkPerson])
def network_people() -> Any:
    """The investor's contacts (SYNTHETIC demo network; see docs/ARCHITECTURE.md for the privacy design)."""
    return network_mod.people()


@app.get("/network/insights", response_model=list[m.NetworkInsight])
def network_insights() -> Any:
    """Network matches for the last 30 days of filings: management changes (who overlaps with the new person) and
    material events (who is best placed to give context). Keyed by filing id."""
    return network_mod.insights()


@app.get("/network/company/{symbol}", response_model=m.NetworkInsight)
def network_company(symbol: str) -> Any:
    return network_mod.company_insight(symbol.strip().upper())


@app.get("/network/warm", response_model=list[m.WarmNudge])
def network_warm() -> Any:
    return network_mod.warm_nudges()


@app.get("/network/expertise", response_model=list[m.ExpertiseTheme])
def network_expertise() -> Any:
    return network_mod.expertise_map()


@app.post("/network/ask", response_model=m.NetworkAskResponse)
def network_ask(req: m.NetworkAskRequest) -> Any:
    """Direct question to the network. A small agent: a model picks one tool, code runs it, the answer is built from
    the tool's matches (it cannot name anyone who is not in the network)."""
    return network_mod.ask(req.question)


@app.get("/companies", response_model=list[m.Company])
def companies() -> Any:
    """Everything FINN tracks: the portfolio (in_portfolio=true) and the watchlist (false)."""
    return [m.Company(symbol=c.symbol, bse_code=c.bse_code, name=c.name, sector=c.sector, in_portfolio=c.in_portfolio)
            for c in universe.universe()]


@app.get("/prices", response_model=list[m.PriceSnapshot])
def prices() -> Any:
    snaps = prices_mod.snapshots(_symbols()) if _has_real_data() else []
    return snaps or example("prices")


@app.get("/prices/{symbol}/chart", response_model=m.PriceChart)
def price_chart(symbol: str, range: m.ChartRange = Query("1d", description="1d | 3d | 7d | 30d")) -> Any:
    """Price chart for a tracked symbol: 15-minute closes for 1d/3d/7d, daily closes for 30d. No model involved."""
    sym = symbol.strip().upper()
    if sym not in universe.all_symbols():
        raise HTTPException(404, f"{sym} is not tracked")
    return charts_mod.chart(sym, range)


@app.get("/digest", response_model=m.Digest)
def digest(
    window: m.WindowLabel = "24h",
    start: datetime | None = Query(None, description="Required when window=custom"),
    end: datetime | None = Query(None, description="Required when window=custom"),
    volume_multiple: float = 2.0,
    price_move_pct: float = 5.0,
    interests: str | None = Query(None, description="Comma-separated Category values to boost"),
    muted: str | None = Query(None, description="Comma-separated Category values to hide"),
) -> Any:
    if window == "custom" and (start is None or end is None):
        raise HTTPException(422, "start and end are required for window=custom")
    if not _has_real_data():
        return example("digest-3d" if window in ("3d", "7d", "custom") else "digest-24h")
    # the ranked digest and its alerts are about HOLDINGS only; the watchlist is reached through /digest/companies
    return digest_mod.build_digest(window, start, end, _settings(volume_multiple, price_move_pct, interests, muted),
                                   snaps=prices_mod.snapshots(_symbols()), symbols=universe.portfolio_symbols())


def _universe_rows() -> list[tuple[str, str, str | None, bool]]:
    return universe.as_rows()


@app.get("/digest/companies", response_model=m.CompanyList)
def digest_companies(
    window: m.WindowLabel = "30d",
    start: datetime | None = Query(None, description="Required when window=custom"),
    end: datetime | None = Query(None, description="Required when window=custom"),
    volume_multiple: float = 2.0,
    price_move_pct: float = 5.0,
    interests: str | None = Query(None, description="Comma-separated Category values to boost"),
    muted: str | None = Query(None, description="Comma-separated Category values to hide"),
) -> Any:
    """By-company view of a window (the UI uses it for 30d, where one flat list is too much): one row per portfolio
    company with counts, material categories, its best headline and the latest price move."""
    if window == "custom" and (start is None or end is None):
        raise HTTPException(422, "start and end are required for window=custom")
    if not _has_real_data():
        return example("company-list")
    return digest_mod.build_company_list(_universe_rows(), window, start, end,
                                         _settings(volume_multiple, price_move_pct, interests, muted),
                                         snaps=prices_mod.snapshots(universe.all_symbols()))


@app.get("/digest/company/{symbol}", response_model=m.CompanyFilings)
def digest_company(
    symbol: str,
    window: m.WindowLabel = "30d",
    start: datetime | None = Query(None, description="Required when window=custom"),
    end: datetime | None = Query(None, description="Required when window=custom"),
    volume_multiple: float = 2.0,
    price_move_pct: float = 5.0,
    interests: str | None = Query(None, description="Comma-separated Category values to boost"),
    muted: str | None = Query(None, description="Comma-separated Category values to hide"),
) -> Any:
    """Everything one company filed in the window, uncapped: important filings first, routine ones collapsed."""
    if window == "custom" and (start is None or end is None):
        raise HTTPException(422, "start and end are required for window=custom")
    sym = symbol.strip().upper()
    if not _has_real_data():
        return {**example("company-filings"), "symbol": sym}
    names = {s: n for s, n, _, _ in _universe_rows()}
    return digest_mod.build_company_filings(sym, names.get(sym), window, start, end,
                                            _settings(volume_multiple, price_move_pct, interests, muted),
                                            snaps=prices_mod.snapshots(universe.all_symbols()))


@app.get("/filings/{filing_id}", response_model=m.Filing)
def filing(filing_id: str) -> Any:
    if _has_real_data():
        now = datetime.now(digest_mod.IST)
        with db.connect() as con:
            row = con.execute("SELECT f.id, f.symbol, f.company_name, f.filed_at, f.subcategory, f.headline, f.pdf_name, "
                              "c.category, c.source, c.confidence FROM filings f JOIN classifications c ON c.id=f.id "
                              "WHERE f.id=?", (filing_id,)).fetchone()
        if row:
            snaps = {s.symbol: s for s in prices_mod.snapshots([row["symbol"]])}
            f = digest_mod.to_filing(dict(row), m.Settings(), snaps, now)
            digest_mod.attach_enrichments([f])
            return f
    for name in ("filing-results", "filing-management", "filing-oneliner"):
        if example(name)["id"] == filing_id:
            return example(name)
    raise HTTPException(404, "filing not found")


@app.get("/alerts", response_model=list[m.Alert])
def alerts(volume_multiple: float = 2.0, price_move_pct: float = 5.0) -> Any:
    if not _has_real_data():
        return example("alerts")
    d = digest_mod.build_digest("24h", settings=_settings(volume_multiple, price_move_pct, None, None),
                                snaps=prices_mod.snapshots(_symbols()), symbols=universe.portfolio_symbols())
    return d.alerts


@app.get("/research/{symbol}", response_model=m.Research)
def research(symbol: str) -> Any:
    """Cached report if built; otherwise starts a background build and returns status=building with progress
    (the client polls every 3 s). Mock fixtures only when there is no ingested database at all (fresh checkout)."""
    sym = symbol.strip().upper()
    if not _has_real_data() and research_build.get_cached(sym) is None:
        return example("research-INFY") if sym == "INFY" else {**example("research-building"), "symbol": sym}
    return research_build.status(sym)


@app.get("/stats/llm", response_model=m.LlmStats)
def stats() -> Any:
    """Real ledger numbers once any LLM call has been made; illustrative mock until then."""
    db = get_settings().llm_db_path
    return llm_store.stats(db) if llm_store.has_rows(db) else example("stats")


@app.get("/debug/sources", response_model=m.SourcesReport)
def debug_sources() -> Any:
    """Live cloud-IP check: can THIS server reach BSE, screener.in and Yahoo? (3 cheap requests, no LLM.)"""
    return ops.check_sources()


@app.post("/ask", response_model=m.AskResponse)
def ask(req: m.AskRequest) -> Any:
    """Grounded Q&A about the filing or research report on screen: answers only from that evidence, every quote verified,
    every figure already present in it. Says so plainly when it can't answer. Fixtures only when there is no database."""
    if not _has_real_data():
        return example("ask")
    return ask_pipeline.answer(req)
