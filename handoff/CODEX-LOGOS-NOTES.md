# Company logos handoff

Worktree `D:\Repos\ENAM-AI-TEST-codex`, branch `codex/logos`, base `b6f9dee`.
Started 15 November 2026 at 12:04 UTC (17:34 IST), within the 45-minute task window.
Read AGENTS.md, the task and FINN UI principles before changes. Nothing was pushed and main was untouched. Backend, API, contract, data files, docs and people marks are unchanged.

## Result

13 real company logos are committed as local 128x128 PNGs; 14 symbols use initials. The application has no third-party logo requests. Small or unavailable icons were not replaced with invented art.

The PNGs total **70,449 bytes (68.80 KiB)**. All have transparent padding and preserve the source aspect ratio. The contact sheet was visually checked against the fetched assets; no logos were drawn or generated.

## Fetching and provenance

`frontend/scripts/fetch-logos.mjs` uses Node 24 fetch and `sharp`, added only as a devDependency. It checks linked apple-touch icons/largest icons, then the root apple-touch icon, root favicon and finally Google's public favicon service. Bare/canonical/www host indexes are tried only at that last-resort stage. PNG, JPEG, SVG and suitable embedded-PNG or 24/32-bit BMP ICO frames are converted with padding to 128x128 PNG; output palettes are compressed.

Every HTTP request, including redirects, is sequential and at least one second after the previous request starts, with a descriptive FINN User-Agent and an eight-second timeout. Sources below 48px on either axis are rejected. Google fallback images are compared by source hash and normalized pixels with the response for a deliberately nonexistent `.invalid` domain. If that reference cannot be decoded safely, Google fallback is skipped.

Existing files are reused only when their PNG format, both 128px dimensions, recorded domain and SHA-256 match. `node scripts/fetch-logos.mjs --only=TCS,INFY` returned CACHED for both without refetching. `--refresh` deliberately refetches; `--only=` limits the symbols. The fetcher is an explicit preparation script, not part of runtime or every `npm run build`.

The machine-readable full report is `frontend/scripts/logo-fetch-report.json`: source URL, original size, output bytes/hash, fetch time and all failure attempts. The public README carries the requested trademarks/demo-use/licensed-product notice. The script can be rerun on the owner's laptop for missing sources; this environment had internet, but several sites rejected its descriptive automated User-Agent.

## Verified domain corrections

