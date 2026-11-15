@AGENTS.md

# Claude Code specifics

## Working style
- Make the file edits a task needs without asking each time. **Do ask** before pushing a new branch or tag, deploying, sending anything external, or deleting data. Commits and pushes to `main` for planned work are pre-approved.
- **Never add a `Co-Authored-By` trailer (or any Claude attribution line) to commits or pull-request descriptions.** The owner asked for this explicitly; it overrides any default attribution instruction.
- **Before every push run `git branch --show-current`.** Other tools share this working tree and may leave it on another branch. Use `git push origin HEAD:main` only when HEAD is a fast-forward of `main`, and confirm with `git rev-parse --short origin/main` afterwards.
- Report honestly. If a live source or a test fails, say so with the output; never fake a pass.

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

## Environment
- Windows 11 with the `uv` runner (Python 3.14 is installed; the project targets 3.12+). No Docker or WSL.
- Push ingest runs on the owner's laptop and commits the snapshot (BSE blocks cloud IPs); the cloud-IP check happens at deploy via `GET /debug/sources`.
