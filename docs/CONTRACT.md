# FINN API contract

The single source of truth between `backend/` (Claude Code) and `frontend/` (Antigravity).

| Source of truth | File |
|---|---|
| Schemas (authoritative) | [`backend/app/models.py`](../backend/app/models.py) |
| Machine-readable spec | [`docs/openapi.json`](openapi.json). Generate TS types with `npx openapi-typescript ../docs/openapi.json -o src/api/schema.d.ts` |
| Examples / mocks | [`docs/examples/*.json`](examples/). **Illustrative mock data: the numbers and people are fake.** |
| Change procedure | `.claude/skills/finn-contract-change/SKILL.md`. Changes are additive only, and need a changelog line below |

Regenerate after any change to the models (run from `backend/`):
```
uv run python -m scripts.make_examples && uv run python -m scripts.export_openapi && uv run pytest -q
```

## Conventions
- **Times:** ISO-8601 with IST offset, e.g. `2026-11-11T18:30:00+05:30`. Display them relative ("3h ago") within 24h.
- **Money:** float in **₹ crore** (`unit: "INR_CR"`). The frontend formats with Indian grouping (`₹1,23,456 Cr`).
- **Percent:** a float where `12.4` means 12.4%. The frontend adds the sign and the % symbol.
- **IDs:** a filing `id` is the BSE `NEWSID` (a UUID string; examples use `ex-000n`). A company is keyed by its **NSE symbol**.
- **Nulls:** an optional value is `null`, never a missing key. The frontend must handle `null` in every optional field.
- **Union `enrichment`:** discriminated by `type`, one of `results` (ResultsCard), `management` (BioCard) or `oneliner` (OneLiner), or `null`.

## Enums
| Enum | Values |
|---|---|
| `Category` (17) | `results, m_and_a, fund_raise, management_change, litigation, insider_trading, earnings_call, investor_meetings, credit_rating, dividend, bonus_split, capex, press_release, postal_ballot, agm_egm, pledging, unclassified`. Mapping rules are in `.claude/skills/finn-data-sources/taxonomy.md` |
| `Priority` | `high, medium, low, hidden` |
| `Verdict` | `met, missed, slipped, quietly_dropped, pending, raised, cut`. Definitions are in `.claude/skills/finn-grounding/SKILL.md` |
| `AlertKind` | `volume_spike, price_move, material_filing` |
| `WindowLabel` | `24h, 3d, 7d, custom` |

## Endpoints
Base URL: `VITE_API_BASE` (the Render URL in production, `http://localhost:8000` locally). The backend currently runs in **mock mode**, serving `docs/examples/` with the same shapes as the real implementation.

| Method / path | Response | Query / body | Example |
|---|---|---|---|
| `GET /health` | `Health` | — | `health.json` |
| `GET /companies` | `Company[]` | — | `companies.json` |
| `GET /prices` | `PriceSnapshot[]` | — | `prices.json` |
| `GET /digest` | `Digest` | `window` (default `24h`); `start`, `end` (required if `custom`); `volume_multiple`, `price_move_pct`; `interests`, `muted` (comma-separated `Category`) | `digest-24h.json`, `digest-3d.json` |
| `GET /filings/{id}` | `Filing` | — (the enrichment is computed lazily and cached) | `filing-results.json`, `filing-management.json`, `filing-oneliner.json` |
| `GET /alerts` | `Alert[]` | `volume_multiple`, `price_move_pct` | `alerts.json` |
| `GET /research/{symbol}` | `Research` | — | `research-INFY.json` (ready), `research-building.json` |
| `GET /stats/llm` | `LlmStats` | — | `stats.json` |
| `GET /debug/sources` | `SourcesReport` | — (runs the live source checks from the server; used as the cloud-IP test at deploy) | `debug-sources.json` |
| `POST /ask` *(stretch)* | `AskResponse` | body `AskRequest {question, context {screen, symbol?, filing_id?}}` | `ask.json` |

### Behaviour rules
- **Digest buckets.**
  - `needs_you` holds at most 5 filings: priority `high`, or `medium` with a price reaction above the thresholds, sorted by `score`.
  - `also_material` holds the remaining high/medium filings.
  - `routine` holds `low` and `hidden` filings, collapsed, with per-category counts.
  - Muted categories always go to `routine`.
- **Research is asynchronous.** If no cached result exists, `GET /research/{symbol}` starts a background build and returns `status: "building"` with `progress[]`.
  - The client polls every 3 s until the status is `ready`, `partial` or `failed`.
  - `progress[]` is user-facing copy, for example "Found 5 concall transcripts".
  - `gaps[]` lists missing data explicitly. The UI shows it and never hides it.
- **Grounding.** Every `Claim` shown has `verified: true`, and each source carries `{doc_id, page, quote}`. Unverified claims never reach the API.
- **Results cross-check.** `cross_check.status = "mismatch"` means the filing's numbers disagree with screener.in by more than 2%. Show a badge.

## Client-side settings and offline mode
- **Settings** (`Settings` model; defaults in `settings.json`) live in **localStorage**. There's no auth and no server state; the values are sent as query params.
- **Snapshot-first data loading:** the frontend loads `frontend/public/data/*` instantly, then refreshes from the API if it's reachable, and shows an "as of <time>" chip. A custom window needs the API.
- **Offline alerts:** with no API, the frontend recomputes price/volume alerts from `prices.json` with the user's thresholds:
  - `vol_ratio >= volume_multiple` raises `volume_spike`.
  - `|pct_1d| >= price_move_pct` raises `price_move`.

  This is the **one deliberate logic duplication** between backend and frontend.

### Snapshot layout (`frontend/public/data/`, written by `scripts/refresh_snapshot`, task B6)
```
meta.json            SnapshotMeta {as_of, portfolio_size, research_symbols}
companies.json       Company[]
prices.json          PriceSnapshot[]
digest-24h.json      Digest      (also digest-3d.json, digest-7d.json)
filings/{id}.json    Filing      (enriched filings only)
research/{SYM}.json  Research    (pre-seeded research names)
stats.json           LlmStats
```
Until B6 exists, seed the folder by copying `docs/examples/`.

## Changelog
- 2026-11-11: v0.1.0, initial contract (A2). Mock API serving examples. `DigestWindow` uses `start`/`end` (not `from`/`to`, to avoid reserved words in TS/Python). Added `GET /alerts` and `GET /debug/sources`.
