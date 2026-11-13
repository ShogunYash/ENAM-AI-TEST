# FINN: what is left (13 Nov 2026, deadline 15 Nov)

State: backend, snapshot, seed and research are done and pushed (main at 4fd7e1a). 298 tests green. Only the items below remain.

## Owner: you (accounts and sending; nobody else can do these)
| # | Task | Why it matters | How |
|---|---|---|---|
| U1 | Deploy the API on Render | the brief needs a deployed mobile link | `docs/DEPLOY.md`; free plan, root `backend/`, `render.yaml` is ready |
| U2 | Deploy the PWA on Cloudflare Pages | the link you submit | `docs/DEPLOY.md`; build `npm run build` in `frontend/`, set `VITE_API_URL` to the Render URL |
| U3 | Open `<render-url>/debug/sources` | proves BSE / screener.in / yfinance work from a cloud IP; if one fails, Pull on unseen tickers degrades to "queued", the demo still works | paste the JSON to Claude Code if anything fails |
| U4 | Make the GitHub repo reviewable (public, or add the reviewer) | graders must open it | Settings > Danger zone; check `git log` has no secrets first |
| U5 | Fill the links in `docs/ai-history/README.md` | submission deliverable "AI build history" | shared chat links for Claude Code, Antigravity, ChatGPT; scrub personal data |
| U6 | Send the email from `docs/SUBMISSION_DRAFT.md` | the submission | to assessment@enam.com, subject "IIT Delhi – AI Engineer - 2027"; put the two URLs in. Send on the 14th, keep the 15th as slack |

## Owner: Antigravity (frontend/ only, branch `frontend/portfolio-toggle`)
Paste the whole block below.

```
Read AGENTS.md and .claude/skills/finn-ui-principles/SKILL.md first. Edit only frontend/. Use the main-tree API on :8001.
Regenerate types first: openapi-typescript docs/openapi.json. Tasks in order; commit after each one.

AG-1 "My portfolio | Watchlist" toggle on Today (main task)
- Backend is done: GET /companies and GET /digest/companies?window= return holdings AND a 10-name watchlist,
  each CompanySummary has in_portfolio: boolean. /digest and /alerts stay holdings-only: do NOT put watchlist
  items in Needs-you or alerts.
- Segmented control "My portfolio | Watchlist", portfolio default, choice kept in localStorage.
  - Portfolio: today's behaviour (digest stack for 24h/3d/7d, by-company list for 30d, only in_portfolio=true).
  - Watchlist: always the by-company list for the selected window, only in_portfolio=false; tap opens CompanyDetail.
  - Caption on Watchlist: "Not in your portfolio. Filings only, no alerts."

AG-2 CompanyList polish
- Sort toggle (Important first | A-Z), search box (symbol or name), count line ("7 of 17").
- Empty state per window ("No filings in 24h for these companies").

AG-3 Offline fallback
- client.ts has "-30d" hard-coded for snapshot files. Use the selected window:
  data/digest-companies-{window}.json and data/company-filings/{SYMBOL}-{window}.json (all four windows exist).
- Acceptance test: stop the API, hard-reload, both modes and all four windows still render.

AG-4 Final mobile QA at 390x844 (and 360x740)
- Walk: Today (every window, both modes) > a filing card > results card > management card > Alerts > Settings > Research
  INFY > BAJFINANCE > POLYCAB > KPIL > an unseen ticker (building state, then partial with its gap line) > Ask > Stats.
- Fix only layout, overflow, truncation, tap-target (<44px), contrast and loading/empty/error states. No new features.
- Check the Research verdict chips never show a verdict without a quote link, and the "sample" badge shows only where is_sample is true.
- Check Indian number formatting (Rs crore, lakh-style grouping) and IST times everywhere.

AG-5 PWA / deploy readiness
- `npm run build` clean (no TS errors, no console errors on load), manifest icons + theme colour present,
  service worker caches data/*.json, install prompt works on Android Chrome. "as of" chip visible on Today.
- VITE_API_URL read from env; when unset or unreachable the app silently uses the snapshot (no red error banner).

Report: commit hashes + 390x844 screenshots for AG-1 and AG-4. Do not touch backend/, docs/ or data/.
```

