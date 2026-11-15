---
name: finn-ai-history
description: Log an AI build session (Claude Code, Antigravity, Codex) to docs/ai-history/ — a required submission deliverable — and export/scrub Claude Code transcripts. Use after any meaningful session or when preparing the submission.
argument-hint: "<tool> <share-link or 'local'> <one-line what it did>"
disable-model-invocation: true
---

# Log AI build history

The brief asks for "the coding-agent and LLM conversations you used while building". The goal is to
show *how* you work with the tools: decisions, course-corrections and prompts. Raw volume isn't the point.

Arguments: `$ARGUMENTS`, in the form `<tool> <link|local> <summary>`. If any part is missing, ask the user for it.

## Steps
1. If `docs/ai-history/README.md` doesn't exist, create it:
   ```markdown
   # AI build history
   How FINN was built with AI tools. Tool roles: Claude Code = backend/integration, Antigravity = frontend,
   Codex = product/prompt design/review and the UI passes.

   | Date (IST) | Tool / model | Task ID | What happened | Link / file |
   |---|---|---|---|---|
   ```
2. Append one row. Name the task in a few words. Write "What happened" as a decision, not an activity.
   For example: "Chose BSE over NSE after cloud-IP test", not "worked on ingest".
3. **For Claude Code with `local`:** the transcripts are JSONL files under
   `~/.claude/projects/<project-dir>/`.
   - Copy the relevant session file to `docs/ai-history/claude-code/<date>-<topic>.jsonl`.
   - Mention that `/export` can also produce a readable transcript.
4. **Scrub before saving anything.** Search the copied files for API keys (`AIza`, `gsk_`, `sk-or-`, `sk-`),
   `.env` contents, tokens, and personal emails or phone numbers. Redact them as `[REDACTED]`.
   - Report what was redacted.
   - If you're unsure whether something is sensitive, ask the user.
5. Remind the user that Codex and Antigravity conversations need **share links** made from inside those tools.
   Paste them into the row.

Don't commit. The user decides when to commit.
