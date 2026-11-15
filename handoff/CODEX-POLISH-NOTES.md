# UI polish notes

Branch codex/ui-polish, worktree D:ReposENAM-AI-TEST-codex, base 6ae8b98.

Before review

Reviewed all ten before-light/dark screenshots in handoff/ui-ref before changing code. The five problems below are the complete scope of this pass, in the task's required order.

1. Network Keep warm exceeds the three-item density budget and shows multiple paragraphs per collapsed card, exceeding 140px.
2. Network Expertise map presents all 55 themes instead of eight followed by a disclosure, and cannot filter themes.
3. Network, Settings and Profile use off-grid gaps/padding and inconsistent type roles. Contact names use text-stock, while multiple secondary actions use brand. Settings controls are shorter than 44px.
4. Today uses a tall dashed empty card without the existing 30-day context.
5. Network, Who to call and PersonSheet have inconsistent loading/empty/unavailable treatment, including looping pulse states and missing research contact states.

Changes, remaining limits, screenshots and exact validation results will be added as the pass completes.

Completed changes in order

1. Keep warm defaults to three items with Show all (N). The full trigger, contact headline and quoted opener are inside an Opener disclosure. Copy remains directly accessible. Collapsed cards measured 133px at both widths and in both themes, including their border.
2. Expertise defaults to the eight largest themes. More themes expands the full list, and Search all themes filters all 55 entries independently of the disclosure. Selected themes retain members and tracked symbols. Member lists also default to three before Show all.
3. Network, Settings and Profile use 12px card padding and 8px gaps. Screen titles are 20px, section/card headings 16px, row text 14px, secondary text 12px and metadata 11px. Contact names, avatars and secondary actions are neutral. Only tickers and company identities use text-stock. Settings targets are at least 44px. Its collapsed accordion rows measure at most 72px. Contact rows use one primary line and a truncated why line, with the complete explanation, headline, relationship badge and facts behind Evidence. Profile's privacy commitments are disclosed from their existing heading, with the synthetic-demo limitation still visible.
4. The tall Today empty card is replaced by compact copy and a 30-day context query through getDigestData('30d', settings) and react-query. The current offline snapshot shows "30 days: 237 filings · 5 need you". Before context arrives, only the first line renders.
5. A shared static one-line NetworkState provides skeleton, empty and unavailable treatment. Network sections, research contacts and PersonSheet use it, without looping pulses or raw error text. Control borders use existing higher-contrast tokens. Inserted Unicode copy and Windows line endings were corrected before the final handoff.

Permitted test edit

Only check 2 of frontend/scripts/test-network.js was adapted. It clicks More themes before selecting wires and cables. Other browser suite files were untouched.

Exact validation results

- npx --no-install tsc -b — exit 0.
- npm run build — exit 0, including PWA service worker generation.
- node scripts/test-portfolio-watchlist.js — exit 0, ALL VERIFICATION CHECKS PASSED.
- node scripts/test-offline-by-company.js — exit 0, offline 3d/7d/30d passed.
- node scripts/test-ag6-fixes.js — exit 0, ALL AG-6 VERIFICATIONS PASSED. The existing suite still prints null for its Ask source and INFY range selectors and an undefined price-period warning. Its success should be read with that limitation.
- FINN_DEV_URL=http://localhost:5199/?nosplash node scripts/test-network.js — exit 0, all 8 checks passed, including Copy, expertise, offline Ask, filing strip, research contacts, Escape and privacy.
- Custom headless Chrome/CDP checks — passed at 390x844 and 360x844, light and dark, for Network, Settings, Profile, Today, research contacts and PersonSheet. Explicit theme assertions, no horizontal scroll, allowed type sizes, 133px warm cards, Settings row budgets and 44px targets passed.
- Forced response checks — all 9 loading/empty/unavailable cases passed for Network, research contacts and PersonSheet. API and snapshot responses were intercepted in the test browser. Contact errors were checked after query retries completed.
- git diff --check — passed.

Screenshots and remaining scope

The 24 final phone captures are handoff/ui-ref/after-{light,dark}-{network,thresholds,profile,today,research,person}-{390,360}.png. Additional after-warm, after-expertise, after-density, after-today and after-state captures document intermediate measurements and forced states. All screenshots remain untracked.

Earlier screenshot harnesses briefly shared a debugging port. Final captures were rerun on a dedicated port with an explicit theme assertion for every capture. All nine state checks were rerun independently on another port.

The existing app header/navigation, Cost screen, results cards and general Research layout were left outside this pass. Expanded details can exceed the collapsed budgets. Full Profile holdings/watchlist remain available through their existing disclosures. The existing shared synthetic network, privacy limitations and backend behaviour are unchanged.

Local commits

- 6de114e UI polish: Keep warm collapse
- 349dd43 UI polish: bounded expertise map and search
- d2ff4b0 UI polish: consistent Network Settings and Profile density
- 38e3feb UI polish: compact Today empty state with monthly context
- The final commit contains state consistency, contrast/encoding corrections and these completed notes.
