# Deploying FINN (free tiers)

**What runs where:** a FastAPI service on Render, a static PWA on Cloudflare Pages, and a laptop for data refresh and the local model. The demo never depends on a live model or a live scrape: the API boots from a committed seed (database plus model-answer cache) and the PWA ships with a snapshot of the same data, so it renders even if the API is asleep.

| | URL |
|---|---|
| PWA (Cloudflare Pages) | https://enam-ai-test.pages.dev/ |
| API (Render, free web service) | https://finn-api-7n6q.onrender.com (`/health`, `/debug/sources`, `/stats/llm`) |

Both redeploy on every push to `main` (`render.yaml` sets `autoDeployTrigger: commit`). The first request to a sleeping Render service takes about a minute.

## 1. Refresh the data (on the laptop, right before deploying)
```bash
cd backend
uv run python -m scripts.ingest                       # BSE filings, daily and 15-minute prices (incremental)
uv run python -m scripts.refresh_snapshot --classify  # classify new filings, export frontend/public/data/*.json
uv run python -m scripts.enrich_results               # results cards (Gemini reads the PDF; paced; cached)
uv run python -m scripts.build_research INFY BAJFINANCE POLYCAB KPIL   # needs the local model tunnel or Gemini quota
uv run python -m scripts.refresh_snapshot             # again, so research and stats are in the snapshot
uv run python -m scripts.export_seed                  # backend/seed/{finn,llm}.sqlite for the deployed API
uv run pytest -q && cd .. && git add -A && git commit -m "Refresh data" && git push
```
Optional local model for build-time work (free, no daily quota): `ssh -N -L 11435:localhost:11434 <gpu-host>` to an Ollama box that serves the `finn-gpt-oss` alias (see `backend/config/models.yaml`). Render sets `FINN_USE_LOCAL_LLM=0`, so the deployed API never tries it.

## 2. API on Render
1. Render dashboard, **New, Blueprint**, select the GitHub repo (it reads `render.yaml`).
2. Add the three keys when prompted: `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY` (all have free tiers; they live only in Render's environment).
3. Open `/health`, then **`/debug/sources`**, which checks from the server whether BSE, screener.in and Yahoo accept its requests.

Measured result from Render: **BSE's announcement API answers 403** (cloud IPs are blocked), screener.in and yfinance are fine. That is why filings are ingested on a laptop and shipped in the snapshot and seed. Earnings-call PDFs do download from Render: a live research build for an unseen ticker (GODREJCP) finished there in about a minute, with 4 transcripts read and 8 promises judged. If a transcript host ever blocks, the report degrades to the financials plus an explicit gap.

## 3. PWA on Cloudflare Pages
Root directory `frontend`, build command `npm run build`, output directory `dist`, and the environment variable `VITE_API_BASE=https://finn-api-7n6q.onrender.com` (no trailing slash). With the API asleep the app shows the **SNAPSHOT** chip and real data; when the API answers it shows **LIVE**.

## 4. Verify
On a phone (close and reopen the tab so the PWA drops its cache): Today across the four windows, a results card with its "Revenue, PBT, PAT checked" badge, a price chart, Research for INFY, an unseen ticker (shows build progress), the Network tab, and the Cost screen matching `/stats/llm`. Backend tests: `cd backend && uv run pytest -q`. Browser checks: see `frontend/README.md`.

## Known limits
- Free-tier Gemini has daily per-model quotas. A live build for an unseen ticker costs about 6 to 8 calls and can be slower or partial once the day's quota is gone; pre-built reports are unaffected.
- **Live research is cached only on Render's ephemeral disk**, so a report built for an unseen ticker is lost on restart or sleep. The PWA keeps a copy on the device. A persistent disk or a database is the upgrade path.
- Render's free tier sleeps after 15 minutes idle and its disk is ephemeral (hence the boot-time seed). A free cron hitting `/health` every 10 minutes keeps it warm.
- screener.in's terms are personal and non-commercial: low volume, cached, robots.txt respected.
