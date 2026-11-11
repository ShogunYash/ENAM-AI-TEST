---
name: finn-data-sources
description: Reference for FINN's external data sources — BSE corporate announcements API, screener.in company pages (financial tables + annual report / concall links), yfinance EOD prices — including endpoints, headers, field names, rate-limit etiquette and caching rules. Use when writing or debugging anything in backend/ingest/, mapping filings to categories, or when a fetch returns 403/429/empty data.
---

# FINN data sources

Plumbing, not the product: make it reliable, cached and polite, then move on.

**A0 results (11 Nov 2026, from a laptop):** GitHub Actions isn't available, so the cloud-IP check happens at deploy
via `GET /debug/sources` on Render. Push ingest runs on the laptop and commits the snapshot. BSE announcements, screener.in
and yfinance all worked. Confirmed facts:
- BSE: the endpoint and headers below work. Response keys include `NEWSID, SCRIP_CD, HEADLINE, NEWSSUB, CATEGORYNAME, SUBCATNAME, ATTACHMENTNAME, DissemDT, NEWS_DT, PDFFLAG, QUARTER_ID, NSURL, AUDIO_VIDEO_FILE, Investor_Presentation, ROWCNT in Table1`. `AttachLive/<name>` served real PDFs.
- BSE categories seen: `Company Update` (subcats General, Analyst / Investor Meet, Earnings Call Transcript, Credit Rating, Newspaper Publication, Acquisition, Investor Presentation, Press Release / Media Release), `Result / Financial Results`, `Board Meeting` (Outcome of Board Meeting, Board Meeting). See taxonomy.md.
- screener.in: all 7 section ids exist (`quarters, profit-loss, balance-sheet, cash-flow, ratios, shareholding, documents`). TCS had 41 "Transcript" links and 15 annual-report-ish links. Links go to BSE `AnnPdfOpen.aspx?Pname=...` or the company's own IR site, so the downloader must handle both.
- yfinance: a batched `.NS` download worked (63 daily rows each).
- selectolax: use `from selectolax.lexbor import LexborHTMLParser` (the old parser is removed).
- Rerun `uv run backend/scripts/smoke_sources.py` any time to re-verify.

## Golden rules
1. **Cache first.** Raw responses go to `backend/data/raw/` (or SQLite) before parsing. Never fetch the same thing twice in a run.
   - Documents (PDFs) are immutable, so cache them forever, keyed by URL hash.
   - HTML/JSON listings: 24h TTL.
2. **Be polite.** At most 1 req/s to BSE and 1 req/2s to screener.in. Back off on 429/403; don't retry in a tight loop.
3. **Generic browser User-Agent.** Never put personal details (name, email) in headers.
4. **Demo can't depend on live fetches.** Ingest must run from a laptop too, and the committed snapshot is the fallback (see `finn-demo-check`).
5. **NSE is off the critical path.** Akamai blocks cloud IPs. Use BSE for filings.

## BSE corporate announcements (primary source for Push)
```
GET https://api.bseindia.com/BseIndiaAPI/api/AnnSubCategoryGetData/w
    ?pageno=1&strCat=-1&subcategory=-1&strSearch=P&strType=C
    &strPrevDate=YYYYMMDD&strToDate=YYYYMMDD&strScrip=<BSE scrip code>
Headers: User-Agent: <recent Chrome UA>
         Referer: https://www.bseindia.com/
         Origin:  https://www.bseindia.com
         Sec-Fetch-Site: same-site
         Accept: application/json
```
- **Response:** `Table` is a list of filings and `Table1[0].ROWCNT` is the total count, so page until you have collected that many.
  - Useful fields: `NEWSID`, `SCRIP_CD`, `HEADLINE`, `NEWSSUB`, `CATEGORYNAME`, `SUBCATNAME`, `ATTACHMENTNAME`, `DissemDT` / `NEWS_DT`.
- **PDF URL:** try `https://www.bseindia.com/xml-data/corpfiling/AttachLive/<ATTACHMENTNAME>` first, then fall back to `.../AttachHis/<ATTACHMENTNAME>`.
- **Scrip codes:** hard-code them in `data/portfolio.json`. For unknown symbols, look up `https://api.bseindia.com/BseIndiaAPI/api/PeerSmartSearch/w?Type=SS&text=<SYMBOL>` (returns HTML; regex out the code) and cache the result.
- **Category mapping:** see [taxonomy.md](taxonomy.md).

## screener.in (fundamentals for Pull + results cross-check)
- **URL:** `https://www.screener.in/company/<NSE_SYMBOL>/consolidated/`. If there's no consolidated data, fall back to `/company/<NSE_SYMBOL>/`.
- **No login needed for:** the quarterly results, P&L, balance sheet, cash flow, ratios and shareholding tables, plus **Documents** (annual reports, concalls with Transcript / PPT / REC links).
  - Expected section ids are `quarters`, `profit-loss`, `balance-sheet`, `cash-flow`, `ratios`, `shareholding` and `documents`. Verify them on first fetch.
  - Parse with selectolax.
- **Document links** usually point to BSE-hosted PDFs. Download via `ingest/docs.py`, extract per-page text with pymupdf, and store `{doc_id, page, text}`.
- **robots.txt:** `/company/` is allowed. **Do not** hit `/company/source/quarter/*` or URLs with `?q=`, `sort`, `limit` or `page`.
- **ToS:** "personal, non-commercial". Keep volume low and disclose this in the writeup.
- **Mapping to headline terms:** `Sales`→Revenue, `Operating Profit`→EBITDA (approx.), `Profit before tax`→PBT, `Net Profit`→PAT.

## yfinance (EOD price & volume)
- Use one batched call per run, never one call per ticker:
  `yf.download(tickers=[s + ".NS" ...], period="3mo", interval="1d", group_by="ticker", auto_adjust=False, threads=False)`
- On 429 (Yahoo throttles by IP), stop and serve the cached data. Pin a known-good yfinance version in `pyproject.toml`.
- **Signals:** compute these locally with no LLM. Thresholds come from user settings.
  - `vol_ratio = vol_t / mean(vol_{t-20..t-1})`
  - `pct_move = close_t / close_{t-1} - 1`

## When something breaks
| Symptom | Likely cause | Action |
|---|---|---|
| BSE 403 / HTML instead of JSON | missing Referer/Origin/UA, or IP block | fix headers; if blocked from cloud, run ingest on laptop and commit snapshot |
| BSE empty `Table` | wrong scrip code or date format | check `YYYYMMDD`; re-resolve scrip code |
| screener 404 | symbol differs from NSE symbol, or no consolidated | try standalone URL; try BSE code URL |
| yfinance 429 / empty frame | IP throttling, crumb bug | serve cache; retry next run; check pinned version |
