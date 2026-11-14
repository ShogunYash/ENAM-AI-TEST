# Task for Codex: build the Network UI for FINN (React + TypeScript + Tailwind PWA)

You are writing the frontend for the **Network layer** of FINN, a mobile-first investor app ("a triage desk, not a news feed").
The brief it answers: the investor's own contacts become an intelligence layer that appears INSIDE Push (filings) and Pull
(research) at the moments it matters, and can also be queried directly. It must feel like "a quiet advantage, not a contact
list": dense, calm, elegant, no AI slop. All data is a SYNTHETIC demo network and the UI must say so.

## Where you work
- Your own git worktree on branch `codex/network-ui` (created from `network`). Never touch `main` or `network`. Do not push.
- Read `AGENTS.md` and `.claude/skills/finn-ui-principles/SKILL.md` first (rules, anatomy, density), then `frontend/tailwind.config.js`
  and `frontend/src/index.css` (the colour tokens: use ONLY these), `frontend/src/api/network.ts` (the data layer, finished),
  `docs/CONTRACT.md` (Network rows) and `docs/examples/network-*.json` (real shapes).
- `handoff/ui-ref/` (untracked, do not commit) = screenshots of the current app at 390x844, light and dark. Match its look and density.
- Run from `frontend/`: `npm run dev` (the app falls back to the committed snapshot in `public/data/`, so you do not need the API),
  `npx tsc -b`, `npm run build`. Browser suites in `frontend/scripts/*.js` need Chrome and port 5199; skip them if you cannot run them,
  Claude Code runs them at merge.

## Data layer (DONE, do not edit `frontend/src/api/*`)
`useNetworkInsights()` (Map keyed by filing id), `useCompanyNetwork(symbol)`, `useWarmNudges()`, `useExpertise()`,
`useNetworkPeople()`, `askNetwork(question)` (resolves `{offline: true}` when the API is unreachable), `SYNTHETIC_NOTE`.
Types: `NetworkInsight`, `PersonMatch`, `NetworkPerson`, `WarmNudge`, `ExpertiseTheme`, `NetworkAskResponse`, `AgentStep` from `@/api/types`.
If you need a field that does not exist, say so in CHANGES.md instead of inventing it.

## Build (new files under `frontend/src/components/network/`)
1. **PersonMatchRow** (shared): initials avatar, name (bold) + headline (muted), relationship strength as 5 dots (also give it an
   `aria-label="strength 4 of 5"`), the `why` line, and a collapsed "Evidence" toggle listing `evidence` as small mono facts.
   A link badge with icon + word (lucide-react): worked_at_company = Briefcase "Worked there", overlapped_with_person = Users
   "Overlapped", same_school = GraduationCap "Same school", sector_expert = Lightbulb "Expert". Tapping the name calls `onOpenPerson(id)`.
2. **NetworkStrip** (Push): for a filing id with an insight. Collapsed = one 44px line: Users icon + `insight.headline` + chevron.
   Expanded = up to 3 PersonMatchRows; show `insight.note` as a small amber note (with an info icon) when present. For
   `kind="material_event"` lead with the label "Best person to call". Never render for filings without an insight.
3. **WhoToCall** (Pull): a card for the Research detail page: title "Who to call about {name}", top 3 PersonMatchRows,
   skeleton while loading, renders nothing on error.
4. **NetworkScreen** (the 5th tab): header "Network" with the muted line "{SYNTHETIC_NOTE} · {N} people"; "Ask your network" input with
   a send button and 3 chips ("Who knows Bajaj Finance?", "wires and cables", "Who should I reconnect with?"); the answer sentence,
   matches, and a collapsed "How FINN found this" that lists `steps` (tool + summary) so the agent's tool calls are visible;
   offline: a calm one-line "Asking needs the live API. Browse the expertise map below." and keep everything else working.
   Then **Keep warm** (WarmNudge cards: name, "last spoke N days ago", `trigger`, the `opener` in a quote block with a Copy button
   that shows "Copied") and **Expertise map** (theme chips sorted by member count; tapping one reveals its members and the tracked
   company symbols). Empty states for each section.
5. **PersonSheet**: bottom sheet opened from any person name: headline, city, jobs timeline (org, role, years; highlight orgs that
   have an `nse_symbol`), education, expertise tags, "How you know them" and last contact. Follow the pattern of
   `components/today/HowToReadSheet.tsx` (scrim, close button, Escape, focus trap, safe-area padding).
6. **PrivacyCard** for the Profile screen: "Your network is private to you" with 3 short lines (stored per investor, never used to
   train models, you can delete it) and the synthetic notice.

## Integrate (edit these existing files minimally, return them in full)
- `components/cards/FilingCard.tsx`: render `<NetworkStrip filingId=... />` below the card body, above the footer actions.
- `components/screens/ResearchScreen.tsx`: render `<WhoToCall symbol=... name=... />` under the header card in the detail view
  (any status, also while building).
- `components/layout/MobileShell.tsx` and `App.tsx`: add `'network'` to `NavTab`, a 5th bottom tab "Network" (Users icon) between Research and
  Settings, route it to `NetworkScreen`; keep the four existing tabs working at 360px (tighten labels/gaps if needed); optional small
  badge on the tab = number of warm nudges.
- `components/screens/ProfileScreen.tsx`: add `<PrivacyCard />` above "Where the data comes from".
- Open PersonSheet from one place (e.g. a `useState` in NetworkScreen and in the strips via a small context or prop callback).

## Design rules (hard)
- Tailwind classes with the existing tokens only (`bg-zinc-900`, `border-zinc-800`, `text-zinc-300`, `bg-brand`, `text-brand-text`,
  `text-stock`, amber/emerald as already used). No new colours, no inline hex. It must look right in light AND dark.
- Mobile-first at 360 and 390 px wide; tap targets >= 44px; text >= 11px; contrast >= 4.5:1; colour is never the only cue.
- Dense but calm: no cards inside cards, no decorative gradients, subtle motion only (respect `prefers-reduced-motion`).
- Accessible: real buttons, `aria-expanded` on toggles, labelled inputs, focus visible, `role="dialog"` on the sheet.
- TypeScript strict: no `any`. Do not add dependencies (lucide-react, react, @tanstack/react-query are already installed).
- Do not touch `frontend/src/api/*`, `backend/`, `docs/`, `data/`.

## Output
Edit the repository directly and make small commits on `codex/network-ui` (messages like "Network UI: NetworkStrip"; no Co-Authored-By
or any AI attribution lines). Keep a root file `handoff/CODEX-NOTES.md` (commit it): what you built, what you could not do, anything you assumed,
and the result of `npx tsc -b` and `npm run build`. Do not leave the build broken at the last commit.
