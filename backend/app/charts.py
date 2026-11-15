"""Price charts for 1D / 3D / 7D / 30D, from data we already store. No model involved.

  1d   the last trading session, 15-minute closes
  3d   the last 3 trading sessions, 15-minute closes
  7d   every session in the last 7 calendar days, 15-minute closes
  30d  daily closes over the last 30 calendar days

`change_pct` is measured against the close just BEFORE the window (the previous session's last close), the way a day
change is normally read; if there is nothing before the window it is first-to-last. When 15-minute data is missing the
chart falls back to daily closes and says so in `note` instead of pretending to have intraday detail.
"""
from __future__ import annotations

from datetime import date, timedelta

from app import models as m
from app.ingest import prices as prices_mod

SESSIONS = {"1d": 1, "3d": 3}


def _pts(rows: list[tuple[str, float]]) -> list[m.ChartPoint]:
    return [m.ChartPoint(t=t, c=round(c, 2)) for t, c in rows]


def _build(symbol: str, rng: m.ChartRange, rows: list[tuple[str, float]], base: float | None, source: str,
           note: str | None = None) -> m.PriceChart:
    if not rows:
        return m.PriceChart(symbol=symbol, range=rng, points=[], source="eod", change_pct=None, high=None, low=None,
                            as_of=None, note="No price data for this symbol yet")
    first = base if base is not None else rows[0][1]
    last = rows[-1][1]
    return m.PriceChart(symbol=symbol, range=rng, points=_pts(rows), source=source,  # type: ignore[arg-type]
                        change_pct=round((last - first) / first * 100, 2) if first else None,
                        high=round(max(c for _, c in rows), 2), low=round(min(c for _, c in rows), 2),
                        as_of=rows[-1][0], note=note)


def _daily(symbol: str, rng: m.ChartRange, note: str | None) -> m.PriceChart:
    bars = prices_mod.load_bars(symbol)
    if not bars:
        return _build(symbol, rng, [], None, "eod")
    last_day = date.fromisoformat(bars[-1].day)
    span = {"1d": 1, "3d": 3, "7d": 7, "30d": 30}[rng]
    keep = [b for b in bars if date.fromisoformat(b.day) > last_day - timedelta(days=span)] or bars[-1:]
    if rng in ("1d", "3d") and len(keep) < 2:                    # a line needs two points: include the close before
        keep = bars[-2:]
    before = [b for b in bars if b.day < keep[0].day]
    return _build(symbol, rng, [(b.day, b.close) for b in keep], before[-1].close if before else None, "eod", note)


def chart(symbol: str, rng: m.ChartRange) -> m.PriceChart:
    symbol = symbol.upper()
    if rng == "30d":
        return _daily(symbol, rng, None)
    intr = prices_mod.load_intraday(symbol)
    if not intr:
        return _daily(symbol, rng, "Daily closes only: no intraday data for this symbol")
    days = sorted({t[:10] for t, _ in intr})
    if rng in SESSIONS:
        keep_days = set(days[-SESSIONS[rng]:])
    else:                                                       # 7d: sessions within the last 7 calendar days
        cutoff = date.fromisoformat(days[-1]) - timedelta(days=6)
        keep_days = {d for d in days if date.fromisoformat(d) >= cutoff}
    rows = [(t, c) for t, c in intr if t[:10] in keep_days]
    earlier = [c for t, c in intr if t[:10] < min(keep_days)]
    return _build(symbol, rng, rows, earlier[-1] if earlier else None, "intraday",
                  "15-minute closes from Yahoo Finance (delayed), as of the last session")
