# NEXT (overwrite each round; delete old handoffs): colour theme, 14 Nov 2026

Problem (owner): the whole UI is near-black zinc, which feels heavy and generic for a regular consumer.
Goal: a friendly **light default** with real colour, plus a softer **navy dark mode** as an option. No layout changes.

## How (cheap and reviewable): remap tokens, do not edit 700 class names
Tailwind v3. The UI uses ~700 `zinc-*` classes plus emerald/amber/rose/sky accents.
1. In `tailwind.config`, redefine `colors.zinc` (50..950) and the accent shades 300/400/500 of emerald, amber, rose, sky as
   `rgb(var(--z-950) / <alpha-value>)` style CSS variables so opacity modifiers (`bg-zinc-900/60`) keep working.
2. In `index.css` define the variables for `:root` (light) and `.dark` (navy). Set `color-scheme` per theme (it is hard-coded `dark` today).
3. Add Appearance in Thresholds: **Light | Dark | Auto**, saved in localStorage, default **Light** (not Auto: phones in dark
   mode would keep today's look). Apply the `dark` class on `<html>` before first paint (no flash). Update the PWA `theme-color`.
4. Screenshots must show no hard-coded black left: grep for `#000`, `black`, `bg-black`, `#09090b`, `#27272a` (scrollbar) and fix.

## Palette (use these values)
Light ("paper"): zinc-950 page `#F4F6FB` · 900 card `#FFFFFF` · 800 raised/chip `#E9EDF6` · 700 border `#D6DDEB` · 600 `#9AA6BC` ·
500 muted text `#667389` · 400 secondary text `#4D5B71` · 300 `#37465C` · 200 `#222F44` · 100 body text `#121C2E` · 50 `#0A1120`.
Dark ("navy", never pure black): 950 `#0E1424` · 900 `#151D33` · 800 `#1E2842` · 700 `#2A3656` · 600 `#4A5878` · 500 `#7C8AA8` ·
400 `#9AA7C2` · 300 `#B6C0D6` · 200 `#D2D9E8` · 100 `#E8ECF5` · 50 `#F6F8FC`.
Brand: primary `#3558E6` (hover `#2A47C2`), soft tint `#E8EDFD` (light) / `#22305F` (dark). Use it for the selected segment, active
nav tab, primary buttons ("Ask FINN", GO), links, focus ring, and a slim brand-blue top bar under the header or a subtle gradient
`#3558E6 -> #5B7CFF` on the FINN wordmark chip. Selected segmented controls = brand tint + brand text, not grey.
Semantic (text on tinted chip): gain `#0E8A4B` on `#E3F6EC` · loss `#C8283A` on `#FDE8EA` · caution `#A85F00` on `#FFF1D6` ·
info `#0B6FB8` on `#E1F1FB`; dark-mode equivalents lighter (`#3DD68C`, `#FF7A86`, `#FFC24D`, `#5BB8F5`) on 15% tints.
Gain/loss must also keep their arrows and signs (colour is never the only cue).
Category chips (small, tinted, distinct hue per group, same in both themes with adjusted lightness):
results = blue · fund raise = teal · M&A = violet · management change = amber · litigation = rose · insider/pledging = orange ·
credit rating = sky · dividend/bonus/split = green · routine paperwork (agm, postal ballot, press release, meetings, call) = neutral grey.
Priority dot: high = loss red, medium = caution amber, low = neutral.
Cards: white surface, 1px border `700`, soft shadow `0 1px 2px rgba(16,24,40,.06)` in light; no shadow in dark. Keep 8-12px radii.
Rule: text contrast >= 4.5:1 (body) and >= 3:1 (large text, icons, borders of controls) in BOTH themes.

## Antigravity (frontend/ only, branch `frontend/theme`, one commit per step)
```
Read AGENTS.md and .claude/skills/finn-ui-principles/SKILL.md. Implement the theme in handoff/NEXT.md exactly as specified.
Steps: (1) token remap in tailwind.config + index.css (light default, navy dark), (2) Appearance control in Thresholds with no
flash on load, (3) brand colour on selected segments/nav/buttons/links, category-chip colours, results gain/loss tints,
(4) remove remaining hard-coded blacks, (5) screenshots at 390x844 in BOTH themes of: Today (24h Priority feed), Today 30d by company,
a results card, a management card, Research list, an INFY report, Thresholds (collapsed + Filing types open), Cost, Ask sheet, help sheet.
Run the three browser suites in scripts/ and the offline test. Do not change layout, copy or behaviour. Report with the screenshots.
```

## ChatGPT (never commits)
```
GPT-11 Colour and contrast review (attach the Light and Dark screenshots from Antigravity and handoff/NEXT.md)
For each screen: list (a) text or icons below 4.5:1 (estimate from the screenshot; name the element and a better hex from the
palette family), (b) places where colour is the only cue, (c) category chips that are too similar to each other, (d) any area still
looking heavy, flat or "all black/grey", with one concrete fix. Then give the 5 highest-impact fixes ranked, each <= 20 words
with a hex value. No layout, copy or feature suggestions.
```

## Claude Code (me), after both
Merge `frontend/theme`, build, run the suites, check both themes at 360px, verify the live Pages site picked up the new bundle.
