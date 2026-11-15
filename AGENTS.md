# AGENTS.md: rules for every AI agent working on FINN

These are tool-neutral rules for Claude Code, Antigravity, ChatGPT/Codex and any other agent. Read them before any change.

## Project
**FINN** is a mobile-first financial investment agent for an Indian public-markets investor, built for the ENAM
AI Engineer Build Challenge (deadline **15 Nov 2026**).
- **Push:** a prioritised digest of BSE filings for a 15–20 stock portfolio, plus configurable price, volume and filing alerts.
- **Pull:** on-demand research on any NSE ticker, grounded only in annual reports and concall transcripts. The flagship view is *promised vs delivered*.

**Thesis: "a triage desk, not a news feed."** Show what needs the investor and why, in under 3 seconds, and collapse everything else.
"Thin-but-working beats broad-but-broken. A demo that doesn't run is the worst outcome."

| Doc | What |
|---|---|
| `docs/PLAN.md` | Master plan: architecture, task board (A0–D6), tool/model per task, risks |
| `docs/CONTRACT.md` | API contract: endpoints, enums, conventions, snapshot layout |
| `docs/CHALLENGE_SUMMARY.md` | The brief, condensed |
| `.claude/skills/*/SKILL.md` | Detailed playbooks: data sources, LLM features, grounding, UI principles, contract changes, demo check, AI history, submission |

## Folder ownership (prevents merge conflicts)
| Path | Owner | Others |
|---|---|---|
| `backend/`, `.github/`, `docs/`, root files | **Claude Code** | read-only |
| `frontend/` | **Antigravity**, working on `frontend/*` branches that Claude Code merges | read-only |
| `frontend/src/components/network/` and the Network wiring in `handoff/CODEX-NETWORK-UI.md` (15 Nov round) | **Codex**, own worktree, branch `codex/network-ui`, never on `main`; Claude Code merges | read-only |
| the UI polish in `handoff/CODEX-UI-POLISH.md` (15 Nov, after the Network round) | **Codex**, same worktree, branch `codex/ui-polish`, never on `main`; Claude Code merges | read-only |
| the visual-distinction pass in `handoff/CODEX-UI-DISTINCT.md` (15 Nov) | **Codex**, same worktree, branch `codex/ui-distinct`, never on `main`; Claude Code merges | read-only |
| — | **ChatGPT** | never commits. It produces prompts, reviews and copy, which get pasted into the repo by the owner |

## Hard rules
1. **In-app AI uses free models only:** the Gemini API free tier, Groq free, and OpenRouter `:free`. Never use paid APIs.
2. **Every LLM call goes through `backend/app/llm/router.run_task`.** It handles caching, fallbacks and the cost ledger. Never import a provider SDK in feature code.
3. **Prompts live in `backend/app/prompts/<task>.md`** with a version number, never inline. Model IDs live in `backend/config/models.yaml`.
4. **Rules before LLMs.** If regex, a lookup or arithmetic can do it (categories, QoQ/YoY, signals, financial tables), don't call a model.
5. **The Pull side uses primary sources only:** annual reports, concall transcripts, exchange filings and screener.in tables. No news, no broker notes, and no model memory of the company.
6. **No claim without a verified quote.** A claim carries `{doc_id, page, quote}`, the quote is fuzzy-matched against the page server-side, and unverified claims are dropped.
7. **Cache first.** Documents are processed once per content hash. Be polite to sources: at most 1 req/s to BSE and 1 req/2s to screener.in.
8. **Contract changes are additive** and follow `docs/CONTRACT.md` → `models.py` → examples → openapi → tests.
9. **Never break the demo path.** The snapshot in `frontend/public/data/` must always render Push without the backend.
10. **No secrets or personal data in the repo.** Keys go in `.env` (git-ignored). Scrub transcripts before committing them to `docs/ai-history/`.

## Commands
```bash
# backend (from backend/)
uv sync                                   # install
uv run uvicorn app.main:app --reload      # API on :8000 (mock mode until real routes land)
uv run pytest -q                          # tests (contract tests must stay green)
uv run python -m scripts.make_examples    # regenerate docs/examples from models
uv run python -m scripts.export_openapi   # regenerate docs/openapi.json
# repo root
uv run backend/scripts/smoke_sources.py   # live check: BSE, screener.in, yfinance
# frontend (from frontend/)
npm install && npm run dev                # PWA on :5173
```

## Conventions
- Python 3.12+, uv, ruff, pydantic v2, FastAPI. TypeScript with Vite + React + Tailwind + shadcn/ui.
- Times are IST (`+05:30`). Money is in ₹ crore. Percentages are floats (12.4 = 12.4%).
- Log meaningful AI sessions in `docs/ai-history/README.md`. This is a submission deliverable.
