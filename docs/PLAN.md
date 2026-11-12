# FINN — Build Plan & Architecture

## 0. Context
ENAM Holdings "AI Engineer Build Challenge" (full brief: `docs/CHALLENGE_SUMMARY.md`). Build **FINN**, a mobile-first
investment agent for an Indian public-markets investor:
- **Push** — prioritised digest of NSE/BSE filings for a 15–20 stock portfolio over a chosen window + configurable alerts
  (material filing types, volume ≥ N× 20-day avg, price move ≥ ±X%). Results → Revenue/EBITDA/PBT/PAT QoQ & YoY.
  Management change → bio of incoming person.
- **Pull** — on-demand research on **any** NSE ticker, grounded **only** in annual reports + concall transcripts.
  Flagship: *promised vs delivered* over the last 4 quarters.

Deadline **15 Nov 2026** (today 11 Nov). Graded on product sense, judgment, architecture, **cost efficiency**
(routing, caching, chunking) — not completeness. "A demo that doesn't run is the worst outcome."
Rules for every agent: `AGENTS.md`. API contract: `docs/CONTRACT.md`.

## Status (updated 11 Nov 2026)
| Task | Status | Notes |
|---|---|---|
| A0 feasibility | ✅ laptop / ⏭ cloud | BSE, screener.in and yfinance all pass from the laptop (`uv run backend/scripts/smoke_sources.py`). GitHub Actions is unavailable to the user, and a local run can't test cloud IPs, so **the cloud test moves to D2** via `GET /debug/sources` on Render |
| G1 / G2 (ChatGPT) | ✅ merged 11 Nov | **G1:** added HDFCBANK (bank) and HINDZINC (promoter-encumbrance disclosures confirmed in the BSE feed) → 17 stocks. Research set is now INFY, BAJFINANCE + **POLYCAB, KPIL** (outside the portfolio; BSE codes and 21–35 screener transcripts verified). TCS dropped from research (stays in the portfolio). ChatGPT's guidance numbers for POLYCAB/KPIL are **unverified until C3**. **G2:** `guidance_map` and `pvd_reduce` prompts are in `backend/app/prompts/` (v3 = ChatGPT v2 plus the router wrapper and schema key) with schemas `GuidanceItems` / `PvDVerdicts`. ChatGPT only tested them on a transcript passage, so **full-transcript recall is untested** (C2/C3). Raw handoff kept in `handoff/` |
| A1 portfolio (original) | ✅ | 15 stocks + 3 research names in `data/portfolio.json`. Review: no bank, IT-heavy, research set all in-portfolio, and TCS gives little numeric guidance → ChatGPT task G1 adds a bank and a pledging/corporate-action name, and swaps TCS for 1–2 non-IT names **outside** the portfolio |
| A2 contract | ✅ | `docs/CONTRACT.md`, `backend/app/models.py`, `docs/examples/` (16 mocks), `docs/openapi.json`, mock API (`app/main.py`), 32 contract tests green |
| A3 rules | ✅ | `AGENTS.md` (tool-neutral) + `CLAUDE.md` |
| A4 backend + LLM router | ✅ (live ping pending keys) | `backend/app/llm/{router,store,config,prompts,schemas}.py`, `config/models.yaml`, `prompts/ping.md`, `Dockerfile`; 48 tests green (mock transport: fallback, 429 cooldown, cache hit = 0 HTTP, corrective retry, input-size skip, ledger). `/stats/llm` serves the real ledger once any call exists. **Needs the user's free API keys in `.env`, then `uv run python -m scripts.ping_llm --list`** to fix the unverified model IDs |
| B2 classify + score + digest | ✅ 12 Nov | `app/pipeline/{classify,score,digest}.py`, `app/signals/alerts.py`; `/digest` `/alerts` `/filings/{id}` `/prices` `/companies` now serve REAL data (mock only if the DB is empty). 468 real filings classified: **84.6% by rules, 15.4% by one cheap-model call per 30 (3 calls total)**, 0 left unclassified. Digest shows one card per company event (QIP filed 3x = 1 card). 115 tests green, hermetic. **Keys live:** all 3 providers verified; `models.yaml` fixed (OpenRouter gpt-oss :free is paid-only now; gemini-3.6/3.8 give transient 503s so T3 is ordered 3.6, 3.5, 3.8) |
| B1 ingest | ✅ | `app/ingest/{bse,prices}.py`, `app/db.py`, `app/signals/eod.py`, `scripts/ingest.py`: 17/17 stocks, ~470 filings, 42 BSE subcategories (`docs/bse-subcategories.md`), 1,071 price bars; incremental + idempotent (re-run = 0 new); 63 tests green. PDF folder rule verified (Live for fresh, His for old). Next: B2 rule mapping built from the real subcategories |
| A4b portfolio check | ✅ | `scripts/verify_portfolio.py`: all 15 BSE scrip codes match their company names |
| A5 frontend scaffold | ✅ merged 11 Nov | Antigravity, in its own worktree `../ENAM-AI-TEST-fe` (branch `frontend/scaffold`): Vite PWA, design system, Today / Research / Thresholds / Stats screens, 3 card types, Ask sheet; builds clean (235 kB). Not yet reviewed screen by screen. Next for it: C5 research timeline + citation drawer, B7 wiring to the real snapshot |
| G3 Push prompts (ChatGPT) | ✅ merged, untested on real data | `classify_batch`, `so_what`, `results_extract` adopted unchanged with schemas + drift-guard tests. ChatGPT only ran them on 5 Reliance headlines, so the 45-filing test pack (`handoff/G3-test-pack.md`) is still unrun. **Finding:** PDF text extraction flattens results tables (PyMuPDF text and `find_tables` both garble TCS Q2), so **B3 must send the results PDF natively to Gemini**, not extracted text. Code must do the unit conversion, QoQ/YoY and EBITDA derivation, as the prompt specifies |

