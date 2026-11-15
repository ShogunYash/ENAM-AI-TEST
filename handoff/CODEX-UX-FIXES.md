# Task for Codex: three UX fixes (first-run look chooser, no stray translate/search popups, research kept on the device)

Branch `codex/ux-fixes` in your worktree `D:\Repos\ENAM-AI-TEST-codex` (created from `main`). Never touch `main`. Do not push. Commit per fix, no AI attribution lines.
Read `AGENTS.md` and `.claude/skills/finn-ui-principles/SKILL.md` first. Time box **45 minutes**; do the fixes in the order below and keep the build green after each.
You own all the frontend work in this task. Claude Code only merges, updates the docs and checks the live deploys.

## Fix 1: tapping a word opens Google Translate or a search
Owner report: on the phone, tapping/long-pressing a word in the UI opens Google Translate or a Google search. Cause: Chrome's text-selection popup ("Touch to search"),
long-press word selection, and the page-translate prompt. The page has `<html lang="en">` but nothing stops them, and there are no selection rules at all.
- Root: `<html lang="en" translate="no">`, `<meta name="google" content="notranslate">`, and `class="notranslate"` on the React root.
- Make the interface behave like an app, not a document: on the app shell set `user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;`
  (keep `-webkit-tap-highlight-color: transparent`).
- Opt text back IN where copying is genuinely useful: inputs/textareas/contenteditable (must stay editable and selectable), evidence quotes and source passages,
  the reconnect opener text (it has a Copy button, so also keep that), claim/quote text in the citation drawer, and the Ask answer text. Use one shared class (e.g. `.selectable`).
- Do not disable zoom or break screen readers; do not block the context menu with JavaScript.
- Verify what headless Chrome can: computed styles on the shell vs an input vs a quote, `document.documentElement.getAttribute('translate')`, the meta tag. The owner confirms the popup is gone on the real phone.

## Fix 2: first-run "Choose your look" screen, remembered on the device
- On the very first open, after the opening animation, show a full-screen chooser: **Light | Dark | Terminal** as three tappable cards, each with a small preview of that skin
  (a mock card with a title bar, a number and a coloured change; draw it with fixed swatches since it shows a skin that is not active), the short names, and the line
  "You can change this later in Settings > Appearance."
- Tapping a card applies the skin immediately (live), then a clear "Continue" (>= 44px) saves it. Store `finn.theme` (already used) and `finn.onboarded=1` in `localStorage`.
  Never show the chooser again once `finn.onboarded` exists; a person who already has a stored `finn.theme` is treated as onboarded.
- Accessible: `role="dialog"`, `aria-modal`, labelled, focus moves in and is trapped, radio-group semantics for the three cards (arrow keys), visible focus, Escape does nothing (it is a choice, not a popup),
  works at 360px, no flash of the wrong skin underneath, honours `prefers-reduced-motion`.
- Skip the chooser when the URL has `?nosplash` (used by the test suites). The suites that do not use `?nosplash` must keep passing: preseed `localStorage.finn.onboarded='1'` in those scripts
  (a minimal edit is allowed, say so in your notes) OR make them use `?nosplash`.
- Add `frontend/scripts/test-firstrun.js`: fresh browser profile shows the chooser; pick Dark, Continue, the `dark` class is applied and both keys are stored; reload shows no chooser and stays dark;
  a profile with `finn.theme` already set never sees it; `?nosplash` never sees it.

## Fix 3: research disappears after it is built
Owner report: after a research build, the report is gone and not stored. Cause: the server keeps reports in SQLite on Render's free disk, which is wiped on every restart or
sleep (the seed only brings back the 4 pre-built names), and the browser keeps no copy at all. So the fix is on the device (the server limit is documented by Claude Code).
- In `frontend/src/api/client.ts` (`fetchResearchData`), whenever a response has status `ready` or `partial` and `is_sample` is false, save it to `localStorage`
  (`finn.research.v1.<SYMBOL>` = `{savedAt, data}`). Keep at most 12 reports (drop the oldest by `savedAt`), catch quota errors (evict oldest, retry once, then give up silently),
  never store `building`, `failed` or sample data. Total budget about 1.5 MB.
- Read order becomes: live API (if it answers with a report or a build, use it) -> committed snapshot file -> **device copy** -> the existing "building" fallback.
  If the live API is unreachable, a stored report must open instantly and say "Saved on this device · <date>" with a "Refresh" button that asks the live API again.
- Research home: add a small section or tab **"Saved"** (first, before the lists) listing the reports stored on this device: symbol, name, saved date, the verdict summary
  already used on the rows, and a remove control (44px, with a short confirm). Hide the section when empty. A report that is also pre-built appears only once.
- The Profile "Clear my data on this device" already removes every `finn*` key: confirm it also clears these, and say so in the notes.
- Do not change the API, backend or contract. No new dependencies (plain `localStorage`, no IndexedDB library).
- Add `frontend/scripts/test-research-persist.js`: using CDP request interception, answer `/research/ZZTEST` with a ready report built from `docs/examples/research-INFY.json` with the
  symbol changed, open it, confirm the `finn.research.v1.ZZTEST` key exists, then block the API entirely and reload: the report still opens with the "Saved on this device" label,
  appears in the Saved section, and removing it deletes the key.

## Constraints (as in the earlier rounds)
- No behaviour changes beyond these three fixes; no backend/docs/data edits; TypeScript strict, no `any`; tokens only, both themes and Terminal; 44px targets; contrast >= 4.5:1; no horizontal scroll at 360px.

## Done means
- `npx tsc -b` and `npm run build` pass in `frontend/`.
- All pass against your dev server on port 5199 (free for you): `test-portfolio-watchlist.js`, `test-offline-by-company.js`, `test-ag6-fixes.js`, `test-charts.js`,
  `FINN_DEV_URL='http://localhost:5199/?nosplash' node scripts/test-network.js`, and your two new scripts `test-firstrun.js` and `test-research-persist.js`.
- `handoff/CODEX-UX-NOTES.md` (commit it): what you changed per fix, any edit to an existing script and why, how you verified Fix 1 (and that the owner must confirm it on the phone),
  the exact test results, and what you could not do.
