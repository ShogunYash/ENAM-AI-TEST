# Submission draft (DRAFT ONLY: the user sends it; nothing here has been sent)

**To:** assessment@enam.com  **Subject:** IIT Delhi – AI Engineer - 2027  **Deadline:** 15 Nov 2026

## Deliverables checklist (status on 13 Nov)
- [x] **Deployed mobile link (14 Nov):** PWA https://enam-ai-test.pages.dev/ , API https://finn-api-7n6q.onrender.com (`/health` ok, mode live). **Phone check still to be done by the owner** (Today 30d, a results card, INFY research, LIVE/SNAPSHOT chip). Render auto-deploys on commit (`autoDeployTrigger: commit`), so wait for the deploy after the last push and re-check `/health`.
- [ ] **GitHub repo reachable by the reviewers**: the repo is **private**; make it public or add the ENAM reviewers. Check `git log -p | grep -E "AIza|gsk_|sk-or"` shows nothing (last checked: clean).
- [ ] **AI build history**: `docs/ai-history/README.md` has the index; replace the `<...>` links (ChatGPT and Antigravity share links; scrubbed Claude Code transcripts).
- [x] **Demo check (13 Nov):** 300 backend tests, lint clean, BSE / screener.in / Yahoo reachable, frontend builds, no mock data in the snapshot.
- [x] Titan results card fixed (13 Nov): all 17 results cards match screener.in.
- [x] `GET /debug/sources` on Render (14 Nov): BSE announcement API 403, screener.in OK, yfinance OK. BSE's announcement API answers 403 to the Render host (so Push ingest stays on the laptop and ships in the snapshot/seed), but the earnings-call PDFs download fine: a live research build for an unseen ticker (GODREJCP, 14 Nov) finished on Render in about a minute with 4 transcripts read and 8 promises judged. If a transcript host ever blocks, the report degrades to the financials plus an explicit gap.
- [ ] **Re-run before sending:** after the last push, wait for the Render auto-deploy and confirm `/health` and the Pages site.
- [ ] **Email** (below): fill the URLs and your name.

## Email

Hi ENAM team,

**Try FINN on your phone:** `<DEMO URL>` · **GitHub:** `<REPO URL>` · **AI build history:** `<repo>/docs/ai-history`

**What I built.** FINN is a triage desk for a public-markets investor: it shows which BSE filings across a 17-stock portfolio deserve attention
today, and lets you research any NSE company from its earnings calls. Push has a windowed digest, configurable alerts, a results card
(Revenue, EBITDA, PBT, PAT with QoQ/YoY) and a management-change card. Pull has a financial snapshot and a promised-vs-delivered timeline.
The part I'm proudest of: every claim carries a quote the server has checked against the page, and where the numbers can settle a promise, code
settles it. KPIL guided at least 25% FY26 revenue growth; its filed consolidated growth was 21.6%, and FINN says missed.

**Decisions and trade-offs.**
- *Rules first, models second.* In one run FINN classified 468 filings: rules handled 84.6 %, the other 72 took three batched model calls.
- *Models copy, code computes.* Results tables don't survive PDF text extraction, so the PDF goes to Gemini natively; the model copies printed figures and code does
  units, EBITDA, QoQ/YoY, then cross-checks all three quarters against screener.in (all 17 results cards match; a card that fails the check is flagged, never hidden).
- *Checked, not trusted.* Reading my own output found real holes: a quote with changed figures still scored 97 to 98.5 on fuzzy matching (now every number must appear on the page);
  the first Infosys draft called two promises "met" using figures that weren't comparable (constant-currency vs reported INR; EBIT vs EBITDA margin).
- *Second reader.* After building, an independent reviewer re-checked every promised-vs-delivered quote against its page. 11 of 36 items had a quote that did not support the stated metric or a "quietly dropped" verdict that the checked calls could not establish; FINN withholds them and says so in the report's gaps, rather than showing a confident wrong card.
- *Free-tier reality.* Gemini's free tier has daily per-model quotas, so the router reads the retry time and skips exhausted models, and a local open model on a GPU does
  the heavy build-time work. Total spend ₹0.00 over 195 measured calls (54.4 % cache hits; the live Cost screen keeps counting after deploy, 216 calls / 51.2 % when checked on 14 Nov, still ₹0). The demo serves a committed seed and snapshot, so it never depends on a live model.

**What I deliberately left out.** Voice, auth and real push notifications; web enrichment for bios (they come from the filing text only); bull/bear and the other research modules. (A grounded `/ask` exists in the API; see the README for whether the UI sheet is wired to it.) That time went into verification, because a wrong number is worse than a missing one.

**Where I'd take it next.** Evaluate verdicts against analyst-labelled examples; narrative-vs-numbers (drafted); intraday filings over a websocket;
portfolio-level drift in management tone.

Known limits are in the README: free-tier daily quotas can make a live build slower or partial (the report says what it could not finish), and BSE's announcement API blocks the cloud host, so Push data is refreshed on a laptop and shipped in the snapshot.

Thanks,
`<your name>`
