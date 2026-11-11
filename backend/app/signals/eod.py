"""End-of-day price/volume signals — pure functions, no LLM, no network.

vol_ratio = volume_today / mean(volume of the previous `lookback` sessions)   (today excluded)
pct_1d    = close_today / close_prev - 1
Alert thresholds (volume_multiple, price_move_pct) are applied in B5 (signals/alerts.py) and,
for offline use, duplicated in the frontend (docs/CONTRACT.md).
"""
from __future__ import annotations

from datetime import datetime, time, timedelta, timezone
from typing import NamedTuple

from app import models as m

IST = timezone(timedelta(hours=5, minutes=30))
MIN_HISTORY = 5  # fewer prior sessions than this → no reliable volume average


class Bar(NamedTuple):
    day: str      # YYYY-MM-DD, ascending
    close: float
    volume: int


def compute_snapshot(symbol: str, bars: list[Bar], lookback: int = 20, spark: int = 30) -> m.PriceSnapshot | None:
    bars = sorted((b for b in bars if b.close and b.close > 0), key=lambda b: b.day)
    if len(bars) < 2:
        return None
    today, prev = bars[-1], bars[-2]
    history = [b.volume for b in bars[-1 - lookback:-1] if b.volume and b.volume > 0]
    if len(history) < MIN_HISTORY:
        return None
    avg = sum(history) / len(history)
    as_of = datetime.combine(datetime.fromisoformat(today.day).date(), time(15, 30), tzinfo=IST)
    return m.PriceSnapshot(
        symbol=symbol, as_of=as_of, close=round(today.close, 2),
        pct_1d=round((today.close / prev.close - 1) * 100, 2), volume=int(today.volume),
        vol_avg_20d=round(avg, 1), vol_ratio=round(today.volume / avg, 2),
        spark_30d=[round(b.close, 2) for b in bars[-spark:]])
