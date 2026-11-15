# Task for Codex: make every part of the app visually distinct (free hand, time-boxed)

## The problem (owner's words, 15 Nov)
"The app shows things and they all look the same and are not distinct. In the Network section every piece of information feels related, there is no
delimiter between things. I want that." Today most screens are a stream of near-identical blocks: same surface, same padding, same weight, same colour.
You cannot see where one section ends, which block is a person, a filing, an alert or a research claim, or what the one important thing is.

## Your freedom
You have a **free hand** to redesign the *presentation* of every screen: layout rhythm, section structure, card and row anatomy, surface levels, dividers,
icons, avatar and chip shapes, left rails, typography emphasis, and the Network, Today, Research, Settings, Profile and Cost screens. Add new design tokens
(CSS variables in `frontend/src/index.css` + `frontend/tailwind.config.js`, defined for BOTH light and dark) if you need them, and new small components.
You may change spacing rules from the earlier density pass where they hurt separation (keep the app compact, not cramped).
Be bold about hierarchy; be restrained about decoration: no gradient blobs, no emoji, no "AI sparkle", no dependencies.

## What is NOT up for change
- Behaviour, data, routes, API/hooks (`frontend/src/api/*`), backend, docs, data files. No new dependencies. TypeScript strict, no `any`.
- Text that the browser suites look for (see "Done means"); if a deliberate change breaks one of them, adapt only that selector in the script and say so.
- Existing accessibility: tap targets >= 44px, text contrast >= 4.5:1 and control borders >= 3:1 in light AND dark, colour never the only cue,
  `prefers-reduced-motion` honoured, no horizontal scroll at 360px.
- The domain colours keep their meaning: green/red with arrows for gain/loss, amber for caution, `text-stock` for tickers/company names only.

## Read first
`AGENTS.md`, then `.claude/skills/finn-ui-principles/SKILL.md`: especially the two new sections **"Measurable rules"** and
**"Separation and grouping rules"** (three surface levels, section header anatomy, item silhouettes, hairlines inside cards, emphasis budget).
Treat them as the standard, and improve on them where you can justify it in your notes.

## Method (do it, in this order)
1. Look at the "before" screenshots in `handoff/ui-ref/` (`before-distinct-*.png`, 390x844, light and dark: Today with data, Network, Research detail,
   Settings, Profile, Cost). Write your diagnosis in `handoff/CODEX-DISTINCT-NOTES.md`: for each screen, what looks the same and what should differ.
2. Define the system first (a few lines in the notes): surface levels, section header, the silhouette of each item kind
   (filing card, person row, alert, research claim, warm-contact card, metric), and the colour/rail rules.
3. Implement it as shared components or shared class sets, not copy-paste, so the same kind of thing looks identical on every screen.
   Suggested priority: **Network first** (the owner's main complaint), then Today, Research detail, Settings, Profile, Cost.
4. For each screen run the **squint test** (blur or view small): the section boundaries and the item kinds must still be obvious in light and dark.
5. Re-screenshot at 390x844 and 360x844, light and dark, into `handoff/ui-ref/after-distinct-*.png` (untracked; do not commit screenshots).

## Time box
You have **60 minutes**. Commit after every screen that is finished and green (e.g. "UI distinct: Network sections"). Whatever is committed and green at the
deadline ships; do not leave the last commit broken. If time runs short, finish Network and Today well rather than all screens badly.

## Working rules
- Your worktree is `D:\Repos\ENAM-AI-TEST-codex`, branch **`codex/ui-distinct`** (already created from `main`). Never touch `main`. Do not push.
- Commit messages without any Co-Authored-By or AI attribution line.

## Done means (all must pass; port 5199 is free for your dev server, Claude Code stopped its own)
- In `frontend/`: `npx tsc -b` and `npm run build`.
- `node scripts/test-portfolio-watchlist.js`, `node scripts/test-offline-by-company.js`, `node scripts/test-ag6-fixes.js`,
  and `FINN_DEV_URL='http://localhost:5199/?nosplash' node scripts/test-network.js` (all 8 checks).
- `handoff/CODEX-DISTINCT-NOTES.md` (commit it): diagnosis per screen, the system you defined, what you changed per screen, what you left,
  any test script edit and why, and the exact test results.
