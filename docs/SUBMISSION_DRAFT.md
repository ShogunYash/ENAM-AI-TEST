# Submission draft (DRAFT ONLY: the user sends it; nothing here has been sent)

**To:** assessment@enam.com  **Subject:** IIT Delhi – AI Engineer - 2027  **Deadline:** 15 Nov 2026

## Deliverables checklist (status on 13 Nov)
- [ ] **Deployed mobile link**: not deployed yet (needs the user's Render + Cloudflare Pages accounts; steps in [DEPLOY.md](DEPLOY.md)). Then open it on a phone, airplane-mode test the snapshot.
- [ ] **GitHub repo reachable by the reviewers**: the repo is **private**; make it public or add the ENAM reviewers. Check `git log -p | grep -E "AIza|gsk_|sk-or"` shows nothing (last checked: clean).
- [ ] **AI build history**: `docs/ai-history/README.md` has the index; replace the `<...>` links (ChatGPT and Antigravity share links; scrubbed Claude Code transcripts).
- [x] **Demo check (13 Nov):** 264 backend tests, lint clean, BSE / screener.in / Yahoo reachable, frontend builds, no mock data in the snapshot.
- [ ] **Re-run before sending:** Titan results card (waits for Gemini Flash quota reset, `scripts.enrich_results --only TITAN --force --refresh`), refresh snapshot + seed, `GET /debug/sources` on Render.
- [ ] **Email** (below): fill the URLs and your name.

## Email

Hi ENAM team,

**Try FINN on your phone:** `<DEMO URL>` · **GitHub:** `<REPO URL>` · **AI build history:** `<repo>/docs/ai-history`

**What I built.** FINN is a triage desk for a public-markets investor: it shows which BSE filings across a 17-stock portfolio deserve attention
today, and lets you research any NSE company from its earnings calls. Push has a windowed digest, configurable alerts, a results card
(Revenue, EBITDA, PBT, PAT with QoQ/YoY) and a management-change card. Pull has a financial snapshot and a promised-vs-delivered timeline.
The part I'm proudest of: every claim carries a quote the server has checked against the page, and where the numbers can settle a promise, code
settles it. KPIL guided "25%+" FY26 revenue growth and said it "fully delivered"; its filed numbers show 21.6%, and FINN says missed.

**Decisions and trade-offs.**
- *Rules first, models second.* In one run FINN classified 468 filings: rules handled 84.6 %, the other 72 took three batched model calls.
- *Models copy, code computes.* Results tables don't survive PDF text extraction, so the PDF goes to Gemini natively; the model copies printed figures and code does
  units, EBITDA, QoQ/YoY, then cross-checks all three quarters against screener.in (16 of 17 results cards match; the 17th is flagged, not hidden).
- *Checked, not trusted.* Reading my own output found real holes: a quote with changed figures still scored 97 to 98.5 on fuzzy matching (now every number must appear on the page);
  the first Infosys draft called two promises "met" using figures that weren't comparable (constant-currency vs reported INR; EBIT vs EBITDA margin).
- *Free-tier reality.* Gemini's free tier has daily per-model quotas, so the router reads the retry time and skips exhausted models, and a local open model on a GPU does
  the heavy build-time work. Total spend ₹0.00 over 125 measured calls (57.9 % cache hits). The demo serves a committed seed and snapshot, so it never depends on a live model.

**What I deliberately left out.** Voice, auth and real push notifications; web enrichment for bios (they come from the filing text only); bull/bear and the other research modules. (A grounded `/ask` exists in the API; see the README for whether the UI sheet is wired to it.) That time went into verification, because a wrong number is worse than a missing one.

**Where I'd take it next.** Evaluate verdicts against analyst-labelled examples; narrative-vs-numbers (drafted); intraday filings over a websocket;
portfolio-level drift in management tone.

Known limits are in the README (free-tier quotas can make a live build of an unseen ticker partial, with an explicit gap shown).

Thanks,
`<your name>`
