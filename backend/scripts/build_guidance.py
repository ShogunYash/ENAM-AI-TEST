"""C2: extract + verify management guidance from every stored transcript of the given symbols.

  uv run python -u -m scripts.build_guidance INFY BAJFINANCE POLYCAB KPIL
Uses the router (tier T2: Gemini Flash -> local Ollama on the station -> Flash-Lite ...). Cached forever per transcript.
"""
from __future__ import annotations

import sys
import time

from app.research import guidance, loader


def main(symbols: list[str]) -> int:
    bad = 0
    for sym in symbols:
        loader.load_company(sym.upper(), n_concalls=5)
        t0 = time.time()
        items, notes = guidance.extract_all(sym.upper(), progress=lambda s, sym=sym: print(f"  {sym}: {s}", flush=True))
        per = {}
        for g in items:
            per[g.period] = per.get(g.period, 0) + 1
        print(f"[{sym}] {len(items)} verified guidance items in {time.time() - t0:.0f}s  per call: {per}", flush=True)
        for n in notes:
            bad += 1
            print(f"   note: {n}", flush=True)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:] or ["INFY", "BAJFINANCE", "POLYCAB", "KPIL"]))
