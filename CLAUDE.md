@AGENTS.md

# Claude Code specifics

## Working style
- The user doesn't want repeated edit-approval prompts: make the file edits a task needs. **Do ask** before
  pushing to a new remote/branch, deploying, sending anything external, or deleting data. Commits and pushes to
  `main` for planned tasks are pre-approved.
- Write commit messages that reference task IDs from `docs/PLAN.md` (e.g. "B3: results extractor").
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
- GitHub Actions can't be triggered from here. **Push ingest runs on the laptop** and commits the snapshot.
  The cloud-IP check happens at deploy via `GET /debug/sources`.