### Decisions added after the first plan
- **Push ingest runs on the laptop** (proven), and the snapshot is committed. A cloud cron is optional. The real cloud-IP check is `/debug/sources` at deploy. If Render is blocked, unseen-ticker Pull degrades to "building from laptop", and pre-seeded tickers still work.
- **Settings live client-side** (localStorage) and are sent as query params. There's no auth and no server state.
- **Offline alerts:** the frontend recomputes volume/price alerts from `prices.json` (two comparisons). This is the one deliberate backend/frontend duplication, and it keeps thresholds live while the backend sleeps.
- **Snapshot layout:** `frontend/public/data/{meta, companies, prices, digest-24h|3d|7d, stats}.json`, plus `filings/{id}.json` and `research/{SYM}.json`. The frontend loads the snapshot first, then the API.
- **Research builds are asynchronous with polling.** `GET /research/{sym}` returns `status: building` with `progress[]` and the client polls every 3 s. **New idea:** the build progress ("Found 5 transcripts → extracting guidance 2/5 → verified 11/12 quotes") is shown as part of the UX, which also makes the grounding visible.
- **Backend layout:** `backend/app/{models.py, main.py, api/, ingest/, pipeline/, signals/, research/, llm/, prompts/}`, `backend/config/models.yaml`, `backend/scripts/`, `backend/tests/`. The module names in §2 live under `backend/app/`.
- **BSE reality (from A0):** most filings come in as `Company Update / General`, so the headline-regex and T1 batch steps carry more of the classification than first estimated.

**Locked decisions:** Python (FastAPI) backend · TypeScript/React PWA frontend (UI only) · no hand-written Rust/C++ ·
all in-app AI on **free** models · dev tools = Claude Code, ChatGPT (paid), Antigravity Pro.

**Product thesis (pitch this):** *"FINN is a triage desk, not a news feed."* Each screen answers "what needs me, and
why" in ≤ 3 s; everything else is collapsed one tap away. Every AI claim carries a verbatim, server-verified quote from a
primary document — no quote, no claim.

---

## 1. Languages & stack
| Layer | Language | Libraries / services |
|---|---|---|
| Backend API, ingest, AI pipelines | **Python 3.12** (uv, ruff, pytest) | FastAPI, httpx, pydantic v2, sqlite3, yfinance, pymupdf (page text for quote check & AR page finding), selectolax (screener HTML), rapidfuzz (quote verification), tenacity |
| In-app LLM access | Python | single **OpenAI-compatible** client (`openai` pkg) pointed at Gemini / Groq / OpenRouter base URLs; `google-genai` only for native-PDF input + Search grounding |
| Frontend | **TypeScript** | Vite + React + Tailwind + shadcn/ui, TanStack Query, vite-plugin-pwa |
| Rust / C++ | none hand-written | used *indirectly* (pydantic-core, MuPDF, rapidfuzz). Writeup: deliberate restraint |

**Deliberately cut (say so in writeup):** embeddings/vector DB (long context + regex page-finding is enough and fits
512 MB RAM), pdfplumber table parsing (Gemini native PDF input instead), NSE scraping on the critical path (Akamai blocks
cloud IPs; BSE has the same filings), voice, auth, real push notifications.

