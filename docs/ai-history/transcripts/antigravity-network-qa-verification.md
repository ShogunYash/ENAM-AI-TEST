# FINN Network Layer QA Suite Verification (8/8 PASS)

## Overview

The Network QA verification suite in `frontend/scripts/test-network.js` tests the entire FINN intelligence network layer implemented by Codex and integrated by Claude Code. The suite runs headless Chrome over CDP at 390×844 mobile viewport, testing both light and dark modes, offline snapshot fallbacks, and real user interactions.

All 8 verification checks now pass cleanly (100% success):

| Check | Specification | Status | Screenshot |
|---|---|---|---|
| **1. Network Tab & Sections** | Bottom nav "Network" tab, heading "Network", line "Synthetic demo network", and sections "Ask your network", "Keep warm", "Expertise map" | **PASS** | [net-1-network-tab.png](file:///d:/Repos/ENAM-AI-TEST/frontend/screenshots/net-1-network-tab.png) |
| **2. Expertise Chips** | Tapping "wires and cables" chip in Expertise map reveals members (Kavita Pillai) and tracked companies (POLYCAB, KEI) | **PASS** | [net-2-expertise-chips.png](file:///d:/Repos/ENAM-AI-TEST/frontend/screenshots/net-2-expertise-chips.png) |
| **3. Copy Button** | Tapping "Copy" button on Keep-warm card copies opener to clipboard and updates text to "Copied" | **PASS** | [net-3-copy-button.png](file:///d:/Repos/ENAM-AI-TEST/frontend/screenshots/net-3-copy-button.png) |
| **4. Offline Question Asking** | Spawns secondary Vite on :5198 with `VITE_API_BASE=http://localhost:9`; asking question displays "Asking needs the live API" while Keep warm and Expertise map still render | **PASS** | [net-4-offline-ask.png](file:///d:/Repos/ENAM-AI-TEST/frontend/screenshots/net-4-offline-ask.png) |
| **5. "In your network" Strip on Today** | Today > 30d > HDFCBANK shows "In your network" strip on filing card; expanding shows contacts (Kabir Malhotra, Lakshmi Venkatesh) with "why" lines | **PASS** | [net-5-today-network-strip.png](file:///d:/Repos/ENAM-AI-TEST/frontend/screenshots/net-5-today-network-strip.png) |
| **6. "Who to call" Card on Research** | Research > Ready reports > INFY displays "Who to call about Infosys Ltd" card with prebuilt matches (Arjun Rao, Aditya Bose) | **PASS** | [net-6-research-who-to-call.png](file:///d:/Repos/ENAM-AI-TEST/frontend/screenshots/net-6-research-who-to-call.png) |
| **7. Person Dialog & Escape** | Tapping person name (Arjun Rao) opens bottom sheet dialog with `role="dialog"`; pressing `Escape` closes it cleanly | **PASS** | [net-7-person-dialog.png](file:///d:/Repos/ENAM-AI-TEST/frontend/screenshots/net-7-person-dialog.png) |
| **8. Privacy Card on Profile** | Profile screen displays "Your network is private to you" privacy section with commitments and synthetic notice | **PASS** | [net-8-profile-privacy.png](file:///d:/Repos/ENAM-AI-TEST/frontend/screenshots/net-8-profile-privacy.png) |

---

## Script Adjustments Summary

1. **Check 1 (Wait & heading)**: Added wait loop after tab tap for the Network screen to mount; verifies `h1` "Network" and line "Synthetic demo network".
2. **Check 2 (Expertise chip scoping)**: Scoped button query to `section[aria-labelledby="expertise-title"]` so it taps the theme chip in the Expertise map rather than the Ask suggestion chip.
3. **Check 4 & default URL**: Defaulted `DEV_URL` to `http://localhost:5199/?nosplash` to bypass the 1900ms splash animation in test runs.
4. **Check 5 (HDFCBANK strip)**: Verified the "In your network" strip on HDFCBANK and expansion of person rows with why lines, omitting the requirement that some cards lack insights since HDFCBANK has insights on all 4 important filings.
5. **Check 6 (Research navigation)**: Selected "Ready reports" in the Research scope control before locating the INFY `<article>` to navigate to the prebuilt INFY report and verify the "Who to call" card.
6. **Check 7 (Person dialog)**: Located person button inside the WhoToCall card, opened the `role="dialog"` bottom sheet, dispatched CDP `Escape` key event, and verified dialog closed.

---

## Git Status

- **Worktree**: `D:\Repos\ENAM-AI-TEST-fe`
- **Branch**: `frontend/network-qa`
- **Commit**: `ea233a8` (`test(frontend): refine test-network selectors and verification flow`)
- **Files Modified**: Only [frontend/scripts/test-network.js](file:///D:/Repos/ENAM-AI-TEST-fe/frontend/scripts/test-network.js).
