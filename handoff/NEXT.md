# NEXT (overwrite each round): the Network layer, branch `network`, 15 Nov 2026

Backend, contract, examples, snapshot export and docs/ARCHITECTURE.md are DONE on branch `network` (320 tests pass).
Contract: docs/CONTRACT.md "Network" rows; examples: docs/examples/network-*.json; snapshot: frontend/public/data/network/*.json.
The demo network is SYNTHETIC (data/network.json, 10 seed people). Never present it as real people.

## Antigravity (frontend only; run in the ../ENAM-AI-TEST-fe worktree: `git checkout -b frontend/network network`)
```
Read AGENTS.md, .claude/skills/finn-ui-principles/SKILL.md and docs/CONTRACT.md (Network rows + changelog). Test at 360x780 and 390x844,
light and dark. Types: regenerate with openapi-typescript docs/openapi.json (or add to api/types.ts). Edit only frontend/.
Data layer (api/client.ts): live API first, snapshot fallback, same pattern as the rest:
  getNetworkInsights() -> /network/insights | /data/network/insights.json   (index by NetworkInsight.key = filing id)
  getNetworkCompany(sym) -> /network/company/{sym} | /data/network/companies/{sym}.json
  getNetworkWarm(), getNetworkExpertise(), getNetworkPeople()  (same pattern)
  askNetwork(q) -> POST /network/ask (live only; offline: show "needs the live API" and the expertise chips)

NW-1 Woven into Push: on a filing card whose id has a NetworkInsight, add an "In your network" strip under the card body.
  Collapsed = one line: people icon + insight.headline + chevron. Expanded = up to 3 matches: name, headline, strength as 5 dots,
  the `why` line, and the `evidence` facts in small muted text; show insight.note (amber, small) when present.
  management_change cards: the headline names the subject ("2 contacts overlapped with Prashant Verma").
  material_event cards: show "Best person to call" first. Cards without an insight are unchanged.
NW-2 Woven into Pull: on the Research detail page (any status, also while building), under the header card add "Who to call about
  {company}" (getNetworkCompany): top 3 matches, same match row component as NW-1.
NW-3 Network tab: 5th bottom-nav tab "Network" (Users icon; keep the 4 existing tabs, shrink labels if needed at 360px).
  Top: "Ask your network" input + chips ("Who knows Bajaj Finance?", "wires and cables", "Who should I reconnect with?").
  Result: the answer sentence, match cards, and a collapsed "How FINN found this" listing `steps` (tool + summary).
  Below: "Keep warm" = WarmNudge cards (name, "last spoke N days ago", trigger line, the opener text with a Copy button),
  then "Expertise map" = theme chips sorted by member count; tapping a chip lists its members and the tracked companies.
  Header line: "Synthetic demo network · {N} people" (small, muted) so nobody mistakes it for real contacts.
NW-4 Person sheet: tapping any person name opens a bottom sheet: headline, city, jobs timeline (org, role, years; mark tracked
  companies), education, expertise tags, "How you know them" and last contact. Reuse the existing sheet pattern.
NW-5 Profile screen: add a "Your network is private to you" card: 3 short lines (stored per investor, never used to train models,
  you can delete it), plus the synthetic notice. Copy: GPT-14 if it exists, else keep it plain.
Strength dots, link badges (worked at / overlapped / same school / expert) must not rely on colour alone. No new colours beyond the theme.
Run the three browser suites and the offline test. Report with 390x844 screenshots of NW-1 (management + event), NW-2, NW-3, NW-4.
```

## ChatGPT (never commits)
```
GPT-12 Expand the synthetic network (attach data/network.json and data/portfolio.json)
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
```
GPT-13 Privacy and architecture review (attach docs/ARCHITECTURE.md and the brief section "Architecture, data security & privacy")
Act as a privacy-minded CTO reviewing this page for a hiring panel. List (1) claims that overstate what the demo actually does,
(2) missing risks (consent for third-party profile data, retention, re-identification, prompt leakage, access control),
(3) wording to tighten, max 12 bullets, each with the exact replacement sentence. Do not add features. Keep "what the demo does"
and "what a real deployment would do" clearly separate.
```
```
GPT-14 Network copy (attach a screenshot of the Network tab when it exists, else this file)
Write: the "Your network is private to you" card (3 lines, max 14 words each), 3 chips for the question box, the empty state
for "no matches", the offline message for the question box, and the one-line label for each link type (worked at / overlapped /
same school / expert) with a tooltip sentence. Plain English, no hype.
```

## Claude Code (me), after both
Merge `frontend/network` into `network`, build, run suites, check both themes at 360px, regenerate snapshot with the 36-person file,
update README, SUBMISSION_DRAFT (Founding subject + Network paragraph + link to docs/ARCHITECTURE.md), then merge `network` into `main`.