---

## 2. Architecture

```
 Laptop ingest (primary) / cron (optional)         Free LLMs (config-driven model IDs)
 ┌──────────────────────────────────────┐          Gemini free: Flash-Lite / Flash (+PDF input, +Search grounding)
 │ ingest: yfinance EOD · BSE announce- │          Groq free: short tasks only (8K TPM)
 │ ments · screener tables+doc links    │          OpenRouter :free: emergency fallback (50 req/day)
 │ pipeline: classify→score→enrich      │                       ▲
 │ writes SNAPSHOT JSON ────────────────┼──► frontend/public/data/*.json  (Push works even if backend sleeps)
 └──────────────────────────────────────┘                       │
                                                                 │
 backend/app/ (FastAPI on Render free, Docker; keep-warm ping)   │
 ├─ ingest/    bse.py · prices.py · screener.py · docs.py (PDF download+cache)
 ├─ pipeline/  classify.py (T0 rules→T1 batch) · score.py · results_extract.py · mgmt_bio.py · oneliner.py
 ├─ signals/   eod.py (vol ratio vs 20d, % move) · alerts.py (user thresholds)
 ├─ research/  loader.py (any NSE sym → AR + 5 concalls) · guidance.py (map/reduce P-v-D) ·
 │             snapshot.py (screener tables, no LLM) · verify.py (fuzzy quote check)
 ├─ llm/       router.py (tier → ordered [(base_url, model)], 429 retry/fallback) · cache.py (sha256 → SQLite) ·
 │             ledger.py (calls/tokens per feature)
 ├─ api/       /digest /alerts /settings /filing/{id} /research/{sym} /stats/llm (/ask stretch)
 └─ data/      finn.sqlite snapshot (read-only at boot) + ephemeral live cache
                                                                 │ JSON — contract in docs/CONTRACT.md
 frontend/ (Vite PWA on Cloudflare Pages or Vercel)              ▼
   Today: window picker (24h default/3d/7d/custom) · "Needs you" stack · "Routine (n)" collapsed
   Filing detail: results card (QoQ/YoY, mismatch flag) · bio card · one-liner · source PDF link
   Alerts & thresholds · Research: financial snapshot + Promised-vs-Delivered timeline w/ quote chips
   Cost panel (calls/tokens/cache-hit %) · Copilot bottom sheet (stretch)
```

### 2.1 Free-model routing (the cost story)
| Tier | Job | Primary | Fallback | Volume control |
|---|---|---|---|---|
| **T0 no-LLM** | Map BSE `CATEGORYNAME`/`SUBCATNAME` + headline regex → 17-cat taxonomy; EOD signals; QoQ/YoY math; priority score; financial snapshot from screener tables | rules | — | ≥ 80 % of filings never hit an LLM |
| **T1 cheap** | Classify leftovers in **batches of ~30 headlines/call**; one-line summaries | Gemini Flash-Lite | Groq gpt-oss-20b | batch + cache |
| **T2 extract** | Results PDF (native PDF input) → JSON Rev/EBITDA/PBT/PAT × {Q, Q-1, Q-4}; concall → guidance items `{metric,target,horizon,quote,page}` (map step); mgmt person+role | Gemini Flash (JSON schema) | Groq gpt-oss-120b (short inputs only) | once per document hash, forever |
| **T3 reason** | P-v-D reduce (verdicts), bull/bear, copilot | best free Gemini Flash w/ thinking (Pro is not free) | OpenRouter :free | once per ticker, cached |
| **Grounded web** | Mgmt-change bio | Gemini Flash + Google Search grounding (≈500/day free) | — | once per person |

Model IDs live in `backend/config/models.yaml` (Gemini 2.5 IDs are deprecated/rerouted **1 Dec** — never hard-code).
All calls go through `llm/router.py`; ledger feeds the in-app Cost panel and README numbers.

### 2.2 Grounding discipline (pull side)
- Inputs: downloaded AR pages (located by heading regex: "Management Discussion", "Contingent", "Related Party") +
  concall transcripts + screener tables. No web, no news.
- Every claim = `{text, doc_id, page, quote}`; `research/verify.py` fuzzy-matches `quote` against page text
  (rapidfuzz ≥ 90) and **drops unverified claims**. Prompt forbids outside knowledge.
- Results numbers cross-checked against screener quarterly table (Sales / Operating Profit / PBT / Net Profit) → mismatch
  badge on the card.
- 4 quarters of P-v-D needs **5 transcripts** (guidance at Q-4..Q-1, delivery checked in later quarters + actuals).
- No transcripts (small caps) → explicit empty state + AR MD&A outlook fallback.

