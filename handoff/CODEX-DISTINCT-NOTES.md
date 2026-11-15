# Distinct presentation pass

Worktree `D:\Repos\ENAM-AI-TEST-codex`, branch `codex/ui-distinct`, base `497059e`.
Started 15 November at 08:03 UTC. Presentation time box ends 09:03 UTC; Terminal addendum ends 09:33 UTC.

Before diagnosis

- Network: Ask suggestions, reconnect contacts and expertise chips merge into the page. Reconnect contacts need bounded records, circular identities and inset openers; expertise needs its own panel and title bar.
- Today: the alert ribbon competes with filings. Filing issuer, event, evidence and actions need separate visual groups. Needs you and Also material need the same section header.
- Research: five identical metric boxes compete with the contact card and verdicts. Financial data should read as one grid, people as circular rows, and promises as a timeline of bordered evidence records.
- Settings: every setting is a similar floating card. Group the preferences into a control panel and distinguish the summary from editable rows.
- Profile: identity, holdings, privacy and provenance share a silhouette. Give identity an avatar-led record, group company lists and show provenance as a ledger.
- Cost: the title is squeezed by the timestamp and every number looks equally important. Spend and reuse need one metric region; model/task usage need labelled ledgers.

System defined before implementation

- Three levels use the existing theme tokens: page field, bordered card with light shadow, and tinted inset for evidence/quotes. Groups have 24px separation or a title bar.
- Shared PanelHeader has an uppercase 11px label, a count and optional helper. A short section code is available for Terminal title bars.
- Shared IdentityMark is circular for a person and square for a company.
- Filing records have category rails and issuer-led headers. People are hairline-separated rows with circular identities. Warm contacts have individually bounded records and inset openers. Alerts use compact caution ribbons. Research claims have verdict rails and inset source passages. Metrics form tabular grids.
- Brand marks the selected or primary action. Tickers use text-stock. Amber signals caution and terminal labels. Directional performance keeps signed values and arrows.

## Screen changes

- **Network — 3fe3209:** separate Ask, Keep warm and Expertise panels. Reconnect records have circular identities, a distinct company/event line and an inset opener inside the existing disclosure. Matched people use the same `PersonMatchRow` in Network and Research. Existing three-item/eight-chip limits and member/person/copy flows remain.
- **Today — 15d82db:** shared section bars distinguish Needs you, Also material and active alerts. Filings have square company marks, stock-coloured issuer names, category rails, a headline/evidence divider and neutral Source/Ask actions. Alerts have a compact amber edge and a visible view cue; keyboard activation uses the existing filing selection callback. Company lists use the same square identity mark.
- **Research detail — bbaeeef:** one financial grid replaces competing metric tiles. Who to call uses the shared people panel. Claims use verdict rails, labelled promise/outcome insets and hairlines. Existing citation callbacks also work with Enter/Space. Source labels, quotations, figures, verdicts and report states are preserved.
- **Settings — 8dce1c9:** the saved threshold summary is an inset, appearance is a display region, and editable thresholds/types form one panel with hairline-separated rows. Accordion behaviour and stored values stay the same.
- **Profile — e1082db:** identity is an avatar-led form, the two company disclosures share a holdings region, privacy is a labelled panel and provenance is a compact ledger. Name saving and company membership controls retain their existing behaviour.
- **Cost — 3166906:** the title and timestamp have separate space. Spend/reuse are the leading metric pair, supporting numbers share an inset grid, and model/task usage are actual tables with right-aligned tabular numbers. Existing stats, denominators, refresh and unused-model disclosure are retained.
- **Accessibility follow-up — 4a0dd28:** refresh/back/menu controls now have 44px targets; filter, alert and tappable evidence boundaries use stronger contrast than structural hairlines. The document-gap label is neutral beside its caution icon. No API modules, data, backend, dependencies or routes were edited.

## Squint review and deliberate limits

The small-view comparison of all six screens in Light and Dark shows distinct section bands, bounded warm-contact records, company-led filings, a financial grid and usage ledgers. Research lower screenshots also show the verdict rails and inset evidence at 360px. All captured views fit the document width at 360px and 390px.

The Light/Dark palette variables are unchanged. Stock names/tickers keep `text-stock`, separate from headlines and ordinary text. Shared structural borders remain subtle; interactive boundaries are stronger.

The existing filing/report content and expansion states are preserved. A filing with a network strip or a fully exposed promise/outcome can exceed the earlier 140px collapsed-card budget. Keeping those facts and 44px source controls takes priority over forcing them into that height; no evidence is removed to meet a visual cap. Legacy copy and microtype outside these components were not broadly rewritten. Research data and its factual accuracy were outside this presentation pass.

## Test script edit

