# FINN UI Round 2: GPT-8 & GPT-9 Copy Integration

## 1. Scope & Deliverables
The copy written by ChatGPT in `handoff/GPT-8-help-copy.md` and `handoff/GPT-9-thresholds-copy.md` has been integrated into the FINN frontend in worktree `D:\Repos\ENAM-AI-TEST-fe` on branch `frontend/ui-round-2`.

---

## 2. GPT-8 Today Help Sheet (`HowToReadSheet.tsx`)
- **Title**: `How to read Today`
- **Intro**: `Choose a period, then decide whether to scan events or companies.`
- **Period**: `BSE filing time in IST: past 24 hours, 3, 7 or 30 days maximum.`
- **View**: `Choose how to group or sort filings from the same period.`
  - **Priority feed**: `Ranks filings across your 17 holdings by what needs attention first.`
  - **By company: important first**: `Shows each stock’s material filing count; its highest-ranked filing determines its place.`
  - **By company: A–Z**: `Lists companies alphabetically by stock symbol.`
- **Needs you**: `Up to five top-ranked events; repeat filings about the same event share one card.`
- **Also material**: `Other high- or medium-priority filings outside the top group.`
- **Routine**: `Remaining filings, folded away until you open them.`
- **Holdings only (tooltip)**: `The priority feed covers your holdings. View watchlist filings by company.`
- **Auto-scroll / highlight**: Supported when triggered via `?` next to "Needs you" or `?helpSection=needs_you`.

![Help Sheet](file:///~/.gemini/antigravity/brain/6b5773e6-4806-4a7a-a6a6-b18a9519bf75/ui8-help-sheet.png)

---

## 3. GPT-9 Alerts & Thresholds (`ThresholdsScreen.tsx`)
- **Summary Template**: `Alerts start at {volume}× average volume or a {price}% move either way; filing types: {boosted} boosted, {hidden} hidden.`
  - Rendered with defaults: `Alerts start at 2× average volume or a 5% move either way; filing types: 6 boosted, 1 hidden.`
- **Accordion Row Titles & Helpers**:
  - `Volume spike` · `Compare today’s volume with its 20-day average.`
  - `Price move` · `Compare today’s closing price with the previous close.`
  - `Filing types` · `Choose which filings rank higher or stay in Routine.`
- **Filing Types & Helpers (17 categories)**:
  - **Core Corporate Events (8)**:
    - *Financial results*: `Quarterly or annual revenue, profit and other results.`
    - *M&A*: `Deals to buy, sell or merge businesses.`
    - *Fund raise*: `Plans to raise money through shares or debt.`
    - *Management change*: `Executive or board appointments, departures and role changes.`
    - *Litigation*: `Legal disputes, rulings and settlements.`
    - *Insider trading*: `Disclosed trades by company insiders.`
    - *Promoter pledging*: `Promoter shares given as collateral or released.`
    - *Credit rating*: `Ratings or outlooks on company debt.`
  - **Routine Paperwork (9)**:
    - *Earnings call*: `Call notices, recordings and transcripts about results.`
    - *Investor meetings*: `Meetings with investors or analysts.`
    - *Dividend*: `Dividend proposals, amounts and payment dates.`
    - *Bonus or split*: `Bonus shares or changes in share face value.`
    - *Capital spending*: `Spending plans for plants, equipment or expansion.`
    - *Press release*: `Company announcements issued to the press.`
    - *Postal ballot*: `Shareholder votes held outside a general meeting.`
    - *AGM or EGM*: `Notices and outcomes of shareholder meetings.`
    - *Unclassified*: `Filings without a recognised category.`
- **Setting Explanations (Boost / Normal / Hide)**:
  - *Boost*: `Ranks these filings higher and can trigger a material filing alert.`
  - *Normal*: `Keeps the usual ranking without triggering an alert for this filing type alone.`
  - *Hide*: `Keeps these filings in Routine and turns off their filing alerts.`
- **Reset Confirmation Dialog**:
  - *Title*: `Reset alert settings?`
  - *Message*: `Restore the 2× volume and 5% price thresholds, boost the six default filing types and hide Unclassified. This replaces your choices.`
  - *Buttons*: `Keep my settings` · `Reset to defaults`

````carousel
![Thresholds Collapsed](file:///~/.gemini/antigravity/brain/6b5773e6-4806-4a7a-a6a6-b18a9519bf75/ui9-thresholds-collapsed.png)
<!-- slide -->
![Volume Spike Expanded](file:///~/.gemini/antigravity/brain/6b5773e6-4806-4a7a-a6a6-b18a9519bf75/ui9-thresholds-volume.png)
<!-- slide -->
![Filing Types Expanded](file:///~/.gemini/antigravity/brain/6b5773e6-4806-4a7a-a6a6-b18a9519bf75/ui9-thresholds-categories.png)
<!-- slide -->
![Reset Confirmation Dialog](file:///~/.gemini/antigravity/brain/6b5773e6-4806-4a7a-a6a6-b18a9519bf75/ui9-thresholds-reset.png)
````

---

## 4. Verification & Status
- **Build**: `npm run build` completed cleanly in 6.47s with 0 errors.
- **Backend Tests**: 302 tests passed in `uv run pytest -q`.
- **Git Commit**: `23e7f59` pushed to `origin/frontend/ui-round-2` without `Co-Authored-By` trailer.