---

## 3. Task board
Every task follows `docs/CONTRACT.md` (schemas + endpoints + example JSON) and root `CLAUDE.md` / `AGENTS.md`
(shared rules). **Owner** = tool; **Model** = model to select inside it (legend §4).

### Phase A — Foundations (Day 1, 11–12 Nov)
| ID | Task | Owner / Model | Done when |
|---|---|---|---|
| A0 | **Feasibility hour:** scripts hitting BSE announcements, screener page, yfinance batch for 2 tickers — run on laptop **and** in a GitHub Actions run | Claude Code / Sonnet 5.5 | know which sources work from cloud IPs; decide cron vs laptop ingest |
| A1 | Choose portfolio (15–20, mixed sectors/caps incl. 1–2 with recent results / mgmt change) + 3–5 research names (must have ≥ 5 concall transcripts on screener); record NSE symbol + BSE scrip code | ChatGPT / top Thinking model | `data/portfolio.json` |
| A2 | `docs/CONTRACT.md` + pydantic models stubs | Claude Code / **Opus 5.5, plan mode** | frontend can build fully on mocks |
| A3 | `CLAUDE.md` + `AGENTS.md` (primary-only, router-only LLM calls, cache-first, folder ownership, never break demo path) | Claude Code / Opus 5.5 | — |
| A4 | Backend scaffold (uv, FastAPI `/health`, settings, pytest, Dockerfile) + `llm/` router/cache/ledger with free keys | Claude Code / Sonnet 5.5 | unit tests green; live ping of each provider |
| A5 | Frontend scaffold + design system (type scale, colour tokens, card primitives, bottom nav) on mock JSON; deploy preview | Antigravity / Gemini Pro (high) | opens on your phone |

### Phase B — Push (Day 2, 12–13 Nov)
| ID | Task | Owner / Model | Done when |
|---|---|---|---|
| B1 | `ingest/bse.py` (paging, AttachLive→AttachHis PDF URL fallback) + `ingest/prices.py` (one batched `yf.download`) | Claude Code / Sonnet | 30 days of filings + prices stored |
| B2 | `pipeline/classify.py` T0 map + T1 batch; `score.py` (category weight × user prefs × price reaction × recency) | Claude Code / Sonnet | `/digest?window=24h` ranked + collapsed groups |
| B3 | `results_extract.py` native-PDF → JSON, QoQ/YoY, screener cross-check | Claude Code / Sonnet (Opus for nasty PDFs) | 3 hand-checked filings correct |
| B4 | `mgmt_bio.py` T2 extract name/role → grounded search → 3-line bio + source link | Claude Code / Sonnet | 2 real bio cards |
| B5 | `signals/` + settings endpoint (thresholds, categories I care about) | Claude Code / Sonnet | alerts change when settings change |
| B6 | Snapshot export: cron/laptop job writes `frontend/public/data/*.json` | Claude Code / Sonnet | Push works with backend off |
| B7 | Today, filing detail (results/bio/one-liner cards), Alerts & thresholds screens wired to snapshot + API | Antigravity / Gemini Pro | works on phone |

### Phase C — Pull (Day 3, 13–14 Nov)
| ID | Task | Owner / Model | Done when |
|---|---|---|---|
| C1 | `research/loader.py`: any NSE symbol → screener tables + AR + last 5 concall PDFs → page text cache | Claude Code / Sonnet | unseen ticker loads < 2 min |
| C2 | Draft & iterate the guidance-map and P-v-D-reduce prompts on 2 real transcripts | ChatGPT / top Thinking model → saved to `backend/app/prompts/*.md` | outputs look like an analyst wrote them |
| C3 | `guidance.py` map/reduce + `verify.py` quote check; verdicts met / missed / slipped / quietly dropped | Claude Code / **Opus 5.5** | hand-check 2 companies; zero unverified quotes shown |
| C4 | `snapshot.py` financial snapshot + trajectory from tables (no LLM); bull/bear (T3, cited) if time | Claude Code / Sonnet | JSON per contract |
| C5 | Research screen: snapshot header + P-v-D timeline, verdict chips, tap-quote → page citation drawer | Antigravity / Gemini Pro | renders cached + live tickers |
| C6 | *(stretch)* Copilot bottom sheet `/ask` reusing cached guidance JSON + screen context | Claude Code (API) + Antigravity (UI) | answers "why does this matter?" on any card |

