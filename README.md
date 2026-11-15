# FINN: a triage desk for a public-markets investor

> **Try it on your phone:** `<DEMO URL: filled in after deploy>` · API health: `<API URL>/health` · Brief: [docs/CHALLENGE_SUMMARY.md](docs/CHALLENGE_SUMMARY.md)

FINN is a mobile-first investment agent built for the ENAM AI Engineer Build Challenge. It is **not a news feed**: every screen answers
*"what needs me, and why"* in a few seconds and collapses the rest. Every AI claim carries a **verbatim quote from a primary document
that the server has checked**; a claim without a verified quote is dropped.

## 30-second tour
1. **Today** (window: 24h / 3d / 7d / 30d): the few BSE filings across a 17-stock portfolio that matter, ranked; routine paperwork is collapsed.
   One card per company *event* (a QIP filed three times shows once).
2. **Results card** (e.g. Tata Steel): Revenue, EBITDA, PBT, PAT with QoQ and YoY, parsed from the filing PDF, with a green **Verified** badge
   (cross-checked against screener.in for all three quarters) or an amber **Screener mismatch** badge.
3. **Management change** card: who, which role, effective date, and a short background taken **only from the filing**.
4. **Alerts & thresholds**: you set what "unusual" means (volume x, price move %, categories you care about); the app watches for it.
5. **Research** (INFY, BAJFINANCE, POLYCAB, KPIL pre-built; any other NSE ticker builds live with visible progress):
   financial snapshot + **Promised vs Delivered** timeline from the last 5 earnings calls, each verdict with its quote and page.
   Example: KPIL guided *"25%+"* FY26 revenue growth and management said it *"fully delivered"*; its filed numbers show **21.6%**, so FINN says **missed**.
6. **Network** (the third layer): a **synthetic** 36-person investor network that overlaps the portfolio. It shows up inside Push and Pull and can be asked directly.
   A management-change card says which contacts overlapped with the new person, using only the tenure the filing states; an M&A, capex or litigation filing
   names the contact best placed to give context and why; a Research page has "Who to call about {company}"; the Network tab has an ask box (a small
   agent: a model picks one tool, code runs it, and the answer can only name people in the network), reconnect nudges when a contact's former employer
   files something, and an expertise map. Matching is rules over listed facts, no model. Architecture, privacy and consent: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Architecture
```
 BSE announcements ──┐   screener.in tables + doc links ──┐   yfinance EOD ──┐          (ingest, polite, cached)
                     ▼                                    ▼                  ▼
   classify (rules 84.6 % → cheap model for the rest) ─ score ─ digest ─ alerts          PUSH
   results PDF ──▶ Gemini (native PDF) copies printed figures ──▶ CODE does units, EBITDA, QoQ/YoY, screener cross-check
   mgmt-change filing ──▶ bio card (name + numbers must appear in the filing)
   transcripts ──▶ guidance (verified quotes) ──▶ retrieve later passages + screener actuals ──▶ judge ──▶ guards            PULL
                     │
   llm/router.py: tier -> ordered model chain, fallback on 429/503/bad JSON, persisted daily-quota cooldown,
                  answer cache, cost ledger  ──▶  SQLite (finn.sqlite, llm.sqlite)
                     │
   FastAPI (Render)  ──▶  Vite/React PWA (Cloudflare Pages)  — loads a committed SNAPSHOT first, so Push renders even if the API sleeps
```
Python 3.12 (FastAPI, pydantic v2, SQLite, PyMuPDF, rapidfuzz) · TypeScript (React, Tailwind, TanStack Query, vite-plugin-pwa).
Details: [docs/PLAN.md](docs/PLAN.md), API contract [docs/CONTRACT.md](docs/CONTRACT.md).

## Models and measured cost (all free; spend ₹0.00)
In-app AI uses free tiers only (Gemini API, Groq, OpenRouter `:free`) plus an open model on a local GPU for build-time work.
Every call goes through one router; numbers below come from the app's own ledger (`GET /stats/llm`):

| Tier | Job | Models (in order) | Rule |
|---|---|---|---|
| T0, no LLM | category from BSE subcategory + headline patterns, EOD signals, scoring, QoQ/YoY, units, EBITDA, financial snapshot, "numbers vs promise" for plain growth targets | code | 84.6 % of 468 filings never reach a model |
| T1 cheap | classify leftovers (30 per call), one-liners | Gemini Flash-Lite, local gpt-oss-20b, Groq | batched, cached |
| T2 extract | results PDF (native PDF input), guidance from transcripts, management bio | Gemini Flash, local gpt-oss-20b, Flash-Lite | once per document, cached forever |
| T3 reason | promised-vs-delivered verdicts | Gemini Flash, local gpt-oss-20b (medium effort), OpenRouter | once per ticker |

