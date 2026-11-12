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


def fetch_page(symbol: str, consolidated: bool = True, client: httpx.Client | None = None) -> tuple[str, bool]:
    """Company page HTML (cached 12 h) -> (html, is_consolidated). Falls back to the standalone page when the company
    has no consolidated statements. Raises ScreenerError if the symbol is unknown or the site is unreachable."""
    global _last_request
    symbol = symbol.strip().upper()
    cache = get_settings().finn_data_dir / "raw" / "screener"
    cache.mkdir(parents=True, exist_ok=True)
    for cons in ([True, False] if consolidated else [False]):
        path = cache / f"{symbol}_{'c' if cons else 's'}.html"
        if path.exists() and time.time() - path.stat().st_mtime < CACHE_TTL_S:
            return path.read_text("utf-8"), cons
        own = client is None
        c = client or httpx.Client(headers={"User-Agent": UA, "Accept": "text/html"}, timeout=30, follow_redirects=True)
        try:
            wait = MIN_INTERVAL_S - (time.monotonic() - _last_request)
            if wait > 0:
                time.sleep(wait)
            _last_request = time.monotonic()
            r = c.get(f"https://www.screener.in/company/{symbol}/{'consolidated/' if cons else ''}")
        except httpx.TransportError as e:
            raise ScreenerError(f"{symbol}: {type(e).__name__}") from e
        finally:
            if own:
                c.close()
        if r.status_code == 200 and 'id="quarters"' in r.text:
            path.write_text(r.text, "utf-8")
            return r.text, cons
        if r.status_code not in (200, 404, 302):
            raise ScreenerError(f"{symbol}: HTTP {r.status_code}")
    raise ScreenerError(f"{symbol}: company not found on screener.in")


def fetch_quarters(symbol: str, consolidated: bool = True, client: httpx.Client | None = None) -> dict:
    """Quarterly table for a symbol (cached). Raises ScreenerError if unavailable."""
    html, _ = fetch_page(symbol, consolidated, client)
    return parse_quarters(html)


# ───────────────────────── generic tables + documents (C1) ─────────────────────────
def _clean_label(s: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[ +]+", " ", s)).strip().rstrip("+ ").strip().lower()


def parse_table(html: str, section_id: str) -> tuple[list[str], dict[str, list[float | None]]]:
    """Any screener section table -> (column headers e.g. ['Mar 2024', ..., 'TTM'], {lower-case label: values})."""
    sec = LexborHTMLParser(html).css_first(f"section#{section_id}")
    table = sec.css_first("table") if sec else None
    if not table:
        raise ScreenerError(f"no table in section #{section_id}")
    headers = [th.text(strip=True) for th in table.css("thead th")][1:]
    rows: dict[str, list[float | None]] = {}
    for tr in table.css("tbody tr"):
        tds = tr.css("td")
        if len(tds) < 2:
            continue
        label = _clean_label(tds[0].text(strip=True))
        rows.setdefault(label, [parse_num(td.text(strip=True)) for td in tds[1:]])
    return headers, rows


def parse_company_name(html: str) -> str | None:
    h1 = LexborHTMLParser(html).css_first("h1")
    return h1.text(strip=True) if h1 else None


def call_quarter_end(label: str) -> str | None:
    """Concall month label -> quarter-end date it discusses ('Oct 2026' -> '2026-09-30'): calls are held 1-2 months
    after the quarter closes (Jan/Feb -> Dec qtr, Apr/May -> Mar, Jul/Aug -> Jun, Oct/Nov -> Sep)."""
    m = re.match(r"([A-Z][a-z]{2})\s+(\d{4})", label.strip())
    if not m or m.group(1) not in _MONTHS:
        return None
    month, year = _MONTHS[m.group(1)], int(m.group(2))
    end_month = {1: 12, 2: 12, 3: 12, 4: 3, 5: 3, 6: 3, 7: 6, 8: 6, 9: 6, 10: 9, 11: 9, 12: 9}[month]
    end_year = year - 1 if month <= 3 and end_month == 12 else year
    day = {3: 31, 6: 30, 9: 30, 12: 31}[end_month]
    return f"{end_year}-{end_month:02d}-{day}"


def parse_documents(html: str) -> dict:
    """-> {"concalls": [{"label","quarter_end","transcript","ppt","recording"}...] newest first,
           "annual_reports": [{"year": 2026, "url": ...}...] newest first}. Links are absolute URLs."""
    sec = LexborHTMLParser(html).css_first("section#documents")
    out: dict = {"concalls": [], "annual_reports": []}
    if not sec:
        return out
    for li in sec.css("div.concalls li"):
        label = re.match(r"\s*([A-Z][a-z]{2}\s+\d{4})", li.text(strip=True))
        links = {a.text(strip=True).lower(): a.attributes.get("href", "") for a in li.css("a")}
        if not label or not links.get("transcript"):
            continue
        out["concalls"].append({"label": label.group(1), "quarter_end": call_quarter_end(label.group(1)),
                                "transcript": links["transcript"], "ppt": links.get("ppt"), "recording": links.get("rec")})
    for a in sec.css("div.annual-reports li a"):
        m = re.search(r"Annual Report (\d{4})", a.text(strip=True))
        if m and a.attributes.get("href"):
            out["annual_reports"].append({"year": int(m.group(1)), "url": a.attributes["href"]})
    return out


def quarter_key(date_iso: str) -> str:
    """'2026-09-30' -> '2026-09' (screener column key)."""
    return datetime.fromisoformat(date_iso).strftime("%Y-%m")
