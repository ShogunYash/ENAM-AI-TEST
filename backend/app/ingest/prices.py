"""End-of-day price & volume via yfinance (.NS tickers). One batched download for the whole portfolio.

Yahoo throttles by IP: never call per ticker; on empty/429 keep serving the bars already stored.
"""
from __future__ import annotations

import math

from app import db
from app import models as m
from app.signals.eod import Bar, compute_snapshot


def fetch_bars(symbols: list[str], period: str = "3mo") -> dict[str, list[Bar]]:
    import pandas as pd
    import yfinance as yf

    tickers = [f"{s}.NS" for s in symbols]
    df = yf.download(tickers=tickers, period=period, interval="1d", group_by="ticker",
                     auto_adjust=False, threads=False, progress=False)
    out: dict[str, list[Bar]] = {}
    if df is None or df.empty:
        return out
    for sym, tkr in zip(symbols, tickers):
        sub = df[tkr] if isinstance(df.columns, pd.MultiIndex) and tkr in df.columns.get_level_values(0) else None
        if sub is None:
            continue
        bars = []
        for ts, row in sub.dropna(subset=["Close"]).iterrows():
            vol = row.get("Volume")
            bars.append(Bar(ts.strftime("%Y-%m-%d"), float(row["Close"]),
                            0 if vol is None or (isinstance(vol, float) and math.isnan(vol)) else int(vol)))
        if bars:
            out[sym] = bars
    return out


def store_bars(bars: dict[str, list[Bar]]) -> int:
    rows = [(sym, b.day, b.close, b.volume) for sym, bs in bars.items() for b in bs]
    with db.connect() as con:
        con.executemany("INSERT OR REPLACE INTO bars (symbol,day,close,volume) VALUES (?,?,?,?)", rows)
    return len(rows)


def load_bars(symbol: str) -> list[Bar]:
    with db.connect() as con:
        return [Bar(r["day"], r["close"], r["volume"]) for r in
                con.execute("SELECT day,close,volume FROM bars WHERE symbol=? ORDER BY day", (symbol,))]


def snapshots(symbols: list[str]) -> list[m.PriceSnapshot]:
    return [s for s in (compute_snapshot(sym, load_bars(sym)) for sym in symbols) if s]
