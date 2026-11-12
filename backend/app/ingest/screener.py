"""screener.in company pages: standardised quarterly table (used to cross-check results) and, in C1, doc links.

Polite: one page per symbol, HTML cached on disk for 12 h, >= 2 s between live requests. Only /company/<SYM>/ pages
are fetched (robots.txt allows these; /company/source/quarter/* and query-string URLs are disallowed).
"""
from __future__ import annotations

import re
import time
from datetime import datetime

import httpx
from selectolax.lexbor import LexborHTMLParser

from app.settings import get_settings

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
      "Chrome/124.0.0.0 Safari/537.36")
CACHE_TTL_S = 12 * 3600
MIN_INTERVAL_S = 2.0
_last_request = 0.0
_MONTHS = {m: i for i, m in enumerate(
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], 1)}

# screener row label -> our key (first match wins; banks use different labels)
ROW_KEYS = [
    ("sales", r"^(sales|revenue)$"), ("operating_profit", r"^(operating profit|financing profit)$"),
    ("other_income", r"^other income$"), ("interest", r"^interest$"), ("depreciation", r"^depreciation$"),
    ("pbt", r"^profit before tax$"), ("net_profit", r"^net profit$"),
]


class ScreenerError(RuntimeError):
    pass


def parse_num(text: str) -> float | None:
    t = (text or "").replace(",", "").replace("\xa0", "").strip()
    if t in ("", "-", "—"):
        return None
    try:
        return float(t.rstrip("%"))
    except ValueError:
        return None


def parse_quarters(html: str) -> dict[str, dict[str, float | None]]:
    """-> {"2026-09": {"sales": 73188.0, "operating_profit": ..., "pbt": ..., "net_profit": ...}, ...}"""
    sec = LexborHTMLParser(html).css_first("section#quarters")
    table = sec.css_first("table") if sec else None
    if not table:
        raise ScreenerError("no quarterly table on page")
    months: list[str | None] = []
    for th in table.css("thead th")[1:]:
        m = re.match(r"([A-Z][a-z]{2})\s+(\d{4})", th.text(strip=True))
        months.append(f"{m.group(2)}-{_MONTHS[m.group(1)]:02d}" if m and m.group(1) in _MONTHS else None)
    out: dict[str, dict[str, float | None]] = {k: {} for k in months if k}
    for tr in table.css("tbody tr"):
        tds = tr.css("td")
        if len(tds) < 2:
            continue
        label = re.sub(r"[\s\xa0+]+$", "", tds[0].text(strip=True).replace("\xa0", " ")).strip().lower()
        key = next((k for k, pat in ROW_KEYS if re.match(pat, label)), None)
        if not key:
            continue
        for month, td in zip(months, tds[1:]):
            if month:
                out[month][key] = parse_num(td.text(strip=True))
    return out


def fetch_quarters(symbol: str, consolidated: bool = True, client: httpx.Client | None = None) -> dict:
    """Quarterly table for a symbol (cached). Raises ScreenerError if unavailable."""
    global _last_request
    cache = get_settings().finn_data_dir / "raw" / "screener"
    cache.mkdir(parents=True, exist_ok=True)
    path = cache / f"{symbol}_{'c' if consolidated else 's'}.html"
    if path.exists() and time.time() - path.stat().st_mtime < CACHE_TTL_S:
        return parse_quarters(path.read_text("utf-8"))
    own = client is None
    client = client or httpx.Client(headers={"User-Agent": UA, "Accept": "text/html"}, timeout=30, follow_redirects=True)
    try:
        wait = MIN_INTERVAL_S - (time.monotonic() - _last_request)
        if wait > 0:
            time.sleep(wait)
        _last_request = time.monotonic()
        r = client.get(f"https://www.screener.in/company/{symbol}/{'consolidated/' if consolidated else ''}")
        if r.status_code != 200:
            raise ScreenerError(f"{symbol}: HTTP {r.status_code}")
        path.write_text(r.text, "utf-8")
        return parse_quarters(r.text)
    except httpx.TransportError as e:
        raise ScreenerError(f"{symbol}: {type(e).__name__}") from e
    finally:
        if own:
            client.close()


def quarter_key(date_iso: str) -> str:
    """'2026-09-30' -> '2026-09' (screener column key)."""
    return datetime.fromisoformat(date_iso).strftime("%Y-%m")
