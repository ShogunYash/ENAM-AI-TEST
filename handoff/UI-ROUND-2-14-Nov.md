# UI round 2, 14 Nov 2026: Today controls + Thresholds (owner's phone review)

Live site: https://enam-ai-test.pages.dev/ . No backend or contract change is needed (checked: `score.py` gives a muted category
weight 0 and hides it, a boosted one x1.5, muted wins if both; `/digest` already takes `interests` and `muted` query params).

## Design decisions (Claude Code's judgment on the owner's requests)
1. **Today's stack is too tall.** Today currently spends 4-5 rows on controls (scope, window, chip, search, sort) before the first
   filing. Collapse into ONE compact toolbar of two rows, and put search behind an icon.
2. **"Time" and "sort" are different things, so do not merge them into one menu.** Keep a Period control (24h / 3d / 7d / 30d;
   the owner's "all" = 30d, the longest window we hold, label it "30d · all") and add a separate View control that says how to
   arrange it: **Priority feed** | **By company, important first** | **By company, A-Z**. Both are small dropdown chips.
3. **One help affordance:** an (i) icon opens a bottom sheet "How to read this" that defines every term (copy from ChatGPT, GPT-8).
4. **Thresholds is a settings list, not a wall of chips.** Each setting is one summary row that expands (accordion) on tap.
5. **Boost and Mute are opposites, so one control per category with three states: Boost | Normal | Hide.** This replaces the two
   chip lists, so a category can never be in both. The stored Settings keep their two arrays (`categories_of_interest`,
   `muted_categories`); the UI writes them from the tri-state. Old saved settings that contain a category in both arrays are
   normalised on load: **muted wins** (same as the backend).

## Antigravity (frontend/ only, branch `frontend/ui-round-2`, one commit per item)
Paste this block.

```
Read AGENTS.md and .claude/skills/finn-ui-principles/SKILL.md. Test at 360x780 and 390x844. Do not touch backend/, docs/, data/.
Wording comes from handoff/GPT-8-help-copy.md and handoff/GPT-9-thresholds-copy.md when they exist; use the placeholders below until then.

UI-7 Today toolbar
- Row 1: [My portfolio | Watchlist] segmented control (unchanged) on the left; on the right the LIVE/SNAPSHOT chip
  ("14 Nov, 2:50 am · LIVE", one line) and the refresh icon. No separate row for the chip.
- Row 2 (all small chips, 44px tap height, one line): [Period: 24h v] [View: Priority v] [search icon] [(i) icon].
  - Period dropdown options: "24 hours", "3 days", "7 days", "30 days (all)". Selected value shown on the chip as 24h/3d/7d/30d.
  - View dropdown options: "Priority feed" (Needs you / Also material / Routine, the digest), "By company: important first",
    "By company: A-Z". The chip shows "Priority", "Companies", "A-Z".
  - "Priority feed" is available for every period and every scope; for Watchlist it falls back to a by-company list (there is no ranked
    digest for the watchlist) and the dropdown disables it with the hint "Holdings only".
  - Remember Period, View and scope in localStorage; keep the existing URL query-param support.
- Search: tapping the icon expands a single input row under the toolbar (symbol or sector); X clears and collapses it.
- The "17 of 17 filed in 30d" count line moves to the end of the toolbar row or under the list header, one line, muted.
- Net effect: the first filing card must start at least 150px higher than today at 360x780.

UI-8 Help sheet ("How to read this")
- The (i) icon opens a bottom sheet (swipe/tap outside to close) with short definitions: Period (what 24h/3d/7d/30d count,
  IST), View (Priority feed / Important first / A-Z), and the three buckets Needs you / Also material / Routine.
- Content from GPT-8; render as a definition list, max ~12 lines, no scrolling needed at 390x844.
- Also add a small "?" next to the "Needs you" header that opens the same sheet scrolled to that term.

UI-9 Thresholds as expandable rows
- Top summary line, one sentence: "Alerting on volume >= 2.0x, price +/-5.0%, 5 boosted filing types".
- Three accordion rows, collapsed by default, each row = title + current value on the right + chevron; tapping expands in place
  (only one open at a time):
    1. "Volume spike"  value "2.0x"   -> existing preset chips + slider
    2. "Price move"    value "+/-5%"   -> existing preset chips + slider
    3. "Filing types"  value "5 boosted · 1 hidden" -> the category editor below
- Filing types editor: one row per category (17), label on the left, a 3-way segmented control on the right: Boost | Normal | Hide.
  - Boost writes the category to categories_of_interest only; Hide writes it to muted_categories only; Normal removes it from both.
  - Never show a category as both. On load, if a saved setting has a category in both arrays, keep it in muted_categories only.
  - Group rows under two small headers so the list is scannable: "Core" (results, M&A, fund raise, management change,
    litigation, insider trading, pledging, credit rating) and "Routine paperwork" (the rest). Core group open, other collapsed.
  - Remove the separate "Muted categories" section entirely.
- Helper text under each row title comes from GPT-9 (one short line, muted colour). Keep the existing "Reset to defaults" at the bottom.
- Default state must match today's defaults (types.ts DEFAULT_SETTINGS: 6 boosted, unclassified hidden).
- Verify: changing a tri-state updates Today immediately (digest refetch with interests/muted params, offline recompute still works).

UI-10 Report back with 390x844 screenshots of: Today (new toolbar, each View), the help sheet, Thresholds collapsed, Volume
expanded, Filing types expanded. Run the existing browser suites and the offline test (API stopped).
```

## ChatGPT (never commits; paste outputs back to Claude Code)

```
GPT-8 Help copy for Today (attach a screenshot of the current Today screen and this section)
Facts to use (do not invent others): the digest covers the investor's 17 holdings only. Windows count filings by BSE filing time
in IST: 24h, 3d, 7d, 30d (30d is the longest window we store). Filings are classified into categories by rules first, then a cheap
model. Priority score = category weight x interest (boosted categories count 1.5x, hidden categories 0) x price-reaction boost x
recency (half-life 72 hours). "Needs you" = the top 5 by score, one card per company event (repeat filings of the same event are merged);
"Also material" = other high or medium priority filings; "Routine" = everything else, collapsed. By-company view lists each stock with
its material count, "Important first" orders companies by their highest-scoring filing, "A-Z" orders by symbol.
Write: (1) a one-line explanation for each of: Period (24h / 3d / 7d / 30d), View, Priority feed, By company: important first,
By company: A-Z, Needs you, Also material, Routine. Max 14 words each, plain English, no jargon. (2) A bottom-sheet title and a
one-sentence intro. (3) Tooltip text for the "Holdings only" disabled option. Output as a table: term | text.
```

```
GPT-9 Thresholds copy (attach screenshots of the current Thresholds screen)
Facts: volume spike = today's volume is at least N times its 20-day average (choices 1.5x to 5x, default 2x); price move =
daily close moves at least X% either way (choices 2% to 10%, default 5%); each filing type can be Boost (ranks higher and can
trigger a "material filing" alert), Normal, or Hide (always collapses into Routine, never alerts). 17 filing types:
results, M&A, fund raise, management change, litigation, insider trading, earnings call, investor meetings, credit rating,
dividend, bonus/split, capex, press release, postal ballot, AGM/EGM, pledging, unclassified.
Write: (1) the one-sentence summary line template for the top of the screen, (2) a title + one muted helper line (max 10 words)
for each of the three accordion rows, (3) a helper line (max 8 words) for each of the 17 filing types that says what the investor
would see (e.g. "Quarterly numbers, revenue to profit"), (4) the labels for Boost / Normal / Hide and a one-line explanation of each,
(5) the "Reset to defaults" confirmation text. Output as tables. Do not suggest new settings.
```

```
GPT-10 Final phone QA script (after Antigravity finishes; attach the 390x844 screenshots)
Review the screenshots as a first-time investor. List (a) anything truncated, clipped or overlapping, (b) any control whose
purpose is unclear without the help sheet, (c) any place where two controls can contradict each other, (d) the single most
confusing term on each screen. Max 12 bullets total, each with the screen name and a concrete fix <= 20 words.
```

## Claude Code (me), after both finish
Merge `frontend/ui-round-2`, build, run the browser suites + offline test, check the settings migration (a saved state with a category
in both lists), screenshots at 360px, push, confirm the live Pages site serves the new bundle.
