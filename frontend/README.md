# FINN frontend (React + TypeScript + Vite + Tailwind PWA)

Mobile-first investor app. It loads the committed snapshot in `public/data/` first (so it works with the API asleep or offline) and refreshes from the API when it answers.

```bash
npm install
npm run dev         # http://localhost:5173 (set VITE_API_BASE to point at an API; default http://localhost:8000)
npm run build       # production bundle + service worker
npm run lint        # tsc --noEmit
```

Browser checks (headless Chrome over CDP; start the dev server first on port 5199: `npx vite --port 5199`):

```bash
node scripts/test-portfolio-watchlist.js
node scripts/test-offline-by-company.js
node scripts/test-ag6-fixes.js
node scripts/test-charts.js
node scripts/test-firstrun.js
node scripts/test-research-persist.js
node scripts/test-logos.js
FINN_DEV_URL='http://localhost:5199/?nosplash' node scripts/test-network.js
```

Structure: `src/api` (data layer with snapshot fallback; `schema.d.ts` is generated from `docs/openapi.json` by `npm run generate-types`),
`src/components` (screens, cards, network, charts, research, layout, ui), `src/lib` (formatters, settings, theme, profile, storage),
`public/data` (snapshot written by `backend/scripts/refresh_snapshot.py`), `public/logos` (see its README), `scripts` (browser checks and the logo fetcher).
Design rules: `.claude/skills/finn-ui-principles/SKILL.md`.
