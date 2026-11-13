"""The set of companies FINN tracks, from data/portfolio.json:

  portfolio : the investor's holdings. Drives the Today digest, alerts and "Needs you".
  watchlist : tracked but NOT held. Shown only under the Watchlist toggle (company list + each company's headlines);
              never in the ranked digest and never raises alerts.

Everything that needs "which stocks" asks this module instead of reading the JSON itself.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache

from app.settings import REPO_ROOT


@dataclass(frozen=True)
class Company:
    symbol: str
    bse_code: str
    name: str
    sector: str | None
    in_portfolio: bool


@lru_cache
def _raw() -> dict:
    return json.loads((REPO_ROOT / "data" / "portfolio.json").read_text("utf-8"))


def clear_cache() -> None:
    _raw.cache_clear()


def _rows(key: str, in_portfolio: bool) -> list[Company]:
    return [Company(s["nse_symbol"], s["bse_scrip_code"], s["name"], s.get("sector"), in_portfolio)
            for s in _raw().get(key, [])]


def portfolio() -> list[Company]:
    return _rows("portfolio", True)


def watchlist() -> list[Company]:
    """Watchlist-only stocks (anything also held is treated as portfolio)."""
    held = {c.symbol for c in portfolio()}
    return [c for c in _rows("watchlist", False) if c.symbol not in held]


def universe() -> list[Company]:
    """Portfolio first, then the watchlist."""
    return portfolio() + watchlist()


def portfolio_symbols() -> set[str]:
    return {c.symbol for c in portfolio()}


def all_symbols() -> list[str]:
    return [c.symbol for c in universe()]


def sectors() -> dict[str, str | None]:
    return {c.symbol: c.sector for c in universe()}


def as_rows() -> list[tuple[str, str, str | None, bool]]:
    """(symbol, name, sector, in_portfolio): the shape pipeline.digest.build_company_list takes."""
    return [(c.symbol, c.name, c.sector, c.in_portfolio) for c in universe()]
