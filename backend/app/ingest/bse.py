"""BSE corporate announcements (the Push source). See .claude/skills/finn-data-sources/SKILL.md.

Polite by design: one request per `min_interval` seconds, incremental windows, retries with backoff.
NSE is deliberately not used (Akamai blocks cloud IPs; BSE carries the same filings).
"""
from __future__ import annotations

import json
import re
import time
from datetime import date, datetime, timedelta, timezone
from typing import Any

import httpx

from app import db

IST = timezone(timedelta(hours=5, minutes=30))
API = "https://api.bseindia.com/BseIndiaAPI/api/AnnSubCategoryGetData/w"
PDF_FOLDERS = ("AttachLive", "AttachHis")
MAX_PAGES = 30
HEADERS = {
    "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
                   "Chrome/124.0.0.0 Safari/537.36"),
    "Referer": "https://www.bseindia.com/",
    "Origin": "https://www.bseindia.com",
    "Accept": "application/json, text/plain, */*",
    "Sec-Fetch-Site": "same-site",
}


class BseError(RuntimeError):
    pass


def _s(v: Any) -> str:
    """BSE returns null for many text fields; normalise to a whitespace-collapsed string."""
    return re.sub(r"\s+", " ", v).strip() if isinstance(v, str) else ""


def parse_time(row: dict) -> datetime | None:
    for key in ("DissemDT", "NEWS_DT", "DT_TM"):
        raw = _s(row.get(key))
        if raw:
            try:
                return datetime.fromisoformat(raw).replace(tzinfo=IST)
            except ValueError:
                continue
    return None


def pdf_url(name: str, folder: str = "AttachLive") -> str:
    return f"https://www.bseindia.com/xml-data/corpfiling/{folder}/{name}"


def pdf_link(name: str, age: timedelta) -> str | None:
    """Link without any HTTP call. Fresh filings exist only under AttachLive; from ~2 days on AttachHis always
    works (verified in B1), so use it for anything older."""
    if not name:
        return None
    return pdf_url(name, "AttachLive" if age < timedelta(days=2.5) else "AttachHis")


def to_record(row: dict, symbol: str, scrip_code: str) -> dict | None:
    """Raw BSE row -> filings-table record. Rows with no id or time are dropped."""
    fid, filed = _s(row.get("NEWSID")), parse_time(row)
    if not fid or not filed:
        return None
    return {
        "id": fid, "symbol": symbol, "scrip_code": scrip_code, "company_name": _s(row.get("SLONGNAME")),
        "filed_at": filed.isoformat(), "category_name": _s(row.get("CATEGORYNAME")),
        "subcategory": _s(row.get("SUBCATNAME")), "headline": _s(row.get("HEADLINE")),
        "newssub": _s(row.get("NEWSSUB")), "pdf_name": _s(row.get("ATTACHMENTNAME")),
        "quarter_id": _s(row.get("QUARTER_ID")), "raw": json.dumps(row, ensure_ascii=False),
    }


class BseClient:
    def __init__(self, client: httpx.Client | None = None, min_interval: float = 1.0, retries: int = 3):
        self.client = client or httpx.Client(headers=HEADERS, timeout=30, follow_redirects=True)
        self.min_interval, self.retries, self._last = min_interval, retries, 0.0

    def _get(self, params: dict) -> dict:
        wait = self.min_interval - (time.monotonic() - self._last)
        if wait > 0:
            time.sleep(wait)
        err = "unknown"
        for attempt in range(self.retries):
            self._last = time.monotonic()
            try:
                r = self.client.get(API, params=params)
                if r.status_code == 200 and "json" in r.headers.get("content-type", "").lower():
                    return r.json()
                err = f"HTTP {r.status_code} {r.headers.get('content-type')}"
            except (httpx.TransportError, ValueError) as e:
                err = type(e).__name__
            if attempt < self.retries - 1:
                time.sleep(2 ** (attempt + 1) if self.min_interval else 0)
        raise BseError(f"BSE request failed after {self.retries} tries: {err}")

    def fetch(self, scrip_code: str, start: date, end: date) -> list[dict]:
        """All announcements for one scrip in [start, end], following pagination (ROWCNT)."""
        rows: list[dict] = []
        for page in range(1, MAX_PAGES + 1):
            data = self._get({
                "pageno": page, "strCat": -1, "subcategory": -1, "strSearch": "P", "strType": "C",
                "strScrip": scrip_code, "strPrevDate": start.strftime("%Y%m%d"), "strToDate": end.strftime("%Y%m%d"),
            })
            table = data.get("Table") or []
            rows += table
            total = int(((data.get("Table1") or [{}])[0]).get("ROWCNT") or 0)
            if not table or len(rows) >= total:
                break
        return rows

    def close(self) -> None:
        self.client.close()


def last_filed(symbol: str) -> datetime | None:
    with db.connect() as con:
        r = con.execute("SELECT MAX(filed_at) AS m FROM filings WHERE symbol=?", (symbol,)).fetchone()
    return datetime.fromisoformat(r["m"]) if r and r["m"] else None


def ingest_symbol(bse: BseClient, symbol: str, scrip_code: str, days: int = 60,
                  today: date | None = None) -> tuple[int, int]:
    """Fetch and upsert one stock. Incremental: restarts 1 day before the newest stored filing.
    Returns (fetched, new)."""
    today = today or datetime.now(IST).date()
    last = last_filed(symbol)
    start = (last.date() - timedelta(days=1)) if last else today - timedelta(days=days)
    start = max(start, today - timedelta(days=days))
    rows = bse.fetch(scrip_code, start, today)
    recs = [r for r in (to_record(x, symbol, scrip_code) for x in rows) if r]
    now = datetime.now(IST).isoformat()
    with db.connect() as con:
        before = con.execute("SELECT COUNT(*) FROM filings WHERE symbol=?", (symbol,)).fetchone()[0]
        con.executemany(
            "INSERT INTO filings (id,symbol,scrip_code,company_name,filed_at,category_name,subcategory,headline,"
            "newssub,pdf_name,quarter_id,raw,ingested_at) VALUES (:id,:symbol,:scrip_code,:company_name,:filed_at,"
            ":category_name,:subcategory,:headline,:newssub,:pdf_name,:quarter_id,:raw,:ingested_at) "
            "ON CONFLICT(id) DO UPDATE SET headline=excluded.headline, subcategory=excluded.subcategory, "
            "category_name=excluded.category_name, pdf_name=excluded.pdf_name, ingested_at=excluded.ingested_at",
            [{**r, "ingested_at": now} for r in recs])
        after = con.execute("SELECT COUNT(*) FROM filings WHERE symbol=?", (symbol,)).fetchone()[0]
    return len(recs), after - before
