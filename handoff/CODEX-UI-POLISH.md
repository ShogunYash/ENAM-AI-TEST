# Task for Codex: one bounded UI polish pass (15 Nov 2026, deadline day)

Goal: the app already works. Make it feel denser and calmer without changing behaviour. This is a polish pass, NOT a redesign.
Work in your worktree `D:\Repos\ENAM-AI-TEST-codex` on a new branch `codex/ui-polish` (Claude Code creates it from `main`). Never touch `main`. Do not push.

## Read first
`AGENTS.md`, then `.claude/skills/finn-ui-principles/SKILL.md`, especially the new section **"Measurable rules"** (type scale, spacing grid, density budget,
colour roles, states). Those numbers are the standard you are judged against. Theme tokens are in `frontend/tailwind.config.js` and `frontend/src/index.css`;
use only those, no new colours, no inline hex.

## Method (the loop; do it for each screen you touch)
1. Look at the "before" screenshots in `handoff/ui-ref/` (untracked; 390x844, light and dark; named `before-*.png`).
2. List at most 5 concrete problems against the Measurable rules (write them in `handoff/CODEX-POLISH-NOTES.md`).
3. Fix only those. 4. Re-screenshot at 390x844 and 360x844 in light AND dark (headless Chrome over CDP like `frontend/scripts/test-network.js`,
   or any method you like) and save as `after-*.png` in `handoff/ui-ref/` (do not commit screenshots). 5. Say what you did not fix.

## The five changes (in this order; stop after any one if the build or tests break and say so)
1. **Network > Keep warm:** show the first 3 cards, then one row "Show all (N)" that expands in place. Card padding 12, row <= 140px collapsed.
2. **Network > Expertise map:** show the 8 largest themes (the data is already sorted by member count), then a "More themes" row, and a small
   search input that filters all 55 themes by text. Tapping a theme still reveals its members and tracked companies.
   NOTE: "wires and cables" is theme #30 of 55, so `frontend/scripts/test-network.js` check 2 must use the search or "More themes" first.
   You MAY edit that one script, minimally and only for this reason; say so in the notes.
3. **Consistent density on Network, Settings (ThresholdsScreen) and Profile:** card padding 12 (not 16+), gaps 8, row heights within the budget,
   only the five font sizes from the type scale, `text-stock` only for tickers/company names, `brand` only for the one primary/selected thing.
4. **Today empty state:** when the chosen window has nothing in "Needs you", replace the tall dashed box with one compact line
   ("Nothing material in the last 24h") and, directly under it, one muted summary line for the last 30 days
   (e.g. "30 days: 237 filings · 5 need you"). Use the existing `getDigestData('30d', settings)` through react-query (already works offline from
   the snapshot). No new API, no new fields. If the 30d data is not ready, show only the first line.
5. **States:** make sure the Network tab, Research "Who to call" and the person sheet each have a skeleton/empty/unavailable state that is one calm line
   (no red text, no raw error strings).

## Hard constraints
- Behaviour, data, routes and text that the tests look for must not change, except as noted in change 2.
- No new dependencies. TypeScript strict, no `any`. Do not edit `frontend/src/api/*`, `backend/`, `docs/`, `data/`.
- Tap targets >= 44px, contrast >= 4.5:1, colour never the only cue, `prefers-reduced-motion` honoured, works at 360px with no horizontal scroll.
- Commit in small steps on `codex/ui-polish` ("UI polish: Keep warm collapse"). No Co-Authored-By or AI attribution lines.

## Done means
- `npx tsc -b` and `npm run build` pass in `frontend/`.
- These pass against your dev server (port 5199 is free for you; Claude Code stopped its own):
  `node scripts/test-portfolio-watchlist.js`, `node scripts/test-offline-by-company.js`, `node scripts/test-ag6-fixes.js`, and
  `FINN_DEV_URL='http://localhost:5199/?nosplash' node scripts/test-network.js` (all 8 checks).
- `handoff/CODEX-POLISH-NOTES.md` (commit it) lists: the problems you found, what you changed, what you left, and the exact test results.
