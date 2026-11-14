# NEXT (overwrite each round): the Network layer, branch `network`, 15 Nov 2026

Done on branch `network`: backend, contract, examples, snapshot export, docs/ARCHITECTURE.md, and the frontend DATA layer
(`frontend/src/api/network.ts` + types). The demo network is SYNTHETIC (data/network.json, 10 seed people).
Owner decision 15 Nov: **GPT writes the Network UI** (Antigravity stands down on it; it can be used later for QA only).

## GPT chat 1: the UI (this is the critical path)
Upload `handoff/GPT-UI-PACK.zip` (it contains BRIEF.md, the repo files it needs and 10 screenshots) and paste:
```
Read BRIEF.md in the zip and do exactly what it says. You are building the Network UI for an existing React + Tailwind PWA.
First read AGENTS.md, the finn-ui-principles skill, tailwind.config.js and index.css, then the data layer in api/network.ts and
the screenshots. Return one zip `finn-network-ui.zip` with only new or changed files (full contents, same relative paths) plus
CHANGES.md. If you can run `npx tsc -b` and `npm run build` in frontend/, do and report; if you cannot, say so.
```
When it returns: save the zip, tell Claude Code; Claude Code copies the files over, runs tsc, build, the 3 browser suites and screenshots at 360px, fixes small issues, commits.

## GPT chat 2 (parallel, separate chat): the data
Attach `data/network.json` and `data/portfolio.json` and paste the GPT-12 prompt below. Save its output over `data/network.json`; Claude Code re-runs `scripts.refresh_snapshot` and the tests.
```
Produce data/network.json with 36 people (keep the 10 seeds p01-p10 unchanged, add p11-p36). Same schema exactly: id, name, headline,
city, jobs[{org, nse_symbol|null, role, start_year, end_year|null}], education[{school, degree, year}], expertise[], relationship
{strength 1-5, how_met, last_contact YYYY-MM-DD}. Rules:
- Every person is FICTIONAL. Do not use real people; avoid every executive named in the filings (Anup Bagchi, Noel Tata, Prashant
  Verma, Sunil Vachani, Vikram Somany, V. Srinivasa Rangan, Leo Puri, Amit Uplenchwar, K. K. Maheshwari, Sanjay D'Souza, Sudhir Kumar Jha).
- Overlap with the portfolio: >= 2 people per tracked company in {BAJFINANCE, HDFCBANK, ICICIBANK, INFY, TCS, TATASTEEL, TITAN,
  POLYCAB, KPIL, DIXON, ASIANPAINT, MARUTI} and >= 1 for the other symbols in portfolio.json. Use exact NSE symbols in nse_symbol.
- Make HDFCBANK, ICICIBANK and BAJFINANCE contacts have long tenures (8+ years) that overlap 2004-2022 (our filings quote
  "22 years with HDFC Group", "21 years in security", "since 2002").
- expertise tags: lowercase, 2-4 words, reusing sector words from portfolio.json sectors (e.g. "specialty chemicals", "rural lending",
  "semiconductors", "wires and cables", "private banking"); 2-4 tags each; 14+ distinct themes, 2+ people for the main ones.
- relationship: strengths spread 1-5; at least 10 people with last_contact older than 60 days (and a former employer that is tracked);
  how_met specific and varied (alumni dinner, deal, conference, referral, batchmate).
- Schools: IIT Delhi, IIT Bombay, IIM Ahmedabad, IIM Bangalore, ISB, SRCC, BITS Pilani, NIT, ICAI; at least 4 people from IIT Delhi.
- Mix of men and women, Indian regions, mid-career to senior. Return ONLY valid JSON for the whole file, including "_note" and "as_of".
```

## GPT chat 3 (parallel, optional): privacy review of docs/ARCHITECTURE.md
```
Act as a privacy-minded CTO reviewing the attached docs/ARCHITECTURE.md for a hiring panel. List (1) claims that overstate what the demo
actually does, (2) missing risks (consent for third-party profile data, retention, re-identification, prompt leakage, access control),
(3) wording to tighten: max 12 bullets, each with the exact replacement sentence. Do not add features. Keep "what the demo does" and
"what a real deployment would do" clearly separate.
```

## Claude Code (me), after the zips come back
Apply UI zip, tsc + build + suites + 360px screenshots, apply the data file, regenerate snapshot, fold in the privacy review, update README and
SUBMISSION_DRAFT (Founding subject, Network paragraph, link to docs/ARCHITECTURE.md), merge `network` into `main`, push main, check Render and Pages.
Fallback if the UI cannot be finished in time: tag `ai-engineer-v1` is the Push + Pull version with the old subject line.
