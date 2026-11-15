# Deploying FINN (free tiers, about 15 minutes)

The demo must never depend on a live model or a live scrape: the API boots from a **committed seed** (database + LLM answer
cache) and the PWA ships with a **snapshot** of the same data, so it renders even if the API is asleep.

## 0. Refresh the data (on the laptop; do this last, right before deploying)
```bash
cd backend
uv run python -m scripts.ingest                      # BSE filings + prices (incremental)
uv run python -m scripts.refresh_snapshot --classify # classify new filings, export frontend/public/data/*.json
uv run python -m scripts.enrich_results              # results cards (Gemini PDF; paced; cached)
uv run python -m scripts.build_research INFY BAJFINANCE POLYCAB KPIL   # needs the station tunnel (below) or Gemini quota
uv run python -m scripts.refresh_snapshot            # again, so research/*.json and stats are in the snapshot
uv run python -m scripts.export_seed                 # backend/seed/{finn,llm}.sqlite for the deployed API
uv run pytest -q && cd .. && git add -A && git commit -m "D1: demo seed + snapshot" && git push
```
Station tunnel for the local model (build time only): `ssh -N -L 11435:localhost:11434 station` (Ollama must be running there
with the `finn-gpt-oss` alias; see CLAUDE.md).

## 1. API on Render (free web service)
1. Render dashboard -> **New -> Blueprint** -> select this GitHub repo (it reads `render.yaml`).
2. Add the three API keys when prompted (`GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`). `FINN_USE_LOCAL_LLM=0` is preset.
3. After the first deploy, open `https://<service>.onrender.com/health` (first hit wakes the service, ~1 min).
4. **Run the cloud-IP check:** `https://<service>.onrender.com/debug/sources`. It reports whether BSE, screener.in and Yahoo accept
   requests from Render. If any is `ok:false`, Push and pre-built research still work from the seed; only live research on
   unseen tickers is affected. Record the result in the writeup.
5. Keep it warm: a free cron (cron-job.org or UptimeRobot) hitting `/health` every 10 minutes.

## 2. PWA on Cloudflare Pages (or Vercel)
- Root directory `frontend`, build command `npm run build`, output directory `dist`.
- Environment variable `VITE_API_BASE=https://<service>.onrender.com` (no trailing slash).
- Open the Pages URL on a phone. With the API asleep the app shows the **SNAPSHOT** chip and real data; when the API answers it
  shows **LIVE**.


## Deployed (14 Nov 2026), as reported by the owner
- **API (Render, free):** https://finn-api-7n6q.onrender.com. `/health` returned `ok: true`, `mode: live`, latest price bar 11 Nov 2026 15:30 IST. `render.yaml` now sets `autoDeployTrigger: commit` (matching the dashboard), so each push to `main` redeploys; a Blueprint sync will not switch it off.
- **PWA (Cloudflare Pages):** https://enam-ai-test.pages.dev/ (stable project domain, verified 14 Nov to serve the latest build; the owner first reported the deployment-specific URL `0405d6eb.enam-ai-test.pages.dev`, which is an immutable old build, do not share it; built from `main`, root `/frontend`, `npm run build`, output `/dist`, `VITE_API_BASE=https://finn-api-7n6q.onrender.com`). Pages rebuilds on each push to `main`.
- **Cloud-source check (`/debug/sources` on Render):**
  | Source | Result from Render |
  |---|---|
  | BSE | **FAIL, HTTP 403** (BSE blocks the cloud IP) |
  | screener.in | OK (HTTP 200, quarterly table present) |
  | yfinance | OK (4 TCS price bars) |
- **What this means:** BSE's announcement API answers 403 to the Render host (so Push ingest stays on the laptop and ships in the snapshot/seed), but the earnings-call PDFs download fine: a live research build for an unseen ticker (GODREJCP, 14 Nov) finished on Render in about a minute with 4 transcripts read and 8 promises judged. If a transcript host ever blocks, the report degrades to the financials plus an explicit gap.
- **Phone verification:** NOT yet confirmed by the agent. Owner to check on a phone: Today 30d, a results card, Research -> INFY, and the LIVE / SNAPSHOT chip.

## 3. Verify on a phone (the `finn-demo-check` skill lists every step)
Today (24h/3d/7d/30d), a results card with the "Revenue, PBT, PAT checked" badge (or the amber mismatch badge), Research -> INFY, an unseen ticker
(shows build progress), Cost screen matches `/stats/llm`.

## Known limits (say them in the writeup)
- Free-tier Gemini has **daily per-model request quotas**; live research on an unseen ticker costs about 6 calls and may be queued
  or degraded once the day's quota is gone. Pre-built names are unaffected.
- **Live research is cached only on the ephemeral disk**: a report built for an unseen ticker is lost on restart or sleep; the PWA keeps a copy on the device (see README, Limits). A persistent disk or database is the upgrade path.
- Render free sleeps after 15 min idle (hence the keep-warm ping) and has an ephemeral disk (hence the boot-time seed).
- screener.in terms are "personal, non-commercial": low volume, cached, robots.txt respected.
