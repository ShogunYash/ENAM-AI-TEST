"""B3: build results cards for ingested 'Financial Results' filings (PDF -> Gemini native PDF -> code -> screener check).

  uv run python -m scripts.enrich_results                 # every un-enriched results filing in the last 60 days
  uv run python -m scripts.enrich_results --only CERA,TCS --force
Each filing costs 1 Gemini call (cached forever by PDF hash). Prints one line per filing.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

from pydantic import ValidationError

from app import db
from app.ingest.docs import DocError
from app.llm import LLMUnavailable
from app.pipeline import results

PORTFOLIO = Path(__file__).resolve().parents[2] / "data" / "portfolio.json"


PACE_S = 8            # gap between filings: the free Gemini tier rate-limits bursts of PDF requests
RETRIES = 3           # on LLMUnavailable wait out the router's 60 s cooldown, then try again


def enrich_with_retry(r: dict, sector: str | None, force: bool):
    for attempt in range(RETRIES + 1):
        try:
            return results.enrich_results(r["id"], r["symbol"], r["pdf_name"], sector, force=force)
        except LLMUnavailable:
            if attempt == RETRIES:
                raise
            print(f"       {r['symbol']}: models busy, waiting 65 s (retry {attempt + 1}/{RETRIES})", flush=True)
            time.sleep(65)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="comma-separated NSE symbols")
    ap.add_argument("--force", action="store_true", help="rebuild even if a card exists")
    ap.add_argument("--days", type=int, default=60)
    a = ap.parse_args()
    sectors = {s["nse_symbol"]: s["sector"] for s in json.loads(PORTFOLIO.read_text("utf-8"))["portfolio"]}
    only = {s.strip().upper() for s in a.only.split(",")} if a.only else None

    with db.connect() as con:
        rows = [dict(r) for r in con.execute(
            "SELECT f.id, f.symbol, f.pdf_name, f.filed_at, f.headline FROM filings f "
            "JOIN classifications c ON c.id=f.id WHERE c.category='results' AND f.subcategory='Financial Results' "
            "AND f.pdf_name!='' AND f.filed_at >= datetime('now', ?) ORDER BY f.filed_at DESC", (f"-{a.days} days",))]
    rows = [r for r in rows if not only or r["symbol"] in only]
    print(f"{len(rows)} results filings")
    bad = 0
    for r in rows:
        t0 = time.time()
        try:
            card = enrich_with_retry(r, sectors.get(r["symbol"]), a.force)
        except (LLMUnavailable, DocError, ValidationError) as e:
            bad += 1
            print(f"[FAIL] {r['symbol']:<11} {type(e).__name__}: {str(e)[:150]}")
            continue
        if card is None:
            bad += 1
            print(f"[none] {r['symbol']:<11} model could not read current-quarter figures ({r['headline'][:50]!r})")
            continue
        time.sleep(PACE_S)
        by = {x.name: x for x in card.metrics}
        rev, pat = by["revenue"], by["pat"]
        print(f"[ok]   {r['symbol']:<11} {card.period} {card.basis[:4]} rev {rev.value or 0:>10,.0f} ({rev.yoy_pct}% YoY)  "
              f"pat {pat.value or 0:>9,.0f} ({pat.yoy_pct}% YoY)  margin {card.margin_ebitda_pct}  "
              f"check={card.cross_check.status}{' ' + card.cross_check.note if card.cross_check.note else ''}  "
              f"{time.time() - t0:.0f}s", flush=True)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
