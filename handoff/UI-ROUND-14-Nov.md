# UI round, 14 Nov 2026 (owner's phone review of the deployed site)

Live site: https://enam-ai-test.pages.dev/ (use this, NOT the `0405d6eb.` URL: that is an old frozen deployment).
The PWA caches itself: after a deploy, close the tab and reopen (or clear site data) to get the new build.

Already done by Claude Code (pushed): results table now fits 320-360px (unit moved to the `₹ Cr` header, "derived" under EBITDA, no wrapping). Antigravity: confirm it on the live site, including inside the company drill-down.

## Antigravity (frontend/ only, branch `frontend/ui-round-14nov`, one commit per item, no backend/docs/data edits)
Paste this block.

```
Read AGENTS.md and .claude/skills/finn-ui-principles/SKILL.md. Test at 360x780 and 390x844. Use the main-tree API.

UI-1 Results table YoY (verify only)
- ResultsCardPayload.tsx was fixed so the YoY column is no longer clipped. Confirm on Today (24h/3d/7d), By-company
  drill-down (30d) and the Watchlist drill-down, for ASTRAL, PERSISTENT, TCS, ICICIBANK. If any row still clips, fix it.

UI-2 Results card: one link, not two
- The green "Revenue, PBT, PAT checked (p. N)" badge and the "Source PDF" button open the SAME PDF.
- Make the badge plain text (no link, no external-link icon): "Revenue, PBT, PAT checked vs screener.in".
- Keep exactly one link: the bottom "Source PDF" button; when the card has source.page show "Source PDF · p.14".
- Mismatch badge stays amber and tappable (it reveals the note). Other filing cards unchanged.

UI-3 "as of" chip
- Remove the words "as of". Show only "14 Nov, 1:24 am · LIVE" (or "· SNAPSHOT") on a SINGLE line, small mono text.
- Stop it from taking its own row: put it on the same row as the 24h/3d/7d/30d picker (right aligned), or in the header
  under/next to the FINN logo. Today should gain at least ~60px of vertical space. The refresh icon stays.
- Same treatment on every screen that shows the chip (Today, Research, Cost).

UI-4 Cost screen layout (the one titled "LLM Cost & Efficiency Ledger")
- The title is squeezed into a narrow column beside the chip. Make the title span the full width, one or two lines
  ("LLM cost & efficiency"), subtitle underneath on one line, the live chip on the row below or right-aligned inline.
- Use the width: the two stat tiles side by side stay, but tighten padding and drop the long captions
  ("100% Free Tier (Gemini & Groq)" -> "Free tiers only"; "Zero marginal cost for repeated filings" -> remove).
- The calls / tokens / avg-calls / dropped list becomes a compact 2x2 grid of label+value (no wide empty gaps).
- Rename "Unverified Quotes Dropped 193 claims" to "Claims rejected by the quote check" (value in neutral colour,
  not red: rejecting is the system working).
- "Router calls by model": one compact row per model (name, calls, tokens), no per-row spend line when it is 0;
  hide models with 0 calls under a "Not used yet" fold.
- Goal: the whole Cost screen fits in about two phone screens.

UI-5 Research home: choose a company, then open its report
Current: a text box plus two rows of chips. Replace with:
  1. Search box on top ("Any NSE ticker"), unchanged behaviour (live build; show the build-progress steps).
  2. Segmented control: "My portfolio" | "Watchlist" | "Pre-built".
     - data: companies.json (in_portfolio flag) and meta.json research_symbols (the pre-built list).
     - My portfolio = in_portfolio true (17). Watchlist = in_portfolio false (10). Pre-built = research_symbols (4).
       Default tab: "Pre-built" if the user has never picked, afterwards remember the last tab (localStorage).
  3. Each row: SYMBOL, company name, sector (muted), and a status chip on the right:
       - pre-built  -> "Full report" (green) and, if research/{SYM}.json is available, a one-line verdict summary
         such as "5 pending · 1 cut" computed from pvd[].verdict (no new API).
       - not pre-built -> "Financials only" (muted). Tapping it still runs the live build; when the report comes back
         partial, show its gaps list (already built) at the top, not at the bottom.
  4. Tapping a row opens that company's research (existing detail), with a back arrow to the list that keeps the
     tab, scroll position and search text.
  5. Sort inside a tab: pre-built first, then A-Z. Count line "4 of 17 have a full report".
- Do not add new endpoints. Do not change the research detail layout except the back arrow and gaps-first rule.

UI-6 Report back with 390x844 screenshots for UI-2, UI-3, UI-4, UI-5 and the result of the offline test
(stop the API: Today and Research lists still render from the snapshot).
```

## ChatGPT (never commits; paste outputs back to Claude Code)
Two short tasks. Attach the files named.

```
GPT-6 Research home: stock-market-user critique (attach 3 screenshots of the CURRENT Research screen from Antigravity)
The planned change: Research home becomes a search box + segmented control "My portfolio | Watchlist | Pre-built", each
row showing symbol, name, sector and a chip ("Full report" with a "5 pending · 1 cut" summary, or "Financials only"),
tapping opens the report. Judge it as a retail/PMS investor who wants "what did management promise and did they deliver?"
in under 10 seconds. Return: (1) what to keep, (2) what to cut, (3) the single best default tab and why, (4) exact chip
and empty-state wording (max 4 words per chip), (5) one honest sentence for partial reports ("transcripts unavailable on
this server") that does not sound like an error. No new features.
```

```
GPT-7 Cost screen wording (attach handoff/UI-ROUND-14-Nov.md UI-4 and a screenshot of the current Cost screen)
Rewrite every label on the Cost screen for a hiring panel that scores "cost efficiency": title, subtitle, 2 stat tile
captions, the 4 grid labels, the model-list heading, and the empty "Not used yet" fold. Max 5 words each, plain English,
no hype. Explain in one sentence what "Claims rejected by the quote check" means so a non-engineer understands that it is
a safety feature. Output as a table: current text | new text.
```

## Claude Code (me)
- After Antigravity's branch lands: merge, build, run its browser suites, re-check on 360px, push; confirm the live site picked it up.
- Apply GPT-6/7 wording if it needs backend strings (none expected).
