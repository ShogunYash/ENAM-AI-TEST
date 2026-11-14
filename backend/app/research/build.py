"""Research builder: any NSE symbol -> models.Research, built from primary documents only.

  screener.in page -> snapshot (tables, no LLM) | transcripts -> guidance (T2) -> promised-vs-delivered (T3)

Builds run in a background thread (the API returns status "building" with human-readable progress and the client polls).
The finished Research JSON is cached forever in SQLite, so a symbol is built once; pre-built names are served instantly.
"""
from __future__ import annotations

import json
import threading
from datetime import datetime
from pathlib import Path

from app import db
from app import models as m
from app.ingest import screener
from app.research import guidance, loader, pvd, snapshot
from app.signals.eod import IST

_SCHEMA_DONE = False
_lock = threading.Lock()
_running: dict[str, list[str]] = {}          # symbol -> progress messages of an in-flight build
_partial: dict[str, m.Research] = {}         # symbol -> the report so far (snapshot, sources, judged promises) while building
LIVE_CONCALLS = 4                            # the brief asks for the last 4 quarters; 4 calls also build faster than 5


def _ensure_table() -> None:
    global _SCHEMA_DONE
    with db.connect() as con:
        con.execute("CREATE TABLE IF NOT EXISTS research_cache (symbol TEXT PRIMARY KEY, payload TEXT NOT NULL, "
                    "generated_at TEXT)")
    _SCHEMA_DONE = True


REVIEW_FILE = Path(__file__).resolve().parents[2] / "config" / "research_review.json"


def apply_review(r: m.Research, review: dict | None = None) -> m.Research:
    """Withhold the items a second-reader audit found unsupported (config/research_review.json) and say so in `gaps`.
    Withholding never rewrites a verdict or quote: fewer, defensible claims beat more, doubtful ones."""
    if review is None:
        review = json.loads(REVIEW_FILE.read_text("utf-8")) if REVIEW_FILE.exists() else {}
    rules = review.get(r.symbol, [])
    if not rules:
        return r
    keep, dropped = [], []
    for p in r.pvd:
        hit = next((x for x in rules if x["said_in"] == p.said_in and x["metric"].lower() in p.metric.lower()), None)
        (dropped if hit else keep).append(p)
    if not dropped:
        return r
    gap = f"{len(dropped)} item(s) withheld after analyst review: quote did not support the stated metric or verdict"
    return r.model_copy(update={"pvd": keep, "gaps": [*r.gaps, gap]})


def get_cached(symbol: str) -> m.Research | None:
    _ensure_table()
    with db.connect() as con:
        row = con.execute("SELECT payload FROM research_cache WHERE symbol=?", (symbol.upper(),)).fetchone()
    return apply_review(m.Research.model_validate(json.loads(row["payload"]))) if row else None


def save(r: m.Research) -> None:
    _ensure_table()
    with db.connect() as con:
        con.execute("INSERT OR REPLACE INTO research_cache (symbol,payload,generated_at) VALUES (?,?,?)",
                    (r.symbol, r.model_dump_json(), datetime.now(IST).isoformat()))


def in_progress(symbol: str) -> list[str] | None:
    with _lock:
        return list(_running[symbol]) if symbol in _running else None


def _llm_calls(symbol: str) -> int:
    """Non-cached successful LLM calls made for this symbol's research (read-only look at the ledger file)."""
    import sqlite3

    from app.settings import get_settings
    path = get_settings().llm_db_path
    if not path.exists():
        return 0
    con = sqlite3.connect(path)
    try:
        return con.execute("SELECT COUNT(*) FROM ledger WHERE unit=? AND cached=0 AND ok=1 AND feature LIKE 'pull.%'",
                           (symbol,)).fetchone()[0]
    except sqlite3.OperationalError:          # ledger table not created yet
        return 0
    finally:
        con.close()


def _latest_reported_quarter(html: str) -> str | None:
    try:
        headers, _ = screener.parse_table(html, "quarters")
    except screener.ScreenerError:
        return None
    last = next((h for h in reversed(headers) if h != "TTM"), None)
    if not last:
        return None
    from app.pipeline.results import fy_label
    qe = screener.call_quarter_end(f"{_next_month(last)}")          # reuse month->quarter-end mapping
    return fy_label(qe) if qe else None


def _next_month(label: str) -> str:
    """'Sep 2026' (a quarter end) -> 'Oct 2026' (the month its call is held) for call_quarter_end()."""
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    mon, year = label.split()
    i = months.index(mon) + 1
    return f"{months[i % 12]} {int(year) + (1 if i == 12 else 0)}"


