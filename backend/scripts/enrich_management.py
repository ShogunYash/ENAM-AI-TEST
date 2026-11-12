"""B4: build management-change BioCards from the filing text (PDF first 2 pages) for ingested filings.

  uv run python -m scripts.enrich_management [--only HDFCBANK] [--force]
Text-only task (tier T2): runs on Gemini or the local station model. Caches per filing; abstains rather than guessing.
"""
from __future__ import annotations

import argparse
import sys
import time

from pydantic import ValidationError

from app import db
from app.ingest.docs import DocError
from app.llm import LLMUnavailable
from app.pipeline import mgmt_bio


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--days", type=int, default=60)
    a = ap.parse_args()
    only = {s.strip().upper() for s in a.only.split(",")} if a.only else None
    with db.connect() as con:
        rows = [dict(r) for r in con.execute(
            "SELECT f.id,f.symbol,f.pdf_name,f.headline,f.subcategory FROM filings f JOIN classifications c ON c.id=f.id "
            "WHERE c.category='management_change' AND f.pdf_name!='' AND f.filed_at >= datetime('now', ?) "
            "ORDER BY f.filed_at DESC", (f"-{a.days} days",))]
    rows = [r for r in rows if not only or r["symbol"] in only]
    print(f"{len(rows)} management-change filings", flush=True)
    bad = 0
    for r in rows:
        t0 = time.time()
        try:
            card = mgmt_bio.enrich_management(r["id"], r["symbol"], r["pdf_name"], r["headline"], r["subcategory"],
                                              force=a.force)
        except (LLMUnavailable, DocError, ValidationError) as e:
            bad += 1
            print(f"[FAIL] {r['symbol']:<10}{r['id'][:8]} {type(e).__name__}: {str(e)[:120]}", flush=True)
            continue
        if card is None:
            bad += 1
            print(f"[none] {r['symbol']:<10}{r['id'][:8]} rejected/abstained | {r['headline'][:60]!r}", flush=True)
            continue
        print(f"[ok]   {r['symbol']:<10}{r['id'][:8]} {card.change:<9} {card.person} | {card.role} | eff {card.effective} | "
              f"bg[{card.background_source}] {card.background}  ({time.time() - t0:.0f}s)", flush=True)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
