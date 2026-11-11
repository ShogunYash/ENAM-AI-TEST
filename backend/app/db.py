"""SQLite store for ingested data: <data_dir>/finn.sqlite (filings + daily bars).

The LLM cache/ledger lives in its own file (app/llm/store.py). D1 commits finn.sqlite with the demo snapshot.
Writes are idempotent upserts, so ingest can be re-run any time.
"""
from __future__ import annotations

import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

from app.settings import get_settings

_SCHEMA = """
CREATE TABLE IF NOT EXISTS filings (
  id TEXT PRIMARY KEY,              -- BSE NEWSID
  symbol TEXT NOT NULL, scrip_code TEXT NOT NULL, company_name TEXT,
  filed_at TEXT NOT NULL,           -- ISO-8601, IST
  category_name TEXT, subcategory TEXT, headline TEXT, newssub TEXT,
  pdf_name TEXT, quarter_id TEXT, raw TEXT, ingested_at TEXT);
CREATE INDEX IF NOT EXISTS idx_filings_symbol_time ON filings(symbol, filed_at);
CREATE INDEX IF NOT EXISTS idx_filings_time ON filings(filed_at);
CREATE TABLE IF NOT EXISTS bars (
  symbol TEXT NOT NULL, day TEXT NOT NULL, close REAL NOT NULL, volume INTEGER NOT NULL,
  PRIMARY KEY (symbol, day));
"""


def db_path() -> Path:
    p = get_settings().finn_data_dir / "finn.sqlite"
    p.parent.mkdir(parents=True, exist_ok=True)
    return p


@contextmanager
def connect(path: Path | None = None) -> Iterator[sqlite3.Connection]:
    con = sqlite3.connect(path or db_path(), timeout=15)
    con.row_factory = sqlite3.Row
    try:
        con.executescript(_SCHEMA)
        yield con
        con.commit()
    finally:
        con.close()
