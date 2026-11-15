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
