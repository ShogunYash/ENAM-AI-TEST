@AGENTS.md

# Claude Code specifics

## Working style
- The user doesn't want repeated edit-approval prompts: make the file edits a task needs. **Do ask** before
  pushing to a new remote/branch, deploying, sending anything external, or deleting data. Commits and pushes to
  `main` for planned tasks are pre-approved.
- Write commit messages that reference task IDs from `docs/PLAN.md` (e.g. "B3: results extractor").
- **Before every push run `git branch --show-current`.** Antigravity shares this working tree and may leave it on `frontend/scaffold`; use `git push origin HEAD:main` only when HEAD is a fast-forward of main, and verify with `git rev-parse --short origin/main` afterwards. (A4/G1 commits once sat unpushed on that branch.)
- Report honestly. If a live source or test fails, say so with the output; never fake a pass.

## Which skill when
| Situation | Skill |
|---|---|
| Touching `backend/app/ingest/`, a fetch failing, mapping filings to categories | `finn-data-sources` |
| Any code that would call an LLM | `finn-llm-feature` |
| Anything in `backend/app/research/`, or a research output | `finn-grounding` |
| Changing a response shape or endpoint | `finn-contract-change` |
| Reviewing or critiquing frontend output | `finn-ui-principles` |
| Before a deploy or submission | `/finn-demo-check [ticker]` |
| After a meaningful session | `/finn-ai-history <tool> <link> <summary>` |
| Near the deadline | `/finn-submission` |

## Model and effort guidance (the user switches with `/model`)
- **Opus 5.5, high:** contract changes, CLAUDE/AGENTS rules, C3 promised-vs-delivered logic, bugs that survive 2 attempts.
- **Sonnet 5.5, medium** (high for the LLM router): most implementation (ingest, pipeline, API, deploy).
- **Haiku 5.5, low:** test runs, repo searches, README facts.

## Environment notes
- Windows 11. Use the `uv` runner (Python 3.14 is installed, the project targets 3.12+). No Docker, `act`, `gh` CLI or WSL distro is available.
- **`ssh station`** (user's Linux box, key-based, 32 cores / 125 GB RAM / ~875 GB free) is available as a Linux test environment.
  - It has Python 3.10, git, node and docker, but **the user isn't in the docker group** (permission denied; don't use sudo), and port 8765 is used by something else.
  - It can't clone the (private) repo. Ship files with `git archive HEAD backend data docs | ssh station 'tar -x -C /tmp/finn-a4'`.
  - Python 3.12 comes from `uv` installed in a throwaway venv, with `UV_CACHE_DIR` and `UV_PYTHON_INSTALL_DIR` under `/tmp/finn-a4`. A previous run left `/tmp/finn-a4/.tool` for that. Delete `/tmp/finn-a4` to clean up.
  - A4 results there: 48/48 tests pass, `smoke_sources.py` passes (BSE, screener.in, yfinance), and the API idles at about 60 MB RSS.
  - It is **not** a cloud datacenter IP, so it doesn't replace the Render `/debug/sources` check.
- GitHub Actions can't be triggered from here. **Push ingest runs on the laptop** and commits the snapshot.
  The cloud-IP check happens at deploy via `GET /debug/sources`.
