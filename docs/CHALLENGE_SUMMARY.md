# FINN – ENAM AI Engineer Build Challenge: Summary

Source: `ENAM_AI_Engineer_Build_Challenge_Main.pdf` + `ENAM_Build_Challenge_Reference.pdf`

- **Released:** 8 Nov 2026 · **Deadline:** 15 Nov 2026
- **Submit to:** assessment@enam.com, subject **"IIT Delhi – AI Engineer - 2027"**
- **Graded on:** how you build, what you choose to build, creativity, product sense, judgment, architecture. NOT completeness/polish. "Thin-but-working beats broad-but-broken. A demo that doesn't run is the worst outcome."

## The product
**FINN** – mobile-first financial investment agent for a public-markets investor. Core idea: *filtering*, not aggregating. Show the few things that matter, bury the rest, beautifully. Should feel like something an investor reaches for daily.

Two modes: **Push** (proactive: what changed + why care) and **Pull** (on-demand research).

## Companies
- Mock portfolio: **15–20 NSE/BSE stocks**, mixed sectors/sizes.
- Ad-hoc research demo: **3–5 companies** (may be outside portfolio).
- Engine must **generalise to any NSE ticker** – they may test one you didn't pick.

## Backend (guided, "plumbing not the point")
1. **EOD price & volume** – yfinance (`RELIANCE.NS` / `.BO`) or equivalent.
2. **Corporate announcements** from NSE/BSE. Category taxonomy in reference doc (use/adapt/ignore).
3. **Fundamentals** – annual reports + concall transcripts via screener.in links (or company IR site).

## Frontend (the heart – "deliberately yours")
### Push
1. **Windowed digest** – user-selectable window (default 24h) of all filings across portfolio, prioritised; routine stuff collapsed/hidden.
2. **Triggered alerts**, user-configurable thresholds:
   - material announcement of types I care about (results, M&A, mgmt change…)
   - unusual EOD move: volume > ~2× recent avg, or price move beyond ±X%.
3. Presentation examples they love:
   - **Management change** → short bio/background of incoming person (e.g. LinkedIn-style). Push-side enrichment from outside sources is OK.
   - **Quarterly results** → from the actual filing, headline **Revenue, EBITDA, PBT, PAT**, this quarter vs **QoQ** and vs **YoY**.
   - Other types: your judgment – one-line summary vs just surface the filing at right priority.

### Pull (menu – pick what to build, depth is your call)
Business snapshot · Financial snapshot · Trajectory · Balance sheet · Cash quality · Narrative vs numbers · Guidance · Bull vs bear.
- **Most-valued example:** last 4 quarters – management's guidance/growth commentary **promised vs delivered**.
- **Hard rule:** ground ONLY in primary sources (annual reports + concall transcripts). **No broker notes, news, research reports, and no reliance on the model's own outside knowledge of the company.**

### Interaction model
Open-ended; experiment (chat, voice, copilot, dashboard, something new). Mobile-first. Best submissions show a **point of view** on how an investor should interact.

## The bar
"No AI slop": core, concise, beautiful, interactive, dense, thoughtful. Design and density both count.

## Tools / cost
- Any models allowed; **choice of tool per step is evaluated**.
- Doable on free tiers. **Efficiency = bonus**: model routing (cheap for bulk extraction, strong only for reasoning), caching, chunking.

## Deliverables (email)
1. Mobile-first prototype – deployed link / Expo / TestFlight / responsive web; easy to open on a phone.
2. GitHub repo.
3. **AI build history** – Claude Code / Cursor / ChatGPT exports or share links.
4. Short writeup in email: what built, key decisions & trade-offs, what deliberately left out, next steps.

## Reference doc essentials
- **Announcement categories (18):** results, M&A, fund_raise, management_change, litigation, insider_trading, earnings_call, investor_meetings, credit_rating, dividend, bonus_split, capex, press_release, postal_ballot, agm_egm, pledging, unclassified (routine paperwork: ESOP allotments, compliance certs, ESG, auditor appointments).
- **Docs:** Annual Report (richest primary source: MD&A, P&L/BS/CF, notes, auditor report), quarterly results, concall transcript (guidance, tone, analyst pressure points), investor presentation, exchange filing, screener.in.
- **Terms:** Revenue; EBITDA (operating profit proxy); PBT; PAT; margin; QoQ; YoY. D/E; working-capital cycle; cash conversion (CFO vs PAT); FCF = CFO − capex; ROCE/ROE; contingent liabilities; RPTs; auditor's qualification; promoter pledging (risk signal); record date; bonus/split; buyback; rights/QIP/preferential.
