---
name: finn-ui-principles
description: FINN's product and design principles for the mobile-first PWA — the "triage desk, not a news feed" thesis, screen inventory, card anatomy, Indian number formatting, density and anti-"AI slop" rules. Use when building, reviewing or critiquing anything in frontend/, writing UI copy, or deciding what a pushed item should show.
---

# FINN UI principles

**Thesis:** *FINN is a triage desk, not a news feed.* Every screen answers "what needs me, and why?"
within 3 seconds. Everything else is collapsed, one tap away. Design and density are graded.

## Screens (scope; don't add more without a reason)
1. **Today:** window picker (24h default · 3d · 7d · custom).
   - "Needs you" stack, at most 5 cards, ranked by priority score.
   - Price/volume alerts strip.
   - "Routine (n)" collapsed group.
2. **Filing detail:** the card's full view plus a link to the source PDF.
3. **Alerts & thresholds:** volume multiple (default 2×), price move ±X% (default 5%), and category toggles for what I care about.
4. **Research (any ticker):** financial snapshot header, then the Promised-vs-Delivered timeline, then other modules if they exist.
5. **Cost:** LLM calls, tokens, cache-hit % and calls per new ticker. This is part of the cost story.
6. *(stretch)* Copilot bottom sheet, which knows the card or company on screen.

## Card anatomy (Push)
```
[Company · category chip · time ago]            [priority dot]
Headline rewritten as the "so what" (≤ 70 chars)
Payload by type:
  results  → 4×3 mini table: Rev / EBITDA / PBT / PAT × value, QoQ, YoY (+ mismatch badge if screener disagrees)
  mgmt     → incoming person: name, role, 2-line background, source link
  other    → one line of why it matters, or nothing if the headline says it all
[Source PDF ↗]   [Ask FINN]
```

## Formatting
- **Money:** ₹ crore with Indian grouping (`₹1,23,456 Cr`). Use crore for company figures, never "million".
- **Percent:** always signed with one decimal (`+12.4%`, `−3.1%`). Use a true minus sign.
- **Colour:** green and red **plus** ▲/▼ arrows so it's colourblind-safe. Neutral grey for flat (|Δ| < 0.5%).
- **Numbers:** right-aligned with tabular figures (`font-variant-numeric: tabular-nums`).
- **Time:** relative within 24h ("3h ago"), otherwise `12 Nov`. All times are IST.

## Layout and density
- Design at **390×844** first, then check at 360 width. Use bottom nav and thumb-reachable actions.
- Body text 15–16px, with 12–13px secondary text at no less than 4.5:1 contrast. Support dark mode.
- A card fits on screen without scrolling. Card copy is at most 2 lines; details go on tap.
- Skeleton loaders, not spinners. Every list has a designed empty state
  (e.g. "Nothing material in the last 24h · 14 routine filings hidden").

## Anti-slop rules (reject in review)
- No "AI Insights ✨" headers, emoji spam, or gradient blobs.
- No paragraphs on cards. No restating the headline as a summary.
- Never say "This could impact the stock price". Say *what* changed and *by how much*.
- Don't show a number without its comparison (QoQ/YoY, or versus guidance).
- No claim without a source chip on Research screens (see `finn-grounding`).
- Use one accent colour, at most two type weights per card, and no decorative icons.

## Copy voice
Terse, specific, analyst-like. For example: "PAT +18% YoY, beat on margins; revenue flat QoQ".
Not: "The company reported strong results this quarter."
