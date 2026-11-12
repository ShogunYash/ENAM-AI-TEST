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

## 3. Verify on a phone (the `finn-demo-check` skill lists every step)
Today (24h/3d/7d/30d), a results card with a green Verified or amber mismatch badge, Research -> INFY, an unseen ticker
(shows build progress), Cost screen matches `/stats/llm`.

## Known limits (say them in the writeup)
- Free-tier Gemini has **daily per-model request quotas**; live research on an unseen ticker costs about 6 calls and may be queued
  or degraded once the day's quota is gone. Pre-built names are unaffected.
- Render free sleeps after 15 min idle (hence the keep-warm ping) and has an ephemeral disk (hence the boot-time seed).
- screener.in terms are "personal, non-commercial": low volume, cached, robots.txt respected.
