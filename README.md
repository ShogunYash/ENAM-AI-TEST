# FINN: a triage desk for a public-markets investor

**Try it on your phone: https://enam-ai-test.pages.dev/** (API health: https://finn-api-7n6q.onrender.com/health; the free server sleeps, so the first request can take about a minute, and the app works from a built-in snapshot meanwhile).

FINN is a mobile-first investment agent built for the ENAM AI Engineer Build Challenge. It is **not a news feed**: every screen answers *"what needs me, and why?"* in a few seconds and collapses the rest. Every AI claim carries a **verbatim quote from a primary document that the server has checked**. A claim without a verified quote is dropped.

## What it does

**Push: the app tells you what changed**
- **Today:** BSE filings across a 17-stock portfolio (plus a 10-name watchlist), ranked, for a window you choose (24h, 3d, 7d, 30d). Routine paperwork is collapsed, and one company event shows once even if it was filed three times.
- **Alerts you configure:** volume spikes, price moves beyond ±X%, and the filing types you care about (Settings).
- **Results card:** Revenue, EBITDA, PBT and PAT with QoQ and YoY, read from the filing PDF and cross-checked against screener.in. A card that fails the check shows an amber *Screener mismatch* badge instead of being hidden.
- **Management-change card:** who, which role, from when, and a short background taken only from the filing.

**Pull: you ask it to dig in**
- **Research any NSE ticker** from earnings calls only: financial snapshot, **1D/3D/7D/30D price charts**, and the flagship **Promised vs Delivered** timeline. Four reports are pre-built (INFY, BAJFINANCE, POLYCAB, KPIL). Any other ticker builds live, and the report fills in as it goes (financials in about 2 seconds, then each judged promise).
- Example: KPIL guided at least 25% FY26 revenue growth, its filed consolidated growth was **21.6%**, so FINN says **missed**, and shows the quote and page.
- **Ask FINN:** grounded questions about the filing or report on screen. It answers only from that evidence and says so when it can't.

**Network: who can help me understand this** (a **synthetic** 36-person investor network that overlaps the portfolio)
- A management-change card shows which contacts overlapped with the new executive, using only the tenure the filing itself states.
- An M&A, capex or litigation filing names the contact best placed to give context, and why. Each Research page has "Who to call about {company}".
- The Network tab has an ask box, reconnect nudges tied to real recent filings, and an expertise map.
- Matching is rules over listed facts, never a model's guess. Details, privacy and consent: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

**The app itself:** a PWA that works offline from a committed snapshot, a first-run choice of Light, Dark or an opt-in Bloomberg-style Terminal skin, a command bar (type `INFY` or `NETWORK`) with a ticker tape, company logos, and research reports saved on your device.

## Why you can trust it
- **No claim without a verified quote.** Quotes are fuzzy-matched to the cited page, and every number in a quote must also appear on that page. (A quote with the right words but changed figures once scored 97–98 on fuzzy matching and was "verified"; that is why the number rule exists.)
- **The model copies, code computes.** From a results PDF the model only copies printed figures. Units, EBITDA (PBT + finance cost + D&A − other income), QoQ and YoY are code, and all three quarters are cross-checked against screener.in.
- **Comparable numbers only.** Reported rupee figures can't settle a constant-currency or an EBIT-margin promise. "Met" needs the promised year to have closed; "missed" needs a number or explicit failure language. Plain growth promises for a closed year are computed from filed numbers.
- **A second reader.** Every promised-vs-delivered item was re-checked against its quote; 11 of 36 did not hold up, so FINN withholds them and says so instead of showing a confident wrong card.
- **Bios and contacts:** a name that is not in the filing is rejected, and a contact match always lists the facts it rests on.

## How it works
```
 BSE filings ─┐  screener.in tables + transcripts ─┐  yfinance prices ─┐          ingest on a laptop (polite, cached)
              ▼                                    ▼                   ▼
   classify: rules first (84.6 % of 468 filings), a cheap model for the rest ─ score ─ digest ─ alerts      PUSH
   results PDF ─▶ model copies figures ─▶ code computes + cross-checks;  filing ─▶ bio card;  filing ─▶ one-liner
   transcripts ─▶ guidance with verified quotes ─▶ later calls + filed numbers ─▶ judge ─▶ guards             PULL
   contacts (synthetic) + filings ─▶ rules ─▶ who overlaps, who to call, who to reconnect with                 NETWORK
                     │
   one LLM router: tier ─▶ ordered model chain, fallback and circuit breaker, answer cache, cost ledger ─▶ SQLite
                     │
   FastAPI on Render  ─▶  React PWA on Cloudflare Pages (loads a committed snapshot first, then the API)
```
Python 3.12 (FastAPI, pydantic v2, SQLite, PyMuPDF, rapidfuzz) and TypeScript (React, Tailwind, TanStack Query, vite-plugin-pwa). Full write-up of pipelines, privacy, models and agents, and cloud: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). API contract: [docs/CONTRACT.md](docs/CONTRACT.md).

