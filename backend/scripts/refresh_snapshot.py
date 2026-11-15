"""B6: export the Push snapshot the PWA loads first (works with the backend asleep or offline).

  uv run python -m scripts.refresh_snapshot [--out ../frontend/public/data]

Writes (see docs/CONTRACT.md "Snapshot layout"): meta, health, companies, prices, alerts, stats, digest-24h|3d|7d|30d, and
filings/{id}.json for every ENRICHED filing in the 30-day digest. research/* and settings.json are left untouched
(research is built separately; settings live on the client). Run after scripts.ingest + classify + enrich_results.
"""
from __future__ import annotations

import argparse
import json
import shutil
from datetime import datetime
from pathlib import Path

from app import charts as charts_mod
from app import models as m
from app import network as network_mod
from app import universe
from app.ingest import prices as prices_mod
from app.llm import store as llm_store
from app.pipeline import digest as digest_mod
from app.pipeline.classify import classify_pending
from app.research import build as research_build
from app.settings import get_settings
from app.signals.eod import IST

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUT = ROOT / "frontend" / "public" / "data"


def dump(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    data = [o.model_dump(mode="json") for o in obj] if isinstance(obj, list) else obj.model_dump(mode="json")
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", "utf-8")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    ap.add_argument("--classify", action="store_true", help="classify any new filings first (uses the LLM for leftovers)")
    a = ap.parse_args()
    out: Path = a.out
    if a.classify:
        print("classify:", classify_pending())

    pf = json.loads((ROOT / "data" / "portfolio.json").read_text("utf-8"))
    hold = universe.portfolio_symbols()                       # holdings: ranked digest, alerts, prices.json
    symbols = sorted(hold)
    now = datetime.now(IST)
    all_snaps = prices_mod.snapshots(universe.all_symbols())
    snaps = [x for x in all_snaps if x.symbol in hold]        # prices.json feeds OFFLINE alerts: holdings only

    dump(out / "companies.json", [m.Company(symbol=c.symbol, bse_code=c.bse_code, name=c.name, sector=c.sector,
                                             in_portfolio=c.in_portfolio) for c in universe.universe()])
    dump(out / "prices.json", snaps)

    digests = {label: digest_mod.build_digest(label, snaps=snaps, now=now, symbols=hold)
               for label in ("24h", "3d", "7d", "30d")}
    for label, d in digests.items():
        dump(out / f"digest-{label}.json", d)
    dump(out / "alerts.json", digests["24h"].alerts)

    # by-company view: one list + one uncapped file per company, for 3d / 7d / 30d (works with the API asleep)
    # portfolio AND watchlist rows (each flagged in_portfolio): the UI's "My portfolio | Watchlist" toggle filters on the flag
    rows = universe.as_rows()
    cdir = out / "company-filings"
    if cdir.exists():
        shutil.rmtree(cdir)
    for label in ("24h", "3d", "7d", "30d"):
        dump(out / f"digest-companies-{label}.json", digest_mod.build_company_list(rows, label, snaps=all_snaps, now=now))
        for sym, name, _, _ in rows:
            dump(cdir / f"{sym}-{label}.json", digest_mod.build_company_filings(sym, name, label, snaps=all_snaps, now=now))

    # price charts: one small file per tracked symbol and range (works with the API asleep)
    cdir2 = out / "charts"
    if cdir2.exists():
        shutil.rmtree(cdir2)
    for sym in sorted(universe.all_symbols()):
        for rng in ("1d", "3d", "7d", "30d"):
            dump(cdir2 / f"{sym}-{rng}.json", charts_mod.chart(sym, rng))

    # the Network (SYNTHETIC contacts): people, per-filing matches, reconnect nudges, expertise map, per-company contacts
    ndir = out / "network"
    if ndir.exists():
        shutil.rmtree(ndir)
    net_insights = network_mod.insights()
    dump(ndir / "people.json", network_mod.people())
    dump(ndir / "insights.json", net_insights)
    dump(ndir / "warm.json", network_mod.warm_nudges())
    dump(ndir / "expertise.json", network_mod.expertise_map())
    for sym in sorted(universe.all_symbols()):
        dump(ndir / "companies" / f"{sym}.json", network_mod.company_insight(sym))

    # enriched filings (results cards etc.) get their own file for the detail view
    fdir = out / "filings"
    if fdir.exists():
        shutil.rmtree(fdir)                 # drop stale mock/old files so nothing fake lingers
    d30 = digests["30d"]
    enriched = [f for f in d30.needs_you + d30.also_material + d30.routine.items if f.enrichment]
    for f in enriched:
        dump(fdir / f"{f.id}.json", f)

    # pre-built research reports (real, is_sample=false); mock files for the build-progress demo (DIXON, building) are kept
    built = []
    for r in pf.get("research", []):
        rep = research_build.get_cached(r["nse_symbol"])
        if rep is not None:
            dump(out / "research" / f"{rep.symbol}.json", rep)
            built.append(rep.symbol)

    db = get_settings().llm_db_path
    if llm_store.has_rows(db):
        dump(out / "stats.json", llm_store.stats(db))
    as_of = max((s.as_of for s in snaps), default=now)
    dump(out / "meta.json", m.SnapshotMeta(as_of=now, portfolio_size=len(symbols),
                                           research_symbols=[r["nse_symbol"] for r in pf.get("research", [])]))
    dump(out / "health.json", m.Health(ok=True, version="0.1.0", mode="live", snapshot_as_of=as_of))
    print(f"snapshot -> {out}: {len(symbols)} companies, {len(snaps)} prices, "
          + ", ".join(f"{k}: {d.counts.total} filings/{len(d.needs_you)} needs-you" for k, d in digests.items())
          + f", {len(net_insights)} network insights, {len(enriched)} enriched filings, {len(d30.alerts)} alerts(30d), research: {built}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
