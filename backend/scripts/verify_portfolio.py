"""A4b: assert every BSE scrip code in data/portfolio.json belongs to the named company.

  uv run python -m scripts.verify_portfolio
Calls BSE once per stock (1 req/s) over the last 120 days and compares SLONGNAME with the name.
"""
from __future__ import annotations

import json
import re
import sys
import time
from datetime import date, timedelta
from difflib import SequenceMatcher
from pathlib import Path

import httpx

PORTFOLIO = Path(__file__).resolve().parents[2] / "data" / "portfolio.json"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
      "Chrome/124.0.0.0 Safari/537.36")
HEADERS = {"User-Agent": UA, "Referer": "https://www.bseindia.com/", "Origin": "https://www.bseindia.com",
           "Accept": "application/json, text/plain, */*", "Sec-Fetch-Site": "same-site"}
URL = "https://api.bseindia.com/BseIndiaAPI/api/AnnSubCategoryGetData/w"


def norm(s: str) -> str:
    s = s.lower().replace("&", "and")
    s = re.sub(r"\b(ltd|limited|pvt|private|the|company|co|industries|inds)\b", " ", s)
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def similar(a: str, b: str) -> float:
    return SequenceMatcher(None, norm(a), norm(b)).ratio()


def main() -> int:
    data = json.loads(PORTFOLIO.read_text("utf-8"))
    today = date.today()
    params = {"pageno": 1, "strCat": -1, "subcategory": -1, "strSearch": "P", "strType": "C",
              "strPrevDate": (today - timedelta(days=120)).strftime("%Y%m%d"),
              "strToDate": today.strftime("%Y%m%d")}
    bad = 0
    with httpx.Client(headers=HEADERS, timeout=30, follow_redirects=True) as c:
        for s in data["portfolio"]:
            sym, code, name = s["nse_symbol"], s["bse_scrip_code"], s["name"]
            try:
                r = c.get(URL, params={**params, "strScrip": code})
                rows = r.json().get("Table", [])
            except Exception as e:  # noqa: BLE001
                bad += 1
                print(f"[FAIL] {sym:<11} {code}: {e!r}")
                continue
            if not rows:
                print(f"[WARN] {sym:<11} {code}: no filings in 120 days — cannot verify")
            else:
                bse_name = rows[0]["SLONGNAME"]
                score = similar(name, bse_name)
                ok = score >= 0.6
                bad += not ok
                print(f"[{'ok' if ok else 'FAIL'}]   {sym:<11} {code}: BSE says {bse_name!r} vs {name!r} (sim {score:.2f})")
            time.sleep(1)
    known = {s["nse_symbol"] for s in data["portfolio"]}
    with httpx.Client(headers=HEADERS, timeout=30, follow_redirects=True) as c:
        for r_ in data.get("research", []):  # research names outside the portfolio carry their own BSE code
            if r_["nse_symbol"] in known or "bse_scrip_code" not in r_:
                continue
            try:
                rows = c.get(URL, params={**params, "strScrip": r_["bse_scrip_code"]}).json().get("Table", [])
                bse_name = rows[0]["SLONGNAME"] if rows else None
            except Exception as e:  # noqa: BLE001
                bse_name = None
                print(f"[FAIL] research {r_['nse_symbol']}: {e!r}")
            bad += bse_name is None
            print(f"[{'ok' if bse_name else 'FAIL'}]   research {r_['nse_symbol']:<9} {r_['bse_scrip_code']}: BSE says {bse_name!r}")
            time.sleep(1)
    research = {r["nse_symbol"] for r in data.get("research", [])}
    print(f"\nportfolio={len(data['portfolio'])} research={sorted(research)} "
          f"research-not-in-portfolio={sorted(research - known)}")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
