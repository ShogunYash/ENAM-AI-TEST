# /// script
# requires-python = ">=3.11"
# dependencies = ["httpx", "yfinance", "selectolax"]
# ///
"""A0 feasibility smoke test: BSE announcements, screener.in, yfinance.

Run:  uv run backend/scripts/smoke_sources.py
Prints a PASS/FAIL line per source and writes raw samples to backend/data/raw/a0/.
Polite by design: 1 BSE page, 1 screener page, 1 yfinance batch, ~3 PDF HEADs.
"""
import json
import re
import sys
import time
from collections import Counter
from datetime import date, timedelta
from pathlib import Path

import httpx

OUT = Path(__file__).resolve().parents[1] / "data" / "raw" / "a0"
OUT.mkdir(parents=True, exist_ok=True)

TICKERS = {"TCS": "532540", "RELIANCE": "500325"}  # NSE symbol -> BSE scrip code
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
results: dict[str, tuple[str, str]] = {}


def record(name: str, status: str, note: str) -> None:
    results[name] = (status, note)
    print(f"[{status}] {name}: {note}")


def bse() -> None:
    headers = {
        "User-Agent": UA,
        "Referer": "https://www.bseindia.com/",
        "Origin": "https://www.bseindia.com",
        "Accept": "application/json, text/plain, */*",
        "Sec-Fetch-Site": "same-site",
    }
    url = "https://api.bseindia.com/BseIndiaAPI/api/AnnSubCategoryGetData/w"
    today = date.today()
    params = {
        "pageno": 1, "strCat": -1, "subcategory": -1, "strSearch": "P", "strType": "C",
        "strPrevDate": (today - timedelta(days=30)).strftime("%Y%m%d"),
        "strToDate": today.strftime("%Y%m%d"),
    }
    all_rows = []
    with httpx.Client(headers=headers, timeout=30, follow_redirects=True) as c:
        for sym, code in TICKERS.items():
            try:
                r = c.get(url, params={**params, "strScrip": code})
                if r.status_code != 200 or "json" not in r.headers.get("content-type", "").lower():
                    record(f"bse:{sym}", "FAIL", f"status={r.status_code} ctype={r.headers.get('content-type')} body={r.text[:120]!r}")
                    continue
                data = r.json()
                (OUT / f"bse_{sym}.json").write_text(json.dumps(data, indent=1)[:200_000], encoding="utf-8")
                rows = data.get("Table", [])
                rowcnt = (data.get("Table1") or [{}])[0].get("ROWCNT")
                all_rows += rows
                keys = sorted(rows[0].keys()) if rows else []
                record(f"bse:{sym}", "PASS" if rows else "WARN", f"{len(rows)} rows on page 1, ROWCNT={rowcnt}, keys={keys}")
            except Exception as e:  # noqa: BLE001
                record(f"bse:{sym}", "FAIL", repr(e))
            time.sleep(1)

        pairs = Counter((r.get("CATEGORYNAME"), r.get("SUBCATNAME")) for r in all_rows)
        print("  distinct (CATEGORYNAME, SUBCATNAME):")
        for (cat, sub), n in pairs.most_common(25):
            print(f"    {n:>3}  {cat!r} / {sub!r}")

        # PDF attachment URL check (AttachLive then AttachHis)
        with_att = [r for r in all_rows if r.get("ATTACHMENTNAME")][:3]
        for r in with_att:
            name = r["ATTACHMENTNAME"]
            for folder in ("AttachLive", "AttachHis"):
                u = f"https://www.bseindia.com/xml-data/corpfiling/{folder}/{name}"
                try:
                    h = c.get(u, headers={**headers, "Range": "bytes=0-1023"})
                    ok = h.status_code in (200, 206) and h.content[:4] == b"%PDF"
                    print(f"  pdf {folder}/{name[:40]}: status={h.status_code} is_pdf={ok}")
                    if ok:
                        break
                except Exception as e:  # noqa: BLE001
                    print(f"  pdf {folder}: {e!r}")
                time.sleep(0.5)
        if not with_att:
            print("  (no rows with ATTACHMENTNAME to test)")


def screener() -> None:
    from selectolax.lexbor import LexborHTMLParser as HTMLParser

    headers = {"User-Agent": UA, "Accept": "text/html"}
    sym = "TCS"
    try:
        r = httpx.get(f"https://www.screener.in/company/{sym}/consolidated/", headers=headers, timeout=30, follow_redirects=True)
        (OUT / f"screener_{sym}.html").write_text(r.text, encoding="utf-8")
        if r.status_code != 200:
            record("screener", "FAIL", f"status={r.status_code}")
            return
        tree = HTMLParser(r.text)
        sections = {s: bool(tree.css_first(f"section#{s}")) for s in
                    ["quarters", "profit-loss", "balance-sheet", "cash-flow", "ratios", "shareholding", "documents"]}
        links = [(a.text(strip=True), a.attributes.get("href", "")) for a in tree.css("section#documents a")]
        concalls = [l for l in links if re.search(r"transcript", l[0], re.IGNORECASE)]
        ars = [l for l in links if re.search(r"annual report|^\d{4}$|financial year", l[0], re.IGNORECASE)]
        pdf_links = [l for l in links if l[1].lower().endswith(".pdf") or "bseindia" in l[1] or "nseindia" in l[1]]
        status = "PASS" if all(sections.values()) and concalls else "WARN"
        record("screener", status,
               f"sections={sections}; doc links={len(links)}, transcripts={len(concalls)}, annual-report-ish={len(ars)}, pdf-ish={len(pdf_links)}")
        for l in concalls[:3]:
            print("   transcript:", l)
        for l in ars[:3]:
            print("   AR:", l)
    except Exception as e:  # noqa: BLE001
        record("screener", "FAIL", repr(e))


def prices() -> None:
    import yfinance as yf

    try:
        syms = [s + ".NS" for s in TICKERS]
        df = yf.download(tickers=syms, period="3mo", interval="1d", group_by="ticker",
                         auto_adjust=False, threads=False, progress=False)
        if df is None or df.empty:
            record("yfinance", "FAIL", "empty frame (throttled or blocked?)")
            return
        notes = []
        for s in syms:
            sub = df[s].dropna(how="all")
            notes.append(f"{s}: {len(sub)} days, last={sub.index[-1].date()} close={sub['Close'].iloc[-1]:.1f} vol={int(sub['Volume'].iloc[-1])}")
        record("yfinance", "PASS", "; ".join(notes))
    except Exception as e:  # noqa: BLE001
        record("yfinance", "FAIL", repr(e))


if __name__ == "__main__":
    print(f"Python {sys.version.split()[0]} · today {date.today()}")
    bse()
    screener()
    prices()
    print("\nSUMMARY")
    for k, (s, n) in results.items():
        print(f"  {s:<5} {k}")
    sys.exit(1 if any(s == "FAIL" for s, _ in results.values()) else 0)
