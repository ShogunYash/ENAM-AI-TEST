# Company identification logos

These logos are trademarks of their respective owners and are used only to identify the company in this demo. They are fetched at build time, in this order: the companies' own public websites; Google's public favicon service; and, for companies whose site icon is too small, the official logo image from Wikidata/Commons (for wide wordmarks such as HDFC Bank, SBI, Persistent and Maruti Suzuki only the emblem at the left is kept, so it stays legible at 32px). 19 of the 27 tracked companies have a logo; BAJFINANCE, RELIANCE, ULTRACEMCO, TATASTEEL, ASTRAL, CERA, GARFIBRES and ASIANPAINT only offered tiny favicons or wide wordmarks that are unreadable at that size, so they show initials. A real product would use a licensed logo API.

Run `node scripts/fetch-logos.mjs` from `frontend/` to fetch missing icons. Existing local PNGs are reused; `--refresh` fetches again and `--only=TCS,INFY` limits the symbols. Requests are sequential, at least one second apart. Sources, original dimensions, output sizes and failures are recorded in `scripts/logo-fetch-report.json`.

The committed PNGs are 128x128 with transparent padding. No logo is generated or redrawn. Missing, too-small and generic-globe assets are not saved; the UI uses initials. The application requests only `/logos/<SYMBOL>.png` on its own origin; it never contacts a logo service.
