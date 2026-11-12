"""C1-C3: build + cache the full research report for symbols (screener tables, transcripts, guidance, promised-vs-delivered).

  uv run python -u -m scripts.build_research INFY BAJFINANCE POLYCAB KPIL
Writes the report into finn.sqlite (research_cache); `scripts.refresh_snapshot` then exports research/{SYM}.json for the PWA.
Build-time only: the judging step runs on the local model (station GPU) or Gemini; the deployed demo serves the cache.
"""
from __future__ import annotations

import sys
import time

from app.research import build


def main(symbols: list[str]) -> int:
    bad = 0
    for sym in symbols:
        t0 = time.time()
        r = build.build_research(sym.upper(), progress=lambda s, sym=sym, t0=t0: print(f"  {sym} [{time.time() - t0:4.0f}s] {s}", flush=True))
        if r.status == "failed":
            bad += 1
            print(f"[FAIL] {sym}: {r.gaps}", flush=True)
            continue
        build.save(r)
        by_v: dict[str, int] = {}
        for it in r.pvd:
            by_v[it.verdict] = by_v.get(it.verdict, 0) + 1
        print(f"[{r.status}] {sym} ({r.name}): {len(r.sources)} docs, {len(r.pvd)} promises {by_v}, "
              f"{r.cost.llm_calls} LLM calls, {time.time() - t0:.0f}s; gaps: {r.gaps}", flush=True)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:] or ["INFY", "BAJFINANCE", "POLYCAB", "KPIL"]))
