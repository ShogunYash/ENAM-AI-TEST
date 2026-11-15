# Task for Codex: real company logos instead of initial letters

Branch `codex/logos` in your worktree `D:\Repos\ENAM-AI-TEST-codex` (created from `main`). Never touch `main`. Do not push. Small commits, no AI attribution lines.
Read `AGENTS.md` and `.claude/skills/finn-ui-principles/SKILL.md` first. Time box **45 minutes**; keep the build green after each commit.

## The ask (owner, 15 Nov)
"Add icons of every company instead of showing the initial letter in the small box." Today every company mark (`IdentityMark` with `kind="company"` in
`frontend/src/components/ui/Desk.tsx`) is a square with initials such as `B` or `TC`. Show each tracked company's logo in that square instead.
People keep their circular initials (a person is not a company). There are 27 tracked companies (`data/portfolio.json`: 17 holdings + 10 watchlist).

## Where the logos come from (decided; do not change the approach)
Logos are **local, committed files**, fetched once at build time on a laptop, never at runtime:
- No runtime request to any third party (no favicon CDN, no hot-linking): it works offline, it is fast, and it leaks nothing about which stocks the investor looks at.
- Files go in `frontend/public/logos/<SYMBOL>.png` (square, 128x128, PNG), plus `frontend/public/logos/README.md` saying the logos are trademarks of their owners,
  used only to identify the company in this demo, fetched from the companies' public websites; a real product would use a licensed logo API.
- Write `frontend/scripts/fetch-logos.mjs` (plain Node, no new dependencies, Node 24 `fetch`) that, for each symbol in the table below, finds the best available
  icon from the company's own site and saves a 128x128 PNG:
  try the page's `apple-touch-icon` / largest `rel="icon"` first, then `/apple-touch-icon.png`, then `/favicon.ico`, then Google's public favicon endpoint
  (`https://www.google.com/s2/favicons?domain=<domain>&sz=128`) as the last resort (build-time only). Reject Google's generic globe placeholder
  (detect it by comparing against the response for a non-existent domain) and anything smaller than 48px. Resize/centre on a transparent square with a few px of padding
  (you may use `sharp` only as a **devDependency**; otherwise write PNG as-is when it is already square and >= 64px). Be polite: sequential requests, 1 per second, a descriptive User-Agent.
- Print a report: symbol, domain, source used, size, or "MISSING". Do not invent or draw logos. For any MISSING symbol, leave no file: the component falls back to initials.
- If your environment has **no internet**, write the script and the component anyway, leave `public/logos/` empty, and say so in your notes. Claude Code will run the script on a laptop.

Domains to start from (verify each; correct them if a site has moved, and say so in the notes):
TCS tcs.com · INFY infosys.com · BAJFINANCE bajajfinserv.in · RELIANCE ril.com · LT larsentoubro.com · SUNPHARMA sunpharma.com · TITAN titancompany.in ·
ULTRACEMCO ultratechcement.com · TATASTEEL tatasteel.com · PERSISTENT persistent.com · ASTRAL astralltd.com · KEI kei-ind.com · CERA cera-india.com ·
GARFIBRES garwareropes.com · FINEORG fineorganics.com · HDFCBANK hdfcbank.com · HINDZINC hzlindia.com · POLYCAB polycab.com · KPIL kalpataruprojects.com ·
ICICIBANK icicibank.com · SBIN sbi.co.in · BHARTIARTL airtel.in · MARUTI marutisuzuki.com · ASIANPAINT asianpaints.com · HINDUNILVR hul.co.in ·
DIXON dixoninfo.com · NESTLEIND nestle.in
Keep this mapping in `frontend/scripts/logo-domains.json` (used by the script; the app itself only needs the symbol).

## The component
- `IdentityMark` gets an optional `symbol` prop. For `kind="company"` with a `symbol`: render `<img src="/logos/<SYMBOL>.png" alt="" loading="lazy" decoding="async">`
  centred with `object-contain` inside the existing square (same size, same border, same radius as today), on a **light tile in every skin**
  (many logos have dark art or transparent backgrounds that vanish on a dark card). Decorative, so `alt=""` and `aria-hidden`.
- If the image fails to load (404, offline before caching), swap to today's initials without a layout shift (`onError`), and remember the failure for that symbol in memory
  so it does not flicker or re-request.
- Pass `symbol` at every company call site (Today filing cards and alert ribbons, company lists in Today and Research, Research header and Saved list, Network where a company mark appears,
  Profile holdings/watchlist if they show marks). Search the code for `IdentityMark` and `kind="company"`. Do not change people marks.
- Respect all three skins; the light tile must look intentional in Terminal (square corners, thin border), not like a pasted sticker.
- Service worker: the PNGs live in `public/` so they are precached; check the PWA build still passes and the total precache stays reasonable (note the size in your notes).
- No change to the API, data, backend or docs. No new runtime dependencies.

## Tests (you write these)
`frontend/scripts/test-logos.js` (plain Node + CDP like `scripts/test-charts.js`, dev server on 5199, `?nosplash`):
1. every symbol in `logo-domains.json` that has a file in `public/logos/` returns HTTP 200 `image/png` from the dev server;
2. in Today > by company, Research lists and a company page, the company marks are `<img>` elements pointing at `/logos/<SYMBOL>.png` (for symbols that have a file) and people marks are still text;
3. block `/logos/TCS.png` through CDP request interception: the TCS mark falls back to initials, with no horizontal scroll and no console error;
4. no network request goes to a host other than the app's own origin and the configured API while those screens load (proves no third-party logo calls);
5. it works in Light, Dark and Terminal (set `finn.theme`).

## Constraints and done means
- Everything from the earlier rounds still applies: tokens only, 44px targets for interactive elements, contrast, no horizontal scroll at 360px, TypeScript strict, no `any`.
- In `frontend/`: `npx tsc -b`, `npm run build`, and these must pass against your dev server on port 5199 (free for you):
  `test-portfolio-watchlist.js`, `test-offline-by-company.js`, `test-ag6-fixes.js`, `test-charts.js`, `test-firstrun.js`, `test-research-persist.js`, `test-network.js`, and your new `test-logos.js`.
- Commit the fetched PNGs and the README in `public/logos/` (27 files at most, a few KB each). Screenshots stay untracked.
- `handoff/CODEX-LOGOS-NOTES.md` (commit it): the fetch report (symbol, domain, source, size, MISSING list), any domain you corrected, what you changed per file, the exact test results,
  and the precache size change.
