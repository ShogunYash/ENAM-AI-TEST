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
| `WindowLabel` | `24h, 3d, 7d, 30d, custom` |

## Endpoints
Base URL: `VITE_API_BASE` (the Render URL in production, `http://localhost:8000` locally). The backend currently runs in **mock mode**, serving `docs/examples/` with the same shapes as the real implementation.

| Method / path | Response | Query / body | Example |
|---|---|---|---|
| `GET /health` | `Health` | — | `health.json` |
| `GET /companies` | `Company[]` | — | `companies.json` |
| `GET /prices` | `PriceSnapshot[]` | — | `prices.json` |
| `GET /digest` | `Digest` | `window` (default `24h`); `start`, `end` (required if `custom`); `volume_multiple`, `price_move_pct`; `interests`, `muted` (comma-separated `Category`) | `digest-24h.json`, `digest-3d.json` |
| `GET /filings/{id}` | `Filing` | — (the enrichment is computed lazily and cached) | `filing-results.json`, `filing-management.json`, `filing-oneliner.json` |
| `GET /digest/companies` | `CompanyList` | `window` (default `30d`) + the same threshold/interest params as `/digest` | `company-list.json` |
| `GET /digest/company/{symbol}` | `CompanyFilings` | `window` (default `30d`), same params | `company-filings.json` |
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
digest-24h.json      Digest      (also digest-3d.json, digest-7d.json, digest-30d.json)
digest-companies-{3d|7d|30d}.json   CompanyList      (by-company view of that window)
company-filings/{SYM}-{3d|7d|30d}.json  CompanyFilings  (one per portfolio company and window, uncapped)
filings/{id}.json    Filing      (enriched filings only)
research/{SYM}.json  Research    (pre-seeded research names)
stats.json           LlmStats
```
Until B6 exists, seed the folder by copying `docs/examples/`.

## Changelog
- 2026-11-13: by-company view for the 30-day window (additive). `GET /digest/companies?window=` -> `CompanyList` (one `CompanySummary` per portfolio company: total, material, categories, best headline `top`, latest `price`), and `GET /digest/company/{symbol}?window=` -> `CompanyFilings` (that company's filings, UNCAPPED: `important` best-first + collapsed `routine`). The flat `/digest` caps its lists (5 / 80), so it cannot show a full 30 days per stock. Snapshot gains `digest-companies-{3d,7d,30d}.json` and `company-filings/{SYM}-{3d,7d,30d}.json` (24h has none: the ranked list is enough there). UI: 24h / 3d / 7d keep the ranked list; 30d shows the company list, tap -> that company's headlines.
- 2026-11-13: `POST /ask` is real. `AskResponse.answerable` (additive, default true). Context `filing` -> answers from the filing card + first PDF pages; `research` -> from the cached report. Every `claims[].sources[]` quote is server-verified; every figure in `answer` already exists in the evidence; otherwise `answerable:false` with a plain sentence (also when no model is reachable). Frontend: show claims' quotes under the answer, and render `answerable:false` as a neutral "FINN can't answer that from this document" state, not an error.
- 2026-11-12: `Health.mode: "live"|"mock"` (default live), additive. `mock` = the API is serving illustrative fixtures because it has no ingested database. Frontend: show LIVE only when `mode=="live"`; otherwise show DEMO DATA. (Found when a worktree backend without a database answered and the UI labelled mock data LIVE.)
- 2026-11-12: `WindowLabel` gains `30d` (additive) and the snapshot gains `digest-30d.json`: results season ends ~10 days before the demo, so the 7-day view shows few results cards. Frontend: add a 30d chip to the window picker.
- 2026-11-12: `Research.is_sample: bool` (default false), additive. True for illustrative fixtures (all of `docs/examples/research-*`); the UI must show a SAMPLE badge whenever it is true, and must NOT infer sample-ness from anything else. Real builds (C1-C3) set it false. Frontend: read `research.is_sample ?? true` so old snapshot files stay badged.
- 2026-11-11: v0.1.0, initial contract (A2). Mock API serving examples. `DigestWindow` uses `start`/`end` (not `from`/`to`, to avoid reserved words in TS/Python). Added `GET /alerts` and `GET /debug/sources`.
