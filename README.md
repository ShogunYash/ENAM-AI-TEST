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

**Measured:** 125 model calls, 1.03 M input tokens, 88 K output tokens, **57.9 % cache hits**, ₹0.00. By model: local gpt-oss-20b 47 calls,
Flash-Lite 63, Flash 15. A new ticker costs **6 to 8 calls** (measured on an unseen ticker with the local GPU off: 346 s, 6 calls).
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
uv run pytest -q                           # backend tests (264)
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
- **Titan's results card** is flagged `Screener mismatch` (revenue sub-lines): a weaker fallback model produced it; it is shown honestly, not hidden.
- Render's free tier sleeps (a keep-warm ping is documented) and has an ephemeral disk (the API restores a committed seed at boot).
- **Not built:** voice, auth, real push notifications, web enrichment for bios (filing text only), a real `/ask` copilot (the UI sheet is a labelled preview),
  bull/bear and the other research modules, intraday data.
- Docker image was written and reviewed but not built in the dev environment.

## Next
Evaluate verdicts against analyst-labelled examples; add narrative-vs-numbers (prompt drafted in `handoff/`); websocket intraday filings; portfolio-level drift.

## AI build history
How this was built (Claude Code for backend and integration, Antigravity for the frontend, ChatGPT for product, prompts and review): [docs/ai-history/README.md](docs/ai-history/README.md).