def build_research(symbol: str, progress=None) -> m.Research:
    """Synchronous build. `progress(msg)` is called with user-facing step text."""
    symbol = symbol.strip().upper()
    steps: list[str] = []

    def say(msg: str) -> None:
        steps.append(msg)
        with _lock:
            if symbol in _running:
                _running[symbol] = list(steps)
        if progress:
            progress(msg)

    calls0 = _llm_calls(symbol)

    def publish(**fields) -> None:
        """Make what is finished readable now: the client polls and shows it below the progress steps."""
        with _lock:
            if symbol in _running:
                cur = _partial.get(symbol) or m.Research(
                    symbol=symbol, name=None, status="building", progress=[], generated_at=None, sources=[],
                    snapshot=None, pvd=[], extra=None, gaps=[], cost=m.ResearchCost(llm_calls=0, cached=False))
                _partial[symbol] = cur.model_copy(update=fields)

    say(f"Resolving {symbol} on screener.in")
    try:
        html, consolidated = screener.fetch_page(symbol)
    except screener.ScreenerError as e:
        return m.Research(symbol=symbol, name=None, status="failed", progress=steps, generated_at=None, sources=[],
                          snapshot=None, pvd=[], extra=None, gaps=[f"Company not found or unreachable: {e}"],
                          cost=m.ResearchCost(llm_calls=0, cached=False))
    name = screener.parse_company_name(html)
    snap = snapshot.build_snapshot(html)
    say("Loaded financial tables" + ("" if consolidated else " (standalone: no consolidated statements)"))
    publish(name=name, snapshot=snap)                                  # financials are readable within seconds

    gaps: list[str] = []
    refs, load_gaps = loader.load_company(symbol, n_concalls=LIVE_CONCALLS)
    gaps += load_gaps
    concalls = [r for r in refs if r.kind == "concall"]
    if len(concalls) < 2 and any("could not be downloaded" in g for g in gaps):
        # the host cannot reach the transcript source (e.g. BSE answers 403 to cloud IPs): say it once, plainly
        gaps = [g for g in gaps if "could not be downloaded" not in g]
        gaps.insert(0, "The financials are available, but earnings-call transcripts were unavailable on this server, "
                       "so management's guidance hasn't been assessed.")
    say(f"Found {len(concalls)} earnings-call transcript{'s' if len(concalls) != 1 else ''}")
    newest_reported = _latest_reported_quarter(html)
    if concalls and newest_reported and pvd.period_key(newest_reported) > max(pvd.period_key(r.period) for r in concalls):
        gaps.append(f"{newest_reported} earnings-call transcript not yet published; latest call covered is "
                    f"{max(concalls, key=lambda r: pvd.period_key(r.period)).period}")

    publish(gaps=list(gaps), sources=[m.SourceDoc(doc_id=r.doc_id, kind=r.kind, period=r.period, url=r.url, pages=None)
                                     for r in refs])
    items: list[m.PvDItem] = []
    if len(concalls) >= 2:
        g_items, notes = guidance.extract_all(symbol, progress=say)
        gaps += notes
        say(f"Extracted {len(g_items)} guidance statements with verified quotes")
        items = pvd.build_pvd(symbol, g_items, html, gaps, progress=say,
                              on_items=lambda got: publish(pvd=got, gaps=list(gaps)))
        say(f"Judged {len(items)} promises against later calls and reported numbers")
    else:
        gaps.append("Fewer than 2 transcripts available, so promised-vs-delivered cannot be built")

    sources = [m.SourceDoc(doc_id=r.doc_id, kind=r.kind, period=r.period, url=r.url,
                           pages=len(loader.load_pages(r.doc_id)) or None) for r in refs]
    status = "ready" if items and snap else "partial"
    return m.Research(symbol=symbol, name=name, status=status, is_sample=False, progress=steps,
                      generated_at=datetime.now(IST), sources=sources, snapshot=snap, pvd=items, extra=None,
                      gaps=gaps, cost=m.ResearchCost(llm_calls=max(0, _llm_calls(symbol) - calls0), cached=False))


def _run(symbol: str) -> None:
    try:
        r = build_research(symbol)
    except Exception as e:  # noqa: BLE001 - a background build must never crash the server
        r = m.Research(symbol=symbol, name=None, status="failed", progress=[], generated_at=None, sources=[],
                       snapshot=None, pvd=[], extra=None, gaps=[f"Build failed: {type(e).__name__}"],
                       cost=m.ResearchCost(llm_calls=0, cached=False))
    if r.status != "failed":
        save(r)                                   # failures are not cached: the next request retries
    with _lock:
        _running.pop(symbol, None)
        _partial.pop(symbol, None)
        _failed[symbol] = r if r.status == "failed" else None


_failed: dict[str, m.Research | None] = {}


def start_build(symbol: str) -> None:
    """Start a background build unless one is already running for the symbol."""
    symbol = symbol.strip().upper()
    with _lock:
        if symbol in _running:
            return
        _running[symbol] = [f"Starting research on {symbol}"]
        _failed.pop(symbol, None)
    threading.Thread(target=_run, args=(symbol,), daemon=True, name=f"research-{symbol}").start()


def status(symbol: str) -> m.Research:
    """What the API returns: the cached report, a 'building' placeholder with progress, or the last failure."""
    symbol = symbol.strip().upper()
    if (done := get_cached(symbol)) is not None:
        return done
    prog = in_progress(symbol)
    if prog is not None:
        with _lock:
            part = _partial.get(symbol)
        if part is not None:                      # what is finished so far, plus the live progress steps
            return part.model_copy(update={"progress": prog})
        return m.Research(symbol=symbol, name=None, status="building", progress=prog, generated_at=None, sources=[],
                          snapshot=None, pvd=[], extra=None, gaps=[], cost=m.ResearchCost(llm_calls=0, cached=False))
    with _lock:
        failed = _failed.get(symbol)
    if failed is not None:
        return failed
    start_build(symbol)
    return status(symbol)
