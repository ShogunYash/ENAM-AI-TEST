"""Live source checks for GET /debug/sources: the cloud-IP test. Run it from the deployed server (Render): it answers
whether BSE, screener.in and Yahoo accept requests from THAT network. Cheap by design (3 requests, no LLM calls, so it
never spends free-tier quota)."""
from __future__ import annotations

import time
from datetime import date, datetime, timedelta

import httpx

from app import models as m
from app.ingest import bse, prices
from app.signals.eod import IST


def _timed(name: str, fn) -> m.SourceCheck:
    t0 = time.time()
    try:
        detail = fn()
        return m.SourceCheck(name=name, ok=True, detail=f"{detail} ({time.time() - t0:.1f}s)")
    except Exception as e:  # noqa: BLE001 - every failure mode is a useful answer here
        return m.SourceCheck(name=name, ok=False, detail=f"{type(e).__name__}: {str(e)[:140]}")


def _bse() -> str:
    client = bse.BseClient(min_interval=0, retries=1)
    try:
        rows = client.fetch("532540", date.today() - timedelta(days=14), date.today())
    finally:
        client.close()
    if not rows:
        raise RuntimeError("0 filings for TCS in 14 days (blocked or empty)")
    return f"{len(rows)} TCS filings"


def _screener() -> str:
    r = httpx.get("https://www.screener.in/company/TCS/consolidated/", follow_redirects=True, timeout=20,
                  headers={"User-Agent": bse.HEADERS["User-Agent"]})
    if r.status_code != 200 or 'id="quarters"' not in r.text:
        raise RuntimeError(f"HTTP {r.status_code}, no quarterly table")
    return f"HTTP 200, {len(r.text) // 1000} KB, quarterly table present"


def _yfinance() -> str:
    bars = prices.fetch_bars(["TCS"], period="5d")
    if not bars.get("TCS"):
        raise RuntimeError("no bars returned (throttled or blocked)")
    return f"{len(bars['TCS'])} days of TCS.NS"


def check_sources() -> m.SourcesReport:
    return m.SourcesReport(checked_at=datetime.now(IST), checks=[
        _timed("bse", _bse), _timed("screener", _screener), _timed("yfinance", _yfinance)])
