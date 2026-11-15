# UX fixes handoff

Worktree: `D:\Repos\ENAM-AI-TEST-codex`. Branch: `codex/ux-fixes`, base `7c3b99b`.
Started 15 November 2026 at 11:02 UTC (16:32 IST), within the 45-minute task window.
Read `AGENTS.md`, `handoff/CODEX-UX-FIXES.md` and the FINN UI principles before implementation. Changes were made in the requested order, with a green build before each fix commit. No backend, contract, docs, data or dependency changes; no push or changes to main.

## Fix 1 — selection and translation

Commit `bf87f56` adds `translate="no"` to the document, the Google `notranslate` meta and `notranslate` on the React root. The shared app-shell class disables text selection and WebKit callouts on interface chrome. The look chooser uses that same class (`db97ef0`).

One shared `.selectable` class restores text selection/callouts for source material: promise/outcome text, citation claim/quote text, network evidence, reconnect openers, Ask answers and Ask evidence quotes. Inputs, textareas and editable elements explicitly retain text selection. The Copy button and existing citation interactions are preserved. No JavaScript context-menu blocking was added.

The existing viewport disabled zoom with `maximum-scale=1.0, user-scalable=no`; those restrictions were removed. Viewport width, initial scale and safe-area support remain.

Headless Chrome verified:

- document `translate` is `no`, Google meta is `notranslate`, and root has the opt-out class;
- computed shell/chooser `user-select` is `none`, input and evidence are `text`;
- the viewport no longer disables zoom.

**The owner must still confirm the unwanted Google Translate/Touch to Search popup is gone on the real phone.** Headless Chrome cannot verify Android browser chrome or OS selection UI. Selection popups remain intentionally possible on copyable evidence and editable text.

## Fix 2 — first-run look choice

Commit `472b8f8` adds `LookChooser` and connects it to completion of the existing opening animation. The app itself is not mounted behind a first-run chooser. Each skin has its own fixed-swatches preview, short label and selected state; the required Settings > Appearance explanation is visible. These preview numbers are illustrative UI swatches, not company data.

Choosing a card applies the skin immediately without storing the preview. Continue writes `finn.theme` and `finn.onboarded=1`, then opens the app. Either an existing onboarding key or any existing stored theme bypasses the chooser. `?nosplash` also bypasses it without writing onboarding state. The existing pre-paint script reads the saved theme on subsequent loads.

Accessibility: labelled modal dialog, radio group, roving radio tab stop, arrow/Home/End selection, focus moved into the chooser, Tab/Shift-Tab trap, visible focus, and Escape does not dismiss it. Cards and Continue meet 44px targets. The opening animation retains its reduced-motion path; the chooser introduces no motion.

Added `scripts/test-firstrun.js`, using a small dependency-free CDP helper at `scripts/lib/browser.js`. It checks fresh-device appearance, live Dark preview, unsaved preview state, Escape, focus trap, mobile width/targets, Continue storage, reload persistence, legacy-theme migration, nosplash bypass and Fix 1 metadata/computed styles.

## Fix 3 — research kept on the device

Commit `0ff57ce` adds bounded localStorage persistence and the Saved UI. Integration follow-up `659af1a` clarifies the count after deduplication and gives the Research search GO/clear controls 44px targets.

- Key: `finn.research.v1.<SYMBOL>`; value: `{savedAt, data}`. The original report, sources and quotes are retained.
- Only `ready`/`partial` reports with `is_sample === false` are stored. Both eligible live and committed snapshot responses are saved. Building, failed and sample responses are not stored.
- Keep at most 12 entries and a conservative total of 1,500,000 bytes, counting keys and JSON as UTF-16. Evict oldest `savedAt` first. An individually oversized report is not saved. A storage-write error evicts the oldest remaining report and retries once, then fails silently. Bad JSON is ignored.
- Fetch order is live report/build, committed snapshot, device copy, existing building fallback. A failed live response can fall through to a saved report. Existing live build polling remains.
- Research query initial data comes from the device when present, so the report displays immediately while that lookup runs. A device result has `Saved on this device · <IST date/time>` and a 44px Refresh button which calls the live path again.
- Saved is the first section before the company lists, hidden when empty. Rows include symbol/name, saved date and the existing verdict-summary format. Three rows are shown before Show all. Remove has a short inline Remove/Keep confirmation. A saved pre-built report is excluded from the other list, so it appears once. Device storage events keep mounted lists synchronized.

Added `scripts/test-research-persist.js`. CDP fulfills `/research/ZZTEST` with the documented INFY fixture changed only for the test symbol/name and non-sample flag. It verifies storage with sources, immediate offline reopen, the saved label, Refresh making another live request, Saved rows/summary/date, deduplication, removal confirmation/key deletion and Profile reset. Additional checks cover partial acceptance; sample/building/failed rejection; the 12-report cap; byte-budget eviction; oversized-report rejection; quota eviction/one retry; silent repeated failure; and corrupt JSON.

Profile already deletes every localStorage key beginning `finn` and reloads. It was not changed. The new suite exercised the actual Clear my data / Clear everything flow and confirmed that research entries and another finn key were removed.

## Existing script edits

- `test-portfolio-watchlist.js`, `test-offline-by-company.js`, `test-ag6-fixes.js`: only their Chrome startup URL now includes `?nosplash`, as allowed by the task. Their assertions are unchanged.
- `test-network.js`: constructs its offline URL with URLSearchParams, preserving `nosplash` and adding `tab=network`. The old `?nosplash?tab=network` string accidentally prevented the onboarding bypass. Its INFY selection now reveals Saved rows and opens the saved INFY button when present, falling back to the existing article. The same eight assertions remain; no contact/offline/dialog checks were removed.
- `test-charts.js`: unchanged.

During verification, the new persistence test was corrected to wait for the initial background lookup to finish before clicking the enabled Refresh button. This removes a test race without changing application behaviour.

## Exact final validation

Against the dev server on port 5199, with `FINN_DEV_URL=http://localhost:5199/?nosplash`:

- `npx --no-install tsc -b`: exit 0.
- `npm run build`: exit 0; production bundle and PWA worker generated.
- `node scripts/test-portfolio-watchlist.js`: exit 0, all checks passed.
- `node scripts/test-offline-by-company.js`: exit 0, 3d/7d/30d offline company views passed.
- `node scripts/test-ag6-fixes.js`: exit 0. Its legacy probes still log an undefined price-period label, null Ask source link and null INFY range text while declaring success. Those assertions were not strengthened or weakened here; the exit status is not independent proof of those three behaviours.
- `node scripts/test-charts.js`: exit 0, all nine checks passed, including Research/Today panels, four ranges, different range data, scrub crosshair and price context.
- `node scripts/test-network.js`: exit 0, 8/8 checks passed.
- `node scripts/test-firstrun.js`: exit 0, all 14 checks passed.
- `node scripts/test-research-persist.js`: exit 0, all 18 checks passed.
- Additional CDP layout review: chooser, Saved home and device detail at both 390x844 and 360x844, in Light/Dark/Terminal; all 18 views had no document overflow. Screenshots are untracked in `handoff/ui-ref/ux-{look,saved,report}-{skin}-{width}.png`.
- `git diff --check`: clean.

## Limits / owner follow-up

Real-phone browser popup behaviour remains the owner confirmation described above. The server's Render disk persistence and backend were deliberately unchanged. Device copies are specific to this browser/origin/device and can disappear if browser storage is cleared or evicted. Storage-disabled or exhausted browsers cannot be guaranteed to remember preferences/reports; write failures do not block the app. Oversized reports remain usable from their source but are not cached. No screenshots or fixture changes were committed.
