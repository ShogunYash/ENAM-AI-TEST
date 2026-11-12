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

from app import models as m
from app.ingest import prices as prices_mod
from app.llm import store as llm_store
from app.pipeline import digest as digest_mod
from app.pipeline.classify import classify_pending
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
    symbols = [s["nse_symbol"] for s in pf["portfolio"]]
    now = datetime.now(IST)
    snaps = prices_mod.snapshots(symbols)

    dump(out / "companies.json", [m.Company(symbol=s["nse_symbol"], bse_code=s["bse_scrip_code"], name=s["name"],
                                             sector=s["sector"], in_portfolio=True) for s in pf["portfolio"]])
    dump(out / "prices.json", snaps)

    digests = {label: digest_mod.build_digest(label, snaps=snaps, now=now) for label in ("24h", "3d", "7d", "30d")}
    for label, d in digests.items():
        dump(out / f"digest-{label}.json", d)
    dump(out / "alerts.json", digests["24h"].alerts)

    # enriched filings (results cards etc.) get their own file for the detail view
    fdir = out / "filings"
    if fdir.exists():
        shutil.rmtree(fdir)                 # drop stale mock/old files so nothing fake lingers
    d30 = digests["30d"]
    enriched = [f for f in d30.needs_you + d30.also_material + d30.routine.items if f.enrichment]
    for f in enriched:
        dump(fdir / f"{f.id}.json", f)

    db = get_settings().llm_db_path
    if llm_store.has_rows(db):
        dump(out / "stats.json", llm_store.stats(db))
    as_of = max((s.as_of for s in snaps), default=now)
    dump(out / "meta.json", m.SnapshotMeta(as_of=now, portfolio_size=len(symbols),
                                           research_symbols=[r["nse_symbol"] for r in pf.get("research", [])]))
    dump(out / "health.json", m.Health(ok=True, version="0.1.0", snapshot_as_of=as_of))
    print(f"snapshot -> {out}: {len(symbols)} companies, {len(snaps)} prices, "
          + ", ".join(f"{k}: {d.counts.total} filings/{len(d.needs_you)} needs-you" for k, d in digests.items())
          + f", {len(enriched)} enriched filings, {len(d30.alerts)} alerts(30d)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