### Phase D — Harden & ship (Day 4, 14 Nov · 15 Nov = submit only)
| ID | Task | Owner / Model | Done when |
|---|---|---|---|
| D1 | Pre-seed portfolio + research names into committed SQLite snapshot; demo-mode serves cache if live source fails | Claude Code / Sonnet | app works with internet sources blocked |
| D2 | Deploy: Render (Docker) + Cloudflare Pages/Vercel + keep-warm ping; secrets in env. **Run `GET /debug/sources` on Render (the cloud-IP test)** | Claude Code / Sonnet | public URLs work on phone; sources report known |
| D3 | Cost panel (`/stats/llm`: calls, tokens, cache-hit %, calls per new ticker) | Claude Code (API) + Antigravity (UI) | numbers visible in app |
| D4 | Polish: empty/loading/error states, density, dark mode; screenshot critique | Antigravity / Gemini Pro + ChatGPT critique | — |
| D5 | AI-output QA: spot-check 10 results cards + 2 P-v-D reports | ChatGPT / top Thinking model as judge | issues fixed |
| D6 | README (architecture, routing table, measured cost) + covering email (built / decisions & trade-offs / left out / next) + AI-history export | ChatGPT (writing) + Claude Code / Haiku 5.5 (facts from repo) | email ready |

---

## 4. Tool & model legend (for any agent reading this)
| Tool | Role | Model to select | Owns | Never |
|---|---|---|---|---|
| **Claude Code** | Backend owner, integrator, deployer; only tool that merges to `main` | **Opus 5.5** (or Fable 5.2) in plan mode for A2, A3, C3 and hard bugs · **Sonnet 5.5** default for implementation · **Haiku 5.5** for searches, tests, README facts | `backend/`, `.github/`, root docs | redesign UI |
| **Antigravity Pro** | Frontend owner | Latest **Gemini Pro**, high reasoning, for screens/architecture · Gemini Flash for small tweaks · built-in browser at 390×844 to check mobile | `frontend/` | touch `backend/` |
| **ChatGPT (paid)** | Product brain, prompt engineer, reviewer, writer | Strongest **Thinking/reasoning** model on your plan · image gen for mockups/icons | portfolio choice, in-app prompts, finance sanity checks, design critique, writeup | commit code directly |
| **In-app agents** | Runtime AI | **Free only** — Gemini API free tier, Groq free, OpenRouter `:free` (see §2.1) | — | paid APIs |

**Coordination rules**
1. `docs/CONTRACT.md` is the single source of truth; only Claude Code edits it, then updates backend models + tells Antigravity.
2. Folder ownership above prevents merge conflicts; Antigravity works on a `frontend/*` branch, Claude Code merges.
3. Prompts live in `backend/app/prompts/*.md` (versioned), never inline.
4. Log every session/share link in `docs/ai-history/README.md` as you go — it's a deliverable.

---

## 5. Risks → mitigations
| Risk | Mitigation |
|---|---|
| Cloud IPs blocked (NSE certain, yfinance/BSE possible) | Laptop works (A0 ✅). Push ingest runs on the laptop and commits the snapshot. The Render cloud-IP check happens at D2 via `/debug/sources`. NSE is off the critical path |
| Render free sleeps / ephemeral disk | Push served from static snapshot JSON; keep-warm ping; SQLite snapshot committed |
| Free quota exhausted when graders try unseen tickers | per-document-hash cache; ~6 LLM calls per new ticker; show "cached" state; fallback chain |
| Grounding violations | quote verification drops unverified claims |
| Messy/scanned results PDFs | native-PDF Gemini input + screener cross-check badge |
| Ticker without transcripts | explicit empty state + AR MD&A fallback |
| screener ToS ("personal, non-commercial") | low volume, cache, respect robots.txt (avoid `/company/source/quarter/*`); disclose in writeup |

---

## 6. Verification (end-to-end)
1. `uv run pytest` in `backend/` (router fallback, cache hit, T0 classifier on fixture filings, QoQ/YoY math, quote verifier).
2. `uv run python -m scripts.smoke` — live: 1 BSE fetch, 1 yfinance batch, 1 screener load, 1 call per LLM tier.
3. Golden checks: 3 results filings vs. numbers typed by hand from the PDF; 2 P-v-D reports reviewed by ChatGPT judge (D5).
4. Kill backend → open PWA on phone → Today/Alerts still render from snapshot.
5. Unseen-ticker test on deployed URL (random NSE name) → research completes or degrades gracefully; check ledger
   shows ≈ 6 calls, second open = 0 calls (cache).
6. Change threshold (vol 2× → 1.5×) in app → alerts list updates.