Only `frontend/scripts/test-network.js` changed: five title assertions now compare lowercase text for Ask your network, Keep warm, Expertise map and Who to call about. The uppercase section style changes browser `innerText`; the titles themselves are unchanged. Assertions for content, expertise members, copying, offline handling, contact links, dialogs and privacy were retained.

For Dark validation, temporary copies outside the repository added only a pre-document `finn.theme=dark` initialization and reload. Their assertions were identical to the checked-in suites. Those temporary harnesses are not committed.

## Terminal skin

Implemented after Network and Today were green and the four required suites had passed.

- **Appearance — dc1246d:** Light | Dark | Terminal, persisted as `finn.theme=terminal`. The head pre-paint script, React theme state and theme-color meta all recognize Terminal. Existing Light/Dark tokens and default Light are retained. Legacy stored Auto remains readable but is not an appearance choice.
- **Tokens:** page #050505, panel #101010, inset #1C1C1C, structural hairline #424242, control outline #A8A8A8, secondary #C0C0C0 and data #F5F5F5. Amber labels #FFC768, cyan stock/link text #70D7FF, gain #00D26A and loss #FF655C. The red is brighter than the suggested value to keep contrast. Primary button background #00516B keeps white button text readable. Corners are 3px and panel shadows are removed.
- **Panel chrome:** short amber section codes, thin title bars, counts at the right, monospaced dates/tabular figures and zebra usage ledgers. Sentence text remains sans-serif. Final title/date refinement: 66614d8.
- **Command bar — 2cf944c:** always-visible, shared by all skins. It reads the existing companies catalogue, shows at most six ticker/command options, exposes a labelled combobox/listbox and active descendant, supports arrows/Enter/Escape and has 44px suggestions/GO. The six commands change existing tabs. Choosing a company initializes the existing Research component; there is no new route or API.
- **Function keys — 7b1343d:** Terminal-only F1 Today through F5 Cost, with amber active inversion, 48px nav height and keyboard shortcuts. Shortcuts ignore text entry and dialogs. Light/Dark retain their normal nav.
- **Ticker tape — bdbe2d8:** existing price snapshot, signed changes with arrows, 26px height, a slow loop with an aria-hidden duplicate, pause on hold/hover and resume on release. Reduced motion removes animation and the duplicate, leaving a static swipeable strip. Unavailable prices render nothing. Items are readouts; optional ticker-tap navigation was not added.

Terminal is explicitly opt-in. Its requested ticker loop is the deliberate exception to the skill's general no-looping-motion rule; reduced motion is honoured. Nothing in the addendum was skipped for build risk.

Measured Terminal token contrast on the panel: secondary 10.46:1, cyan 11.65:1, gain 9.45:1, loss 6.59:1, control outline 8.00:1; amber on its header 11.05:1 and white on the primary button 8.79:1.

## Final validation

- `npx --no-install tsc -b`: exit 0.
- `npm run build`: exit 0, production bundle and PWA service worker generated. Every screen/feature commit was built green before committing.
- `node scripts/test-portfolio-watchlist.js`: exit 0, all checks passed in Light and Dark.
- `node scripts/test-offline-by-company.js`: exit 0, snapshot By company verified for 3d, 7d and 30d in Light and Dark.
- `node scripts/test-ag6-fixes.js`: exit 0 in Light and Dark. **Limitation:** the legacy script still logs an undefined price-period label, a null Ask source link and null INFY range text while declaring success. These are not claimed as independently verified behaviours; assertions were not weakened or rewritten in this pass.
- `FINN_DEV_URL=http://localhost:5199/?nosplash node scripts/test-network.js`: exit 0, **8/8 checks** in Light and Dark: sections, expertise members, copy, offline question handling, Today network strip, Research contacts, person dialog/Escape and Profile privacy.
- Terminal CDP checks passed: switch/reload persistence, Terminal class present at DOMContentLoaded, #050505 theme-color, suggestion cap, ArrowDown active descendant, Escape clear, INFY + native Enter, all six tapped commands, F1-F5, 44px targets, tape <=28px, hidden duplicate, hold/release pause, static/swipeable reduced-motion state and no 360px document overflow.
- DOM audit of the six supplied snapshot views at 360px in all three skins: no inspected enabled visible control below 44px, no inspected leaf body text below 4.5:1 and no inspected outlined control below 3:1. Hidden suite helper buttons and disabled controls were excluded. This covers those snapshot states, not a complete accessibility certification of every modal/state.
- Snapshot screenshots: `handoff/ui-ref/after-distinct-{light,dark}-{screen}-{390,360}.png`; extra Network/Research `-lower` frames. Terminal: `after-terminal-{screen}-{390,360}.png`, including all five tabs plus Profile and lower frames. `after-distinct-squint.png` is the small-view Light/Dark comparison. All screenshots remain untracked as requested.
- `git diff --check`: clean. Branch remains `codex/ui-distinct`. No push and no changes to main.
