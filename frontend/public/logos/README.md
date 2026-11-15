# Company identification logos

These logos are trademarks of their respective owners and are used only to identify the company in this demo. They are fetched from the companies' public websites (with Google's public favicon service as a build-time last resort). A real product would use a licensed logo API.

Run `node scripts/fetch-logos.mjs` from `frontend/` to fetch missing icons. Existing local PNGs are reused; `--refresh` fetches again and `--only=TCS,INFY` limits the symbols. Requests are sequential, at least one second apart. Sources, original dimensions, output sizes and failures are recorded in `scripts/logo-fetch-report.json`.

The committed PNGs are 128x128 with transparent padding. No logo is generated or redrawn. Missing, too-small and generic-globe assets are not saved; the UI uses initials. The application requests only `/logos/<SYMBOL>.png` on its own origin; it never contacts a logo service.
