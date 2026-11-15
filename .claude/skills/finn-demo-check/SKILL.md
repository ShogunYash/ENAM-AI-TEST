---
name: finn-demo-check
description: Pre-deploy / pre-submission health check for the FINN demo — tests, live source smoke test, snapshot refresh, offline-backend check, unseen-ticker run, cost ledger check. Run before every deploy and before submitting.
argument-hint: "[unseen NSE ticker, optional]"
disable-model-invocation: true
---

# FINN demo check

"A demo that doesn't run is the worst outcome." Run every step in order and report a pass/fail table at the end.
If a script below doesn't exist, say so and skip that step.
Never fake a pass.

Unseen ticker to test: `$ARGUMENTS`. If it's empty, pick a mid-cap NSE stock that isn't in `data/portfolio.json`
or the research set, and say which one you picked.

## Steps
1. **Unit tests:** `cd backend && uv run pytest -q`.
2. **Live smoke test:** `uv run backend/scripts/smoke_sources.py` from the repo root (task A0). This makes one BSE fetch, one yfinance batch, one screener page and one call per LLM tier.
   - If a live source fails, check that the cached fallback still serves data and mark the step ⚠️ (not ❌).
3. **Refresh snapshot:** `uv run python -m scripts.refresh_snapshot` (task B6).
   - Writes `frontend/public/data/*.json` and `backend/data/finn.sqlite`.
   - Confirm the files changed and validate them against the schemas in `docs/CONTRACT.md`.
4. **Offline push check:** with the backend **stopped**, build and preview the frontend (`cd frontend && npm run build && npm run preview`).
   - Today and Alerts must render from the snapshot. Check at 390×844.
5. **Unseen ticker:** call `/research/<ticker>` on the deployed (or local) backend.
   - It must finish, or degrade gracefully with explicit empty states, within about 2 minutes.
   - Call it a second time: the ledger must show 0 new LLM calls (cache).
6. **Cost ledger:** fetch `/stats/llm`. Report the total calls, the calls for the new ticker (target ≈ 6), the cache-hit %, and confirm only free models were used.
7. **Grounding spot-check:** open one research report and run the `finn-grounding` review checklist on 5 claims.
8. **Deployed URLs:** open the frontend URL and the backend `/health` URL. Note the cold-start time if Render was asleep.
9. **Cloud-IP check:** `GET <render-url>/debug/sources`. If BSE or screener.in fail from Render, confirm that unseen-ticker
   research degrades gracefully and that the pre-seeded tickers still load.

## Report format
| Step | Result | Notes |
|---|---|---|
| Tests | ✅/⚠️/❌ | ... |

End with a list of the blocking issues, if any. Don't commit or deploy unless the user asks.