## Owner: ChatGPT (never commits; paste outputs to Claude Code or the repo owner)
Paste each block as a new chat. Attach the file(s) named in it.

```
GPT-1 Final QA of the research verdicts (attach handoff/D5-research-review.md, docs/examples/research-*.json, or the
files frontend/public/data/research/{INFY,BAJFINANCE,POLYCAB,KPIL}.json)
For each promised-vs-delivered item: open the cited quote and decide, using ONLY that quote and the stated actual,
whether the verdict (met / missed / slipped / quietly_dropped / pending / raised / cut) is right. Return a table:
symbol | metric | verdict shown | your verdict | reason (<=20 words) | severity (wrong / debatable / fine).
Flag any number in the reason that is not in the quote. Do not use outside knowledge of the company.
```

```
GPT-2 Spot-check the 10 results cards (attach frontend/public/data/filings/*.json whose enrichment.type = "results",
and handoff/D5-results-checks.csv)
For each card re-add the four metrics from the printed figures only: revenue, EBITDA, PBT, PAT, QoQ %, YoY %.
Return: company | metric | our value | recomputed | difference | OK or CHECK. Banks must show no EBITDA.
Treat cross_check = mismatch as a flag to explain, not an error (ICICI PAT ~6% is known: attributable vs total basis).
```

```
GPT-3 Management-change cards (attach every filings/*.json with enrichment.type = "bio")
For each: is person / role / change (appointed|resigned|retired) / effective date right per the filing headline?
Is every background line about the person's career (not the event, not a departure reason)? Return a table + the exact
lines to drop. Known: Maruti and Asian Paints have empty backgrounds on purpose.
```

```
GPT-4 Final writeup (attach docs/SUBMISSION_DRAFT.md, README.md, docs/PLAN.md, handoff/G5-covering-email-outline.md)
Audience: ENAM's hiring panel for an AI engineer role; they judge product sense, judgment, architecture and cost efficiency.
Rewrite the covering email (<=250 words) and the one-page writeup. Rules: no hype words, every number must come from README
(190 LLM calls, 54.4% cache hits, Rs 0, 6 to 8 calls per new ticker, 84.6% of filings classified by rules), say plainly what is
partial (free-tier quotas; unseen tickers can return a partial report with a stated gap; ICICI PAT basis mismatch flagged).
Structure: thesis > what I built (Push, Pull) > the 3 decisions I am proudest of > what I would do next > links.
Keep placeholders [RENDER_URL] [PAGES_URL] [REPO_URL] for me to fill in.
```

```
GPT-5 UX critique (attach 6 phone screenshots from Antigravity: Today portfolio, Today watchlist, results card,
management card, Research INFY, Ask)
Judge against "a triage desk, not a news feed": can an investor see what needs them and why within 3 seconds?
Return the 5 highest-value fixes ranked, each as one concrete UI instruction Antigravity can follow
(<=25 words). No redesigns, no new features.
```

## Owner: Claude Code (me)
| # | Task | When |
|---|---|---|
| C-1 | Merge Antigravity's `frontend/portfolio-toggle` into main, run build + tests, verify the snapshot still renders with the API off | after AG-1..3 |
| C-2 | Apply fixes from GPT-1/2/3 (drop wrong verdicts, fix cards, re-run `refresh_snapshot` + `export_seed`) | after the GPT reports |
| C-3 | After deploy: check `/debug/sources`, `/health` mode, cold-start time and the fresh-disk seed restore on Render; fix any cloud-only failure | after U1 |
| C-4 | Update README/PLAN counts, finalise `docs/ai-history/README.md`, run `/finn-demo-check` then `/finn-submission` | 14 Nov |

## Order
1. Now, in parallel: U1+U2 (you), AG-1..3 (Antigravity), GPT-1..3 (ChatGPT).
2. Then: C-1, C-2, AG-4/AG-5, GPT-5, C-3.
3. 14 Nov: GPT-4, C-4, U4, U5, U6 (send).
4. 15 Nov: submit-only day. No new features.

## Cut line (if time runs short, drop in this order)
GPT-5, AG-2 sort/search, AG-5 install prompt, GPT-3. Never drop: U1-U3, U6, C-3, AG-1, AG-3.
