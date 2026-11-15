# AI build history

How FINN was built with AI tools. Roles: **Claude Code** = backend, pipelines, integration, deploy prep; **Antigravity** = `frontend/`;
**ChatGPT** = product thinking, prompt drafting, review; **Codex** = the Network UI (15 Nov). Plan and task IDs: [../PLAN.md](../PLAN.md). Rules every agent followed: [../../AGENTS.md](../../AGENTS.md).

ChatGPT-written prompt drafts (classification, results extraction, one-liners, guidance, promised-vs-delivered, management bio) are kept verbatim in [`chatgpt-prompts/`](chatgpt-prompts/); the production versions are in `backend/app/prompts/`. ChatGPT also audited every research item, management card and results card (its findings are applied in `backend/config/research_review.json` and `bio_review.json`) and wrote the Cost/Research/Thresholds screen copy.
The prompts that run in the app are in [`../../backend/app/prompts/`](../../backend/app/prompts/) (versioned).

| Date (IST) | Tool / model | Task IDs | What happened (decisions, not activity) | Link |
|---|---|---|---|---|
| 11 Nov | Claude Code / Sonnet 5.5 + Opus 5.5 | plan, A0-A4 | Read the brief; chose BSE over NSE (cloud-IP blocking), rules-first classification, native PDF over text extraction, no vector DB; wrote the API contract first so frontend and backend could work in parallel | `<export: Claude Code session>` |
| 11-12 Nov | ChatGPT | A1, G1-G3 | Chose the portfolio and research names; drafted guidance_map, pvd_reduce, classify_batch, so_what, results_extract prompts and tested them on real filings | `<share link>` |
| 12 Nov | Antigravity / Gemini 3.8 Flash | A5, C5, B7 | Built the PWA scaffold, Today / Research / Thresholds / Cost screens; later fixed LIVE-vs-mock labelling after a review found it showed fixtures as live | `<share link>` |
| 12-13 Nov | Claude Code | B1-B3, C1-C3 | Found by measurement: changed-figure quotes passed fuzzy verification (fixed); first Infosys verdicts wrongly "met" (guards added); KPIL guided 25%+ but filed 21.6% (now computed from numbers) | `<export: Claude Code session>` |
| 13 Nov | Claude Code + local gpt-oss-20b | B4, one-liners, unseen-ticker test | Used the station GPU to escape the Gemini daily quota; `reasoning_effort=low` cut a transcript from 136 s (failing) to 9 s | `<export: Claude Code session>` |

**To complete before submitting:** replace each `<...>` with a real share link or exported transcript. Claude Code sessions are JSONL under
`~/.claude/projects/<project-dir>/`; copy the relevant ones into `docs/ai-history/claude-code/`, then scrub them (the `/finn-ai-history` skill lists what to redact:
API keys, `.env` contents, personal e-mail or phone numbers). ChatGPT and Antigravity need share links created from inside those tools.
| 15 Nov | Claude Code / Sonnet 5.5 | Network | The Founding brief adds a third layer. Chose rules over a model for every match (evidence listed), only tenure the filing states (no guessed careers), a synthetic and labelled network, a planner-only agent that cannot name anyone outside the network, and a short `network` branch with a fallback tag `ai-engineer-v1`; wrote the data layer and the 36-person data | `<share link>` |
| 15 Nov | Codex | Network UI | Built the Network tab, filing strips, Research "Who to call", person sheet and privacy card in its own worktree and branch from a written spec; reported its checks and limits honestly | `<share link>` |
| 15 Nov | Antigravity | Network QA | Wrote the browser test suite for the Network from the spec before the UI existed, then ran it against the merged UI | `<share link>` |
