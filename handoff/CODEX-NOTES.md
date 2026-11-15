# Codex Network UI handoff

Built in D:ReposENAM-AI-TEST-codex on codex/network-ui, based on 2421c7a.

Implemented the shared PersonMatchRow, NetworkStrip, WhoToCall, PersonSheet, PrivacyCard and NetworkScreen. The Network tab sits between Research and Settings. Filing cards show a network strip only when their ID has an insight. Research detail shows company contacts while loading, building, ready, partial or failed. Person names across these surfaces open one shared sheet with a focus trap, Escape, backdrop close, scroll lock and focus restoration.

Network discovery uses the supplied hooks and the 36-person snapshot. It includes Ask, answer matches, visible tool summaries, offline guidance, reconnect openers with Copy/Copied, and the expertise map sorted by member count. Supplied evidence and reasons are rendered directly. Loading, empty and unavailable states are included.

Assumptions and limits

- The synthetic notice appears on Network, expanded filing strips, research contact cards, person sheets and Profile.
- Profile includes the requested privacy commitments plus an explicit statement that the demo uses shared fictional contacts and investor accounts/deletion controls are planned. Real authentication, investor isolation and deletion remain owner/backend work as documented in docs/ARCHITECTURE.md.
- The optional warm-nudge navigation badge was omitted.
- The collapsed filing strip has a fixed 44px minimum row with a truncated headline. Its complete headline is available through its accessible label, title and expansion.
- No API fields were invented and no dependencies were added.
- Validation used the existing API shapes and committed snapshots. Successful Ask rendering was checked with docs/examples/network-ask.json intercepted in Chrome. A real model-backed /network/ask request was not part of validation.

Validation

- npx --no-install tsc -b: passed.
- npm run build: passed, including service worker generation.
- node scripts/test-portfolio-watchlist.js: passed.
- node scripts/test-offline-by-company.js: passed at all tested windows with the API unreachable.
- node scripts/test-ag6-fixes.js: exited successfully, but its output includes missing-value warnings for its price period, Ask source link and INFY range selectors. Those pre-existing assertions require owner/QA attention before treating that suite as comprehensive.
- Headless Chrome/CDP smoke checks passed for the 36-person snapshot, five bottom tabs, expertise membership, person-sheet opening, focus entry/trapping, Escape close, offline Ask message with remaining sections retained, Copy/Copied and Profile privacy text.
- Screens checked in light and dark at 390x844 and 360x844 with no document horizontal overflow.
- Push checks passed through Today > 30d > HDFCBANK. Only filings whose IDs have insights show strips, each collapsed strip measures 44px, and expansion shows match evidence controls.
- Pull checks passed through Research > INFY, including the Who to call card.
- Supplied Ask fixture checked for its answer, match reasons, tool name and step summary.
- git diff --check: passed.

Uncommitted screenshots are in frontend/screenshots/codex-network-*.png. The supplied handoff/ui-ref/ folder remains untracked.

Local commits

- 5fb8c5c Network UI: shared contact sheet and contextual matches
- 44a94bc Network UI: discovery tab and Push Pull integration
- Final commit contains the 44px strip refinement and this handoff.

Owner integration

Merge codex/network-ui into network, run Antigravity's test-network.js once available, and verify deployment. Both existing browser suites and custom smoke checks ran against the local Vite server on port 5199. Source changes are confined to the requested frontend components and this notes file.
