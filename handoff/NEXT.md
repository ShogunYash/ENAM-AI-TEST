# NEXT (overwrite each round): the Network layer, branch `network`, 15 Nov 2026

Team: Claude Code (backend, integration, merging), Codex (the Network UI), Antigravity (QA). No ChatGPT this round.

Done on `network`: backend, contract, examples, snapshot export, docs/ARCHITECTURE.md (with an honest privacy section), the frontend DATA layer
(`frontend/src/api/network.ts`), and the 36-person SYNTHETIC network (`data/network.json`, 27 tracked companies covered, 55 expertise themes).

## Codex: the UI (critical path)
Worktree `D:\Repos\ENAM-AI-TEST-codex`, branch `codex/network-ui` (already up to date with `network`, including the 36 people).
Start Codex in THAT folder (not in D:\Repos\ENAM-AI-TEST, where Claude Code works) and paste:
```
Read AGENTS.md and handoff/CODEX-NETWORK-UI.md and do exactly what the task file says: build the Network UI for this React + Tailwind PWA
in the worktree you are in, branch codex/network-ui. Read the rules and the data layer first. Make small commits (no AI attribution lines),
never touch main or network, never push, keep the build green, and write handoff/CODEX-NOTES.md at the end.
```

## Antigravity: QA harness (new file only, no overlap with Codex)
In the worktree `D:\Repos\ENAM-AI-TEST-fe`: `git checkout -b frontend/network-qa network`. Paste:
```
Read AGENTS.md and handoff/CODEX-NETWORK-UI.md (it describes the Network UI that Codex is building on another branch; do NOT build it).
Your job: write ONE new file, frontend/scripts/test-network.js, in the style of frontend/scripts/test-portfolio-watchlist.js (headless Chrome over
CDP, port 5199, 390x844, light and dark). It must check, using visible text (the spec's exact strings), that:
 1. the bottom nav has a "Network" tab and tapping it shows the heading "Network", the line "Synthetic demo network", and the sections
    "Ask your network", "Keep warm" and "Expertise map" (each with at least one item);
 2. tapping a chip like "wires and cables" in the Expertise map reveals member names;
 3. the "Copy" button on a Keep-warm card changes to "Copied";
 4. with the API unreachable (start a second vite on another port with VITE_API_BASE=http://localhost:9), asking a question shows the offline message
    "Asking needs the live API" and the rest of the tab still renders;
 5. on Today > 30d > company HDFCBANK (or any company with network insights) a card shows an "In your network" strip; tapping it expands to person rows
    with a "why" line; on a card without an insight there is no strip;
 6. on Research > a pre-built company (e.g. INFY) the card "Who to call about" appears;
 7. tapping a person name opens a dialog (role="dialog") that closes with Escape;
 8. Profile shows "Your network is private to you".
Print PASS/FAIL per check with a screenshot per check into frontend/screenshots/ (do not commit screenshots). Commit only the script.
Then wait: when Claude Code tells you the Codex branch is merged, run it, fix flaky selectors in YOUR script only, and report which checks fail.
```

## Claude Code (me), when Codex is done
Review `codex/network-ui`, merge into `network`, run tsc, build, the 3 existing browser suites + Antigravity's test-network.js, check 360px in both themes,
update README and SUBMISSION_DRAFT (Founding subject, Network paragraph, link to docs/ARCHITECTURE.md), merge `network` into `main`, push `main`,
check Render and Pages. Fallback if the UI cannot be finished in time: tag `ai-engineer-v1` is the Push + Pull version with the old subject line.