**Measured:** 195 model calls, 1.59 M input tokens, 126 K output tokens, **54.4 % cache hits**, ₹0.00. By model: local gpt-oss-20b 54 calls,
Flash-Lite 110 (two versions), Flash 27, OpenRouter free 2. A new ticker costs **6 to 8 calls** (unseen ticker, local GPU off: 346 s before the 14 Nov speed-up, under 2 minutes after; the report streams in, financials within ~2 s).
The universe is **17 holdings + a curated 10-name watchlist** (`data/portfolio.json`); the digest and alerts cover holdings only, the by-company view covers both.
On the same hardware-free path the answer is partial-but-honest when quotas bite (see *Limits*).

## How FINN stays honest (found by reading its own output)
- **Quotes**: fuzzy-matched against the cited page. *Measured hole:* a quote with the right words and changed figures scored 97 to 98.5 and was
  "verified", so **every number in a quote must also appear on the page**.
- **Comparable numbers only**: reported-INR table figures can't settle constant-currency or EBIT-margin promises; the first Infosys draft
  wrongly said "met" for both.
- **"Met" needs the year to have closed**: mid-year "we are on track" becomes *pending: on track* (it had marked Bajaj and KPIL items met).
- **"Missed" needs a number or failure language**; plain revenue / profit growth promises for a closed year are **computed** from filed numbers.
- **Results**: the model only copies printed figures; units, EBITDA (= PBT + finance cost + D&A − other income, equal to screener's
  Operating Profit for TCS), QoQ/YoY are code, and all three quarters are cross-checked with screener.in. Results tables cannot be read as
  PDF text (they flatten), so the PDF goes to Gemini natively.
- **Bios**: a name that isn't in the filing is rejected; lines restating the event or giving the departure reason are removed.
- Results of the classification check: on 90 filings the cheap model agreed with the rules 87.8 %; the disagreements surfaced a real M&A hidden in a press release.

## Run it locally
```bash
cp .env.example .env                       # free keys: Gemini (aistudio.google.com/apikey), Groq, OpenRouter
cd backend && uv sync
uv run python -m scripts.ingest            # BSE filings + prices (incremental)
uv run python -m scripts.refresh_snapshot --classify
uv run uvicorn app.main:app --port 8000    # API; mock fixtures only if there is no database
cd ../frontend && npm install && npm run dev
uv run pytest -q                           # backend tests (300)
```
Optional build-time GPU: `ssh -N -L 11435:localhost:11434 <host>` to an Ollama box with `gpt-oss:20b` (see `backend/config/models.yaml`).
Deploy: [docs/DEPLOY.md](docs/DEPLOY.md). Project skills and agent rules: [AGENTS.md](AGENTS.md), `.claude/skills/`.

## Data sources and terms
BSE corporate-announcement API and filing PDFs (NSE is not used: it blocks cloud IPs), screener.in company pages (documents, standardised tables;
**personal, non-commercial use**: low volume, cached, robots.txt respected), Yahoo Finance via yfinance (end of day). Research uses **primary sources only**:
earnings-call transcripts, annual reports and filed numbers. No news, no broker notes, no model memory of a company.

## Limits and what was left out
- **Free-tier quotas**: Gemini enforces *daily per-model* request limits (the Flash models ran out after ~40 calls). The router reads the retry time and
  skips an exhausted model; the demo serves a committed seed and snapshot, so it never depends on a live model. A live build for an unseen ticker is
  quota-bound and may return a partial report with an explicit gap (e.g. "Judgment batch 2 failed").
- A results card that fails the screener cross-check is shown with an amber `Screener mismatch` badge, never hidden. (Titan's was one until its PDF was re-read by a stronger model once the daily quota returned: all 17 now match.)
- Render's free tier sleeps (a keep-warm ping is documented) and has an ephemeral disk (the API restores a committed seed at boot).
- **Not built:** voice, auth, real push notifications, web enrichment for bios (filing text only), bull/bear and the other research modules, intraday data.
  `POST /ask` (grounded Q&A on the filing or report on screen) is built and tested; check whether the Ask sheet in the deployed UI is wired to it.
- **Deployed (14 Nov):** API https://finn-api-7n6q.onrender.com, PWA https://enam-ai-test.pages.dev/. From the Render host `/debug/sources` reports BSE 403 (announcement API blocked), screener.in OK, yfinance OK. BSE's announcement API answers 403 to the Render host (so Push ingest stays on the laptop and ships in the snapshot/seed), but the earnings-call PDFs download fine: a live research build for an unseen ticker (GODREJCP, 14 Nov) finished on Render in about a minute with 4 transcripts read and 8 promises judged. If a transcript host ever blocks, the report degrades to the financials plus an explicit gap.

## Next
Evaluate verdicts against analyst-labelled examples; add narrative-vs-numbers; websocket intraday filings; portfolio-level drift.

## AI build history
How this was built (Claude Code for backend and integration, Antigravity for the frontend, ChatGPT for product, prompts and review): [docs/ai-history/README.md](docs/ai-history/README.md).
