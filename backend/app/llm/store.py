"""SQLite response cache + call ledger + counters (one file: <data_dir>/cache/llm.sqlite).

- cache:   key -> validated JSON output. The key is model-independent (the answer is valid whichever
           model produced it) and includes the prompt version, rendered prompt and cache_key_extra.
- ledger:  one row per attempt / cache hit; feeds /stats/llm and the in-app Cost panel.
- counters: named counters, e.g. `grounding_dropped`.
D1 note: commit this file (or a copy) with the demo snapshot so Render starts warm.
"""
from __future__ import annotations

import sqlite3
import time
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path

from app import models as m

IST = timezone(timedelta(hours=5, minutes=30))

_SCHEMA = """
CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, output TEXT NOT NULL, model TEXT, created_at REAL);
CREATE TABLE IF NOT EXISTS ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT, ts REAL, feature TEXT, task TEXT, unit TEXT,
  provider TEXT, model TEXT, tokens_in INTEGER, tokens_out INTEGER,
  cached INTEGER, ok INTEGER, latency_ms INTEGER, error TEXT);
CREATE TABLE IF NOT EXISTS cooldowns (provider TEXT, model TEXT, until REAL, reason TEXT, PRIMARY KEY (provider, model));
CREATE TABLE IF NOT EXISTS counters (name TEXT PRIMARY KEY, value INTEGER NOT NULL DEFAULT 0);
"""


@contextmanager
def _db(path: Path) -> Iterator[sqlite3.Connection]:
    con = sqlite3.connect(path, timeout=10)
    con.row_factory = sqlite3.Row
    try:
        con.executescript(_SCHEMA)
        yield con
        con.commit()
    finally:
        con.close()


def cache_get(path: Path, key: str) -> tuple[str, str | None] | None:
    with _db(path) as con:
        row = con.execute("SELECT output, model FROM cache WHERE key=?", (key,)).fetchone()
    return (row["output"], row["model"]) if row else None


def cache_put(path: Path, key: str, output: str, model: str) -> None:
    with _db(path) as con:
        con.execute("INSERT OR REPLACE INTO cache VALUES (?,?,?,?)", (key, output, model, time.time()))


def record(path: Path, *, feature: str, task: str, unit: str | None, provider: str | None, model: str | None,
           tokens_in: int = 0, tokens_out: int = 0, cached: bool = False, ok: bool = True,
           latency_ms: int = 0, error: str | None = None) -> None:
    with _db(path) as con:
        con.execute(
            "INSERT INTO ledger (ts,feature,task,unit,provider,model,tokens_in,tokens_out,cached,ok,latency_ms,error)"
            " VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            (time.time(), feature, task, unit, provider, model, tokens_in, tokens_out, int(cached), int(ok),
             latency_ms, error),
        )


def cooldown_set(path: Path, provider: str, model: str, seconds: float, reason: str) -> None:
    """Persist a long cooldown (e.g. a daily free-tier quota) so every process (API server, scripts) skips the model."""
    with _db(path) as con:
        con.execute("INSERT OR REPLACE INTO cooldowns VALUES (?,?,?,?)", (provider, model, time.time() + seconds, reason))


def cooldown_until(path: Path, provider: str, model: str) -> tuple[float, str] | None:
    with _db(path) as con:
        row = con.execute("SELECT until, reason FROM cooldowns WHERE provider=? AND model=?", (provider, model)).fetchone()
    return (row["until"], row["reason"]) if row and row["until"] > time.time() else None


def incr(path: Path, name: str, by: int = 1) -> None:
    with _db(path) as con:
        con.execute("INSERT INTO counters VALUES (?,?) ON CONFLICT(name) DO UPDATE SET value=value+?",
                    (name, by, by))


def has_rows(path: Path) -> bool:
    with _db(path) as con:
        return con.execute("SELECT 1 FROM ledger LIMIT 1").fetchone() is not None


def stats(path: Path) -> m.LlmStats:
    """Aggregate the ledger into the API's LlmStats shape. `calls` = successful non-cached LLM calls."""
    with _db(path) as con:
        def rows(group_col: str) -> list[m.LedgerRow]:
            q = f"""SELECT {group_col} AS k,
                           SUM(CASE WHEN cached=0 AND ok=1 THEN 1 ELSE 0 END) AS calls,
                           SUM(CASE WHEN cached=0 AND ok=1 THEN tokens_in ELSE 0 END) AS ti,
                           SUM(CASE WHEN cached=0 AND ok=1 THEN tokens_out ELSE 0 END) AS tout,
                           SUM(CASE WHEN cached=1 THEN 1 ELSE 0 END) AS hits
                    FROM ledger WHERE {group_col} IS NOT NULL GROUP BY {group_col} ORDER BY calls DESC"""
            return [m.LedgerRow(key=r["k"], calls=r["calls"], tokens_in=r["ti"], tokens_out=r["tout"],
                                cache_hits=r["hits"]) for r in con.execute(q)]

        by_feature, by_model = rows("feature"), _merge_models(rows("model"))
        calls = sum(r.calls for r in by_feature)
        hits = sum(r.cache_hits for r in by_feature)
        totals = m.LlmTotals(
            calls=calls, tokens_in=sum(r.tokens_in for r in by_feature),
            tokens_out=sum(r.tokens_out for r in by_feature), cache_hits=hits,
            cache_hit_pct=round(100 * hits / (calls + hits), 1) if calls + hits else 0.0, spend_inr=0.0)
        per_unit = con.execute(
            "SELECT unit, COUNT(*) AS n FROM ledger WHERE cached=0 AND ok=1 AND unit IS NOT NULL "
            "AND feature LIKE 'pull.%' GROUP BY unit").fetchall()
        avg = round(sum(r["n"] for r in per_unit) / len(per_unit), 1) if per_unit else None
        dropped = con.execute("SELECT value FROM counters WHERE name='grounding_dropped'").fetchone()
    return m.LlmStats(as_of=datetime.now(IST), totals=totals, by_feature=by_feature, by_model=by_model,
                      avg_calls_new_ticker=avg, grounding_dropped=dropped["value"] if dropped else 0)


_PROVIDER_PREFIXES = ("gemini/", "groq/", "local/", "openrouter/")


def _merge_models(rows: list[m.LedgerRow]) -> list[m.LedgerRow]:
    """Live calls log the bare model id, cache hits log 'provider/model'. Merge both spellings into one row per model."""
    merged: dict[str, m.LedgerRow] = {}
    for r in rows:
        key = next((r.key[len(p):] for p in _PROVIDER_PREFIXES if r.key.startswith(p)), r.key)
        cur = merged.get(key)
        merged[key] = r.model_copy(update={"key": key}) if cur is None else cur.model_copy(update={
            "calls": cur.calls + r.calls, "tokens_in": cur.tokens_in + r.tokens_in,
            "tokens_out": cur.tokens_out + r.tokens_out, "cache_hits": cur.cache_hits + r.cache_hits})
    return sorted(merged.values(), key=lambda x: -x.calls)
