"""B-oneliner: one-line 'so what' for the filings that reach Needs-you / Also-material but have no card.

  uv run python -m scripts.enrich_oneliners [--window 30d] [--limit 60]
Cheap tier (T1): headline + first 2 PDF pages -> <= 70 chars, numbers verified against the source. Cached per filing.
"""
from __future__ import annotations

import argparse
import sys
import time

from pydantic import ValidationError

from app import db
from app.ingest import prices as prices_mod
from app.ingest.docs import DocError
from app.llm import LLMUnavailable
from app.pipeline import digest as digest_mod
from app.pipeline import oneliner


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--window", default="30d", choices=["24h", "3d", "7d", "30d"])
    ap.add_argument("--limit", type=int, default=60)
    a = ap.parse_args()
    with db.connect() as con:
        syms = [r["symbol"] for r in con.execute("SELECT DISTINCT symbol FROM filings")]
    d = digest_mod.build_digest(a.window, snaps=prices_mod.snapshots(syms))
    pdf = {}
    with db.connect() as con:
        for r in con.execute("SELECT id, pdf_name, subcategory FROM filings"):
            pdf[r["id"]] = (r["pdf_name"], r["subcategory"])
    todo = [f for f in d.needs_you + d.also_material if f.enrichment is None and pdf.get(f.id, ("",))[0]][: a.limit]
    print(f"{len(todo)} filings need a one-liner ({a.window})", flush=True)
    bad = 0
    for f in todo:
        name, sub = pdf[f.id]
        t0 = time.time()
        try:
            line = oneliner.enrich_oneliner(f.id, f.symbol, name, f.headline, sub or "")
        except (LLMUnavailable, DocError, ValidationError) as e:
            bad += 1
            print(f"[FAIL] {f.symbol:<10}{f.id[:8]} {type(e).__name__}: {str(e)[:100]}", flush=True)
            continue
        if not line:
            print(f"[none] {f.symbol:<10}{f.id[:8]} {f.category:<17} abstained/rejected | {f.headline[:55]!r}", flush=True)
            continue
        print(f"[ok]   {f.symbol:<10}{f.id[:8]} {f.category:<17} {line}  ({time.time() - t0:.0f}s)", flush=True)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