- GARFIBRES: `garwareropes.com` → `garwarefibres.com`, checked against [Garware Technical Fibres' official site](https://www.garwarefibres.com/).
- HDFCBANK: `hdfcbank.com` → `hdfc.bank.in`, confirmed by [HDFC's new official website notice](https://www.hdfc.bank.in/important-messages/all-new-website).
- ICICIBANK: `icicibank.com` → `icici.bank.in`, observed in the site's redirect and checked against [ICICI's official site](https://www.icici.bank.in/).
- SBIN: `sbi.co.in` → `sbi.bank.in`, confirmed by [SBI's migration notice](https://sbi.bank.in/redirect/).

The other supplied company domains were retained and checked against their corporate pages/search-indexed primary pages. Some pages were blocked or timed out in the Node fetcher; successful web verification does not imply the automatic icon fetch succeeded. No domain outside the supplied companies was substituted.

## Fetch report

All successful outputs below are 128x128 PNGs. Original dimensions and final committed byte sizes are shown. Google links are the build-time source only.

- **TCS** · `tcs.com` · [Google favicon fallback](https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://www.tcs.com&size=128) · 48x48 → 128x128 · 4,907 bytes.
- **INFY** · `infosys.com` · [Google favicon fallback](https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://infosys.com&size=128) · 128x128 → 128x128 · 2,846 bytes.
- **BAJFINANCE** · `bajajfinserv.in` · **MISSING** · no file. Final attempt: Google www.bajajfinserv.in: Too small (32x32). Earlier site/icon failures are in the JSON report.
- **RELIANCE** · `ril.com` · **MISSING** · no file. Final attempt: Google www.ril.com: Too small (16x16). Earlier site/icon failures are in the JSON report.
- **LT** · `larsentoubro.com` · **MISSING** · no file. Final attempt: Google www.larsentoubro.com: Too small (16x16). Earlier site/icon failures are in the JSON report.
- **SUNPHARMA** · `sunpharma.com` · [Google favicon fallback](https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://sunpharma.com&size=128) · 128x128 → 128x128 · 8,669 bytes.
- **TITAN** · `titancompany.in` · [Company-site icon](https://www.titancompany.in/sites/default/files/brand-logo_0.png) · 169x172 → 128x128 · 4,214 bytes.
- **ULTRACEMCO** · `ultratechcement.com` · **MISSING** · no file. Final attempt: Google www.ultratechcement.com: Too small (24x24). Earlier site/icon failures are in the JSON report.
- **TATASTEEL** · `tatasteel.com` · **MISSING** · no file. Final attempt: Google www.tatasteel.com: Too small (21x20). Earlier site/icon failures are in the JSON report.
- **PERSISTENT** · `persistent.com` · **MISSING** · no file. Final attempt: Google www.persistent.com: Too small (16x16). Earlier site/icon failures are in the JSON report.
- **ASTRAL** · `astralltd.com` · **MISSING** · no file. Final attempt: Google www.astralltd.com: Too small (16x16). Earlier site/icon failures are in the JSON report.
- **KEI** · `kei-ind.com` · [Company-site icon](https://www.kei-ind.com/wp-content/uploads/2023/09/favicon-1.ico) · 100x100 → 128x128 · 3,405 bytes.
- **CERA** · `cera-india.com` · **MISSING** · no file. Final attempt: Google www.cera-india.com: Too small (32x32). Earlier site/icon failures are in the JSON report.
- **GARFIBRES** · `garwarefibres.com` · **MISSING** · no file. Final attempt: Google www.garwarefibres.com: Too small (16x16). Earlier site/icon failures are in the JSON report.
- **FINEORG** · `fineorganics.com` · [Company-site icon](https://www.fineorganics.com/wp-content/uploads/2023/05/cropped-Leafmark-180x180.jpg) · 180x180 → 128x128 · 5,484 bytes.
- **HDFCBANK** · `hdfc.bank.in` · **MISSING** · no file. Final attempt: Google www.hdfc.bank.in: Too small (16x16). Earlier site/icon failures are in the JSON report.
- **HINDZINC** · `hzlindia.com` · [Company-site icon](https://www.hzlindia.com/_next/static/media/favicon.a81afb10.svg) · 64x64 → 128x128 · 6,546 bytes.
- **POLYCAB** · `polycab.com` · [Company-site icon](https://polycab.com/apple-touch-icon.png) · 180x180 → 128x128 · 3,966 bytes.
- **KPIL** · `kalpataruprojects.com` · [Company-site icon](https://kalpataruprojects.com/favicon.ico) · 256x256 → 128x128 · 8,325 bytes.
- **ICICIBANK** · `icici.bank.in` · [Company-site icon](https://www.icici.bank.in/favicon.ico) · 48x48 → 128x128 · 6,110 bytes.
- **SBIN** · `sbi.bank.in` · **MISSING** · no file. Final attempt: Google www.sbi.bank.in: HTTP 404. Earlier site/icon failures are in the JSON report.
- **BHARTIARTL** · `airtel.in` · **MISSING** · no file. Final attempt: Google www.airtel.in: Too small (31x30). Earlier site/icon failures are in the JSON report.
- **MARUTI** · `marutisuzuki.com` · **MISSING** · no file. Final attempt: Google www.marutisuzuki.com: Too small (16x16). Earlier site/icon failures are in the JSON report.
- **ASIANPAINT** · `asianpaints.com` · **MISSING** · no file. Final attempt: Google www.asianpaints.com: Too small (16x16). Earlier site/icon failures are in the JSON report.
- **HINDUNILVR** · `hul.co.in` · [Google favicon fallback](https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://hul.co.in&size=128) · 128x128 → 128x128 · 4,233 bytes.
- **DIXON** · `dixoninfo.com` · [Company-site icon](https://dixoninfo.com/favicon.ico) · 256x256 → 128x128 · 3,350 bytes.
- **NESTLEIND** · `nestle.in` · [Google favicon fallback](https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://nestle.in&size=128) · 128x128 → 128x128 · 8,394 bytes.

MISSING: BAJFINANCE, RELIANCE, LT, ULTRACEMCO, TATASTEEL, PERSISTENT, ASTRAL, CERA, GARFIBRES, HDFCBANK, SBIN, BHARTIARTL, MARUTI, ASIANPAINT. No files were created for these symbols.

## Component and call-site changes

- `frontend/src/components/ui/Desk.tsx`: optional `symbol` prop, local `/logos/<SYMBOL>.png` image with empty alt/aria-hidden, lazy loading and async decoding. Same 32px footprint and square silhouette. Image errors switch to the existing initials; an in-memory Set prevents new marks for that symbol from requesting again during the page session. Person marks remain circular text initials.
- `frontend/src/index.css`: shared light-tile/background/text/border tokens, including Dark and Terminal. The logo is object-contained within the existing one-pixel border; Terminal uses 3px corners. Adjacent ticker/name text still supplies the accessible company identity.
- `FilingCard.tsx`, `CompanyList.tsx`, `CompanyDetail.tsx`, `AlertsStrip.tsx`: pass the company symbol to shared marks, including the company header and alert ribbons.
- `ResearchScreen.tsx`, `SavedResearch.tsx`: company list, report header and Saved rows use the shared company mark.
- `NetworkScreen.tsx`: company context on reconnect records has a company mark; the person's circular initials are preserved. `PersonMatchRow` is unchanged.
- Profile holdings/watchlist did not have company marks, so their text rows were left alone, as allowed by the task.
- `scripts/logo-domains.json`: all 27 tracked symbols, with the four verified corrections above. The app imports neither the domain mapping nor source report.
- `scripts/fetch-logos.mjs`, `scripts/logo-fetch-report.json`, `public/logos/README.md`, 13 PNGs and package/lock files: build-time fetching, provenance, assets and dev-only image processing.
- `scripts/test-logos.js`: new plain Node/CDP suite; reuses the existing browser helper. No existing suite or selector was edited for this task.

Commits: `868bbd3` (fetcher/assets), `032f871` (marks/tests), `c221255` (validated cache reuse). Each was built green.

## Exact validation

Against port 5199, with `FINN_DEV_URL=http://localhost:5199/?nosplash`:

- `npx --no-install tsc -b`: exit 0.
- `npm run build`: exit 0; production bundle and PWA worker generated.
- `node scripts/test-portfolio-watchlist.js`: exit 0, all checks passed.
- `node scripts/test-offline-by-company.js`: exit 0, 3d/7d/30d offline company views passed.
- `node scripts/test-ag6-fixes.js`: exit 0. Its existing probes still log an undefined period label, null Ask source link and null INFY range text while declaring success. This pass did not weaken or rewrite them.
- `node scripts/test-charts.js`: isolated final run exit 0, **9/9 checks passed**. The initial batch run failed only its Today price-panel check while a build was also running; an unchanged isolated rerun passed. The cause was not established; no chart code or assertions were changed.
- `node scripts/test-firstrun.js`: exit 0, **14 checks passed**.
- `node scripts/test-research-persist.js`: exit 0, **18 checks passed**.
- `node scripts/test-network.js`: exit 0, **8/8 checks passed**.
- `node scripts/test-logos.js`: exit 0, **43 checks passed**: all 27 mapping entries, all 13 files delivered as HTTP 200 image/png with 128px dimensions, Today company lists/company pages/Research lists in all three skins, white 32px tiles, unchanged circular text people marks, intercepted TCS failure, same-size initials fallback, no repeated request after a new mark mounts, no application console.error/exception, and every browser HTTP request confined to the app/configured API origin. The intentionally blocked image is an expected failed resource, not an application exception.
- Additional screenshot review: Today, Research detail and Network at 390x844 and 360x844 in Light, Dark and Terminal, **18 views**, all without document overflow. Screenshots and the asset contact sheet remain untracked under `handoff/ui-ref/`.
- `git diff --check`: clean. No TypeScript `any` was introduced and no runtime dependency was added.

## PWA size

Before logos: **645 entries, 1724.24 KiB**. After logos: **658 entries, 1794.14 KiB** — **13 entries and 69.90 KiB** added (about 4.05%). The generated service-worker precache explicitly contains all 13 `/logos/<SYMBOL>.png` files. The existing PNG glob already covered public assets, so `vite.config.ts` needed no change. Source reports, README and sharp are not runtime imports.

## Remaining limits

14 companies retain initials because no eligible icon was retrieved under the stated source/size rules. Some failures were HTTP rejections/timeouts; most final fallbacks were only 16–32px. The size threshold was not relaxed. Runtime requests stay local; a logo missing from the browser cache during a full offline visit still falls back to initials. Remembered failures last only for the current page session, so a later fresh load can try the local asset again. Real brand art was preserved, including logos whose small lettering is less readable than their emblem; adjacent stock names remain visible.
