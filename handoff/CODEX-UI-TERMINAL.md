# Addendum for Codex: a Bloomberg-terminal look that works on a phone (branch `codex/ui-distinct`)

Read `handoff/CODEX-UI-DISTINCT.md` first. This addendum is **part of the same pass**: the panel header, item silhouettes and surface levels you define there
are the grammar; the terminal look is a third **skin** on top of it, plus two terminal-style tools that make the app feel like a trading desk.
Do it AFTER Network and Today are finished and green. If time or tests run out, skip this addendum and say so; never trade the green build for it.

## The idea
A Bloomberg terminal feels like: black field, amber labels, white data, green/red movement, dense monospaced grids, function keys, a command line,
a ticker tape, panels with thin title bars. Keep that spirit, but make it **thumb-friendly and accessible**, not a desktop clone.

## 1. Appearance option "Terminal" (the skin)
- Settings > Appearance becomes **Light | Dark | Terminal** (stored in `finn.theme` as `terminal`; the pre-paint script and `theme-color` meta must handle it, no flash).
  Default stays Light. Terminal is opt-in.
- Define Terminal tokens in `index.css` (and map them through the existing token system, so components need no per-theme classes):
  page near-black (`#000`-ish), panel one step lighter, hairline borders `#2a2a2a`-ish, **amber** for labels and panel headers, white/near-white for data,
  green `#00d26a`-ish up, red `#ff453a`-ish down, a cool cyan for links and the one selected thing. Every text/background pair >= 4.5:1, control borders >= 3:1.
  Tabular monospace for all numbers, tickers and dates in this skin; sentence text stays sans-serif for readability.
- Panel chrome in Terminal: each section header becomes a thin title bar: a short amber code + title (e.g. `NET  KEEP WARM`, `TOD  NEEDS YOU`, `RSH  PROMISED VS DELIVERED`)
  and a right-aligned count or timestamp. Rows inside are hairline-divided, zebra tint optional. Square corners (radius 2-4px), no shadows.

## 2. Command bar (works in every skin, styled by the skin)
- A slim input at the top of the screen, always visible: placeholder `Type a ticker or command`, with a **GO** button (>= 44px).
- Typing shows an in-place suggestion list (max 6): tickers from `companies.json` (symbol + name), and commands `TODAY`, `RESEARCH`, `NETWORK`, `SETTINGS`, `COST`, `PROFILE`.
  Selecting a ticker opens its Research detail (the existing route/state); selecting a command switches tab. Arrow keys and Enter work on a keyboard; on a phone tapping works.
- Fully labelled (`aria-label`, `role="combobox"` with `aria-expanded`/`aria-activedescendant`), Escape clears. Must not change existing text the suites look for.
- Uses only existing hooks/data (`fetchCompaniesCatalog`); no new API.

## 3. Ticker tape (works in every skin)
- A one-line strip under the header: portfolio symbols with last close and 1-day %, coloured with arrows (`INFY 1,534.2 ▲+0.8%`), from the existing prices snapshot/API.
- Slow horizontal scroll; **pause on touch/hold**, and with `prefers-reduced-motion` it is a static, swipeable (scroll-snap) strip. Duplicate content for the loop must be `aria-hidden`.
  Strip height <= 28px; it is decoration plus glance value, not a control, but each item may be a button (>= 44px hit area via padding) that opens that ticker's Research.
- If prices are unavailable, render nothing (no error text).

## 4. Function-key navigation (Terminal skin only)
- In Terminal, the bottom nav is restyled as labelled function keys: `F1 TODAY  F2 RESEARCH  F3 NETWORK  F4 SETTINGS  F5 COST` (the active key inverted amber on black).
  Same five tabs, same behaviour, >= 44px targets, works at 360px (abbreviate labels if needed: `TDY RSH NET SET CST`). Other skins keep the normal nav.

## 5. Dense data grids (Terminal skin, and fine to apply everywhere if it reads better)
- Results table, metrics, price lists and the expertise/people lists: right-aligned tabular figures, tight row height (24-28px) for **non-interactive** rows;
  any row you can tap keeps a >= 44px hit area. Headers in amber 11px uppercase. Sign and arrow on every change.

## Constraints and done means
- Everything from `CODEX-UI-DISTINCT.md` still applies (no behaviour/API/backend/data changes, no new dependencies, accessibility rules, no horizontal scroll at 360px).
- The default Light and Dark skins must still pass all four suites unchanged: `test-portfolio-watchlist.js`, `test-offline-by-company.js`, `test-ag6-fixes.js`,
  `test-network.js` (with `FINN_DEV_URL='http://localhost:5199/?nosplash'`). Additionally verify the **Terminal** skin by hand/CDP: switch to it, reload (persists, no flash),
  open every tab, check contrast, 360px overflow, command bar (type `INFY`, Enter), ticker tape pause/reduced motion, function-key nav.
- Screenshots of Terminal at 390x844 and 360x844 for all five tabs into `handoff/ui-ref/after-terminal-*.png` (untracked).
- Add a "Terminal skin" section to `handoff/CODEX-DISTINCT-NOTES.md`: the tokens, what you built, what you skipped, test results.
- Extra time box: **+30 minutes** on top of the 60. Commit per feature ("UI terminal: command bar").