## Models and cost: all free, spend ₹0.00
In-app AI uses free tiers only (Gemini API, Groq, OpenRouter `:free`) plus an open model on a local GPU for build-time work. Every call goes through one router, and the numbers below come from the app's own ledger (`GET /stats/llm`, shown on the Cost screen).

| Tier | Job | Models, in order | Rule |
|---|---|---|---|
| No model | categories from BSE subcategory and headline patterns, signals, scoring, QoQ/YoY, units, EBITDA, charts, contact matching | code | 84.6 % of 468 filings never reach a model |
| T1 cheap | classify the leftovers (30 per call), one-liners | Gemini Flash-Lite, local gpt-oss-20b, Groq | batched, cached |
| T2 extract | results PDF (native PDF input), guidance from transcripts, management bio | Gemini Flash, local gpt-oss-20b, Flash-Lite | once per document, cached |
| T3 reason | promised-vs-delivered verdicts | Gemini Flash models, local gpt-oss-20b, OpenRouter | once per ticker |

**Measured:** 195 model calls, 1.59 M input and 126 K output tokens, **54.4 % cache hits**, **₹0.00**. A new ticker takes 6–8 calls and under two minutes. The router skips a model that just timed out or answered with invalid output, and remembers daily-quota exhaustion, because free tiers are the main constraint.

## Run it locally
```bash
cp .env.example .env                        # free keys: Gemini (aistudio.google.com/apikey), Groq, OpenRouter
cd backend && uv sync
uv run python -m scripts.ingest             # BSE filings and prices (incremental)
uv run python -m scripts.refresh_snapshot --classify
uv run uvicorn app.main:app --port 8000     # API (serves mock fixtures only if there is no database)
cd ../frontend && npm install && npm run dev
cd ../backend && uv run pytest -q           # 328 tests; browser checks are in frontend/README.md
```
Deploying: [docs/DEPLOY.md](docs/DEPLOY.md).

## Data sources and terms
BSE corporate-announcement API and filing PDFs (NSE is not used because it blocks cloud IPs), screener.in company pages (documents and standardised tables; **personal, non-commercial use**: low volume, cached, robots.txt respected) and Yahoo Finance via yfinance (end of day and 15-minute bars). Research uses **primary sources only**: earnings-call transcripts, annual reports and filed numbers. No news, no broker notes, no model memory of a company.

## Limits and what was left out
- **Free-tier quotas.** Gemini enforces daily per-model limits. A live build for an unseen ticker can be slower or partial, and the report says what it could not finish. The deployed demo serves a committed seed and snapshot, so it never depends on a live model.
- **BSE blocks cloud servers**, so filings are ingested on a laptop and shipped in the snapshot. Transcript PDFs download fine from the server, so live research works.
- **Research storage.** A report built live is cached on Render's ephemeral disk and is lost on restart or sleep. The browser keeps a copy of every finished report on the device; durable server storage would need a paid disk or a database.
- **The Network is synthetic and public by design**: fictional contacts in a public repository, with no accounts. A real deployment would use consented or licensed profile data per investor; that design is described in the architecture doc, not implemented.
- **Logos:** 19 of 27 tracked companies show a logo (the rest show initials); they are local files used only to identify companies, and a real product would use a licensed logo service.
- **Not built:** voice, real push notifications, accounts, web enrichment for bios (they come from the filing text only), bull/bear and the other research modules.
- **Next:** evaluate verdicts against analyst-labelled examples, narrative-vs-numbers, intraday filings, consented contact import.

## Where to look
| | |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | pipelines, privacy and consent, models and agents, cloud |
| [docs/CONTRACT.md](docs/CONTRACT.md) | API endpoints, data shapes, snapshot layout |
| [docs/DEPLOY.md](docs/DEPLOY.md) | how it is deployed and verified |
| [docs/CHALLENGE_SUMMARY.md](docs/CHALLENGE_SUMMARY.md) | the brief, condensed |
| [docs/ai-history/README.md](docs/ai-history/README.md) | how it was built with Claude Code, Antigravity and Codex, with logs and a share link |
| [AGENTS.md](AGENTS.md), `.claude/skills/` | the rules and playbooks the AI tools followed |
| `backend/` · `frontend/` · `data/` | API and pipelines · the PWA · the portfolio, watchlist and synthetic network |
