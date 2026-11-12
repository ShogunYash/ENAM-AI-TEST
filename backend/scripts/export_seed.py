"""D1: export the demo seed the DEPLOYED API boots from (Render's disk is ephemeral and free-tier LLM quotas are daily).

  uv run python -m scripts.export_seed

Writes backend/seed/finn.sqlite (filings, classifications, enrichments, bars, research_cache, document metadata; NOT the bulky
page text) and backend/seed/llm.sqlite (the LLM answer cache + cost ledger, with long cooldowns cleared so the deployed API
doesn't inherit today's exhausted-quota skips). `app.seed.ensure_seed()` copies them into place when the data dir is empty.
"""
from __future__ import annotations

import shutil
import sqlite3

from app.settings import BACKEND_DIR, get_settings

SEED = BACKEND_DIR / "seed"


def main() -> int:
    s = get_settings()
    src, llm = s.finn_data_dir / "finn.sqlite", s.llm_db_path
    if not src.exists():
        print("no finn.sqlite to export — run ingest/classify/enrich/build_research first")
        return 1
    SEED.mkdir(exist_ok=True)
    out = SEED / "finn.sqlite"
    shutil.copy2(src, out)
    con = sqlite3.connect(out)
    con.execute("DROP TABLE IF EXISTS doc_pages")          # transcript/AR page text: 10s of MB, only needed to BUILD research
    con.commit()
    con.execute("VACUUM")
    n = {t: con.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
         for t in ("filings", "classifications", "enrichments", "bars", "research_cache", "documents")
         if con.execute("SELECT 1 FROM sqlite_master WHERE name=?", (t,)).fetchone()}
    con.close()
    msg = f"seed/finn.sqlite {out.stat().st_size / 1e6:.1f} MB {n}"
    if llm.exists():
        lout = SEED / "llm.sqlite"
        shutil.copy2(llm, lout)
        c = sqlite3.connect(lout)
        c.execute("DELETE FROM cooldowns")                  # never ship 'daily quota used up' skips to production
        c.commit()
        c.execute("VACUUM")
        calls = c.execute("SELECT COUNT(*) FROM ledger WHERE cached=0 AND ok=1").fetchone()[0]
        c.close()
        msg += f"; seed/llm.sqlite {lout.stat().st_size / 1e6:.1f} MB ({calls} measured LLM calls in the ledger)"
    print(msg)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
