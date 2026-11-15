# FINN Theme & Accessibility Verification: Light Paper Default + Charcoal Dark Mode + GPT-11 Refinements

## 1. Overview & Architecture

Per `handoff/NEXT.md`, `handoff/GPT-11-colour-review.md`, and `handoff/GPT-11-stock-titles.patch`, FINN has transitioned to an accessible, investor-grade design system:
1. **Light Default ("Paper")**: Clean, consumer-friendly `#F4F6FB` paper background with crisp `#FFFFFF` cards, soft `0 1px 2px rgba(16,24,40,0.06)` shadows, and real brand identity.
2. **Charcoal Dark Mode**: Modern `#09090B` background and `#18181B` cards, preserving investor focus while eliminating eye strain.
3. **Zero-Flash First Paint**: Synchronous `<head>` script in `index.html` sets `<html class="dark">` and dynamic `<meta name="theme-color">` (`#F4F6FB` light / `#09090B` dark) before Vite mounts.
4. **Brand Blue Accents**: Primary `#3558E6` for selected segments, active bottom navigation tab, primary action buttons ("Ask FINN", "GO"), links, focus rings, and a brand-blue header top bar.
5. **GPT-11 Stock Accent Token (`text-stock`)**:
   - Light: `#802E6E` (6.8:1 contrast on white paper).
   - Dark: `#F6B1DE` (11.8:1 contrast on charcoal cards).
   - Applied to tickers and company names across Today feed cards, company lists, research tickers, alerts, and Ask FINN sheet headers.
6. **Accessible Contrast Palette**:
   - Secondary text (`--z-500`): `#4D5B71` (`77 91 113`), achieving 5.67:1 contrast on light paper.
   - Green / Gain text (`--emerald-500`): `#0B7140` (`11 113 64`), achieving 5.48:1 contrast on white cards.
   - Neutralized Delivered Outcome: Neutral `#37465C` light / `#B6C0D6` dark prevents misleading positive sentiment on downward guidance cuts.
   - Neutralized Symmetric Thresholds: `±X%` price move trigger rendered in neutral `#37465C` / `#B6C0D6`.
   - Distinct Priority Dots: High priority has an outer halo ring, medium has a crisp single ring, and low has a subtle dot.
   - M&A violet chip in dark mode: `#D8B4FE` for optimal readability.

---

## 2. Verification Suite Results

All automated browser suites, offline fallbacks, and backend contracts pass completely:

| Test Suite | Purpose | Status |
|---|---|---|
| `test-ag6-fixes.js` | Verifies AG-6 5 copy/UI fixes (Bajaj headline, range shifts, screener check badge, Ask FINN source link, watchlist ordering) | **PASS** (5/5) |
| `test-portfolio-watchlist.js` | Verifies "My portfolio \| Watchlist" scope toggle, 30d/24h company lists, search live filtering, A-Z sort, drilldowns | **PASS** (8/8) |
| `test-offline-by-company.js` | Verifies unreachable API (`VITE_API_BASE=http://localhost:9`) renders offline SNAPSHOT banner and cached companies for 3d, 7d, 30d | **PASS** (3d, 7d, 30d) |
| `take-theme-screenshots.js` | Headless Chrome at 390×844 capturing all 11 required screens in BOTH Light and Dark themes | **PASS** (22/22) |
| `npm run build` | TypeScript + Vite production bundle check | **PASS** (0 errors) |
| `pytest -q` (backend) | API contract and route verification | **PASS** (301 passed) |

---

## 3. Screen Visual Comparisons (390×844)

````carousel
### 1. Today 24h Priority Feed
![Today 24h Priority - Light](/~/.gemini/antigravity/brain/6b5773e6-4806-4a7a-a6a6-b18a9519bf75/theme-light-1-today-24h-priority.png)
<!-- slide -->
### 1. Today 24h Priority Feed (Dark)
![Today 24h Priority - Dark](/~/.gemini/antigravity/brain/6b5773e6-4806-4a7a-a6a6-b18a9519bf75/theme-dark-1-today-24h-priority.png)
<!-- slide -->
### 2. Today 30d By Company
![Today 30d By Company - Light](/~/.gemini/antigravity/brain/6b5773e6-4806-4a7a-a6a6-b18a9519bf75/theme-light-2-today-30d-companies.png)
<!-- slide -->
### 2. Today 30d By Company (Dark)
![Today 30d By Company - Dark](/~/.gemini/antigravity/brain/6b5773e6-4806-4a7a-a6a6-b18a9519bf75/theme-dark-2-today-30d-companies.png)
<!-- slide -->
### 3. Financial Results Card
![Results Card - Light](/~/.gemini/antigravity/brain/6b5773e6-4806-4a7a-a6a6-b18a9519bf75/theme-light-3-results-card.png)
<!-- slide -->
### 3. Financial Results Card (Dark)
![Results Card - Dark](/~/.gemini/antigravity/brain/6b5773e6-4806-4a7a-a6a6-b18a9519bf75/theme-dark-3-results-card.png)
<!-- slide -->
### 4. Management Change Bio Card
![Management Card - Light](/~/.gemini/antigravity/brain/6b5773e6-4806-4a7a-a6a6-b18a9519bf75/theme-light-4-management-card.png)
<!-- slide -->
### 4. Management Change Bio Card (Dark)
![Management Card - Dark](/~/.gemini/antigravity/brain/6b5773e6-4806-4a7a-a6a6-b18a9519bf75/theme-dark-4-management-card.png)
<!-- slide -->
### 5. Research Ticker Directory
![Research List - Light](/~/.gemini/antigravity/brain/6b5773e6-4806-4a7a-a6a6-b18a9519bf75/theme-light-5-research-list.png)
<!-- slide -->
### 5. Research Ticker Directory (Dark)
![Research List - Dark](/~/.gemini/antigravity/brain/6b5773e6-4806-4a7a-a6a6-b18a9519bf75/theme-dark-5-research-list.png)
<!-- slide -->
### 6. INFY Promised vs Delivered Report
![Research INFY - Light](/~/.gemini/antigravity/brain/6b5773e6-4806-4a7a-a6a6-b18a9519bf75/theme-light-6-research-infy.png)
<!-- slide -->
### 6. INFY Promised vs Delivered Report (Dark)
![Research INFY - Dark](/~/.gemini/antigravity/brain/6b5773e6-4806-4a7a-a6a6-b18a9519bf75/theme-dark-6-research-infy.png)
<!-- slide -->
### 7. Thresholds (Appearance Selector)
![Thresholds Collapsed - Light](/~/.gemini/antigravity/brain/6b5773e6-4806-4a7a-a6a6-b18a9519bf75/theme-light-7-thresholds-collapsed.png)
<!-- slide -->
### 7. Thresholds (Appearance Selector - Dark)
![Thresholds Collapsed - Dark](/~/.gemini/antigravity/brain/6b5773e6-4806-4a7a-a6a6-b18a9519bf75/theme-dark-7-thresholds-collapsed.png)
<!-- slide -->
### 8. Thresholds (Filing Types Expanded)
![Thresholds Categories - Light](/~/.gemini/antigravity/brain/6b5773e6-4806-4a7a-a6a6-b18a9519bf75/theme-light-8-thresholds-categories.png)
<!-- slide -->
### 8. Thresholds (Filing Types Expanded - Dark)
![Thresholds Categories - Dark](/~/.gemini/antigravity/brain/6b5773e6-4806-4a7a-a6a6-b18a9519bf75/theme-dark-8-thresholds-categories.png)
<!-- slide -->
### 9. AI Cost & Usage Telemetry
![Cost Screen - Light](/~/.gemini/antigravity/brain/6b5773e6-4806-4a7a-a6a6-b18a9519bf75/theme-light-9-cost.png)
<!-- slide -->
### 9. AI Cost & Usage Telemetry (Dark)
![Cost Screen - Dark](/~/.gemini/antigravity/brain/6b5773e6-4806-4a7a-a6a6-b18a9519bf75/theme-dark-9-cost.png)
<!-- slide -->
### 10. Ask FINN Copilot Bottom Sheet
![Ask FINN Sheet - Light](/~/.gemini/antigravity/brain/6b5773e6-4806-4a7a-a6a6-b18a9519bf75/theme-light-10-ask-sheet.png)
<!-- slide -->
### 10. Ask FINN Copilot Bottom Sheet (Dark)
![Ask FINN Sheet - Dark](/~/.gemini/antigravity/brain/6b5773e6-4806-4a7a-a6a6-b18a9519bf75/theme-dark-10-ask-sheet.png)
<!-- slide -->
### 11. How to Read Digest Help Sheet
![Help Sheet - Light](/~/.gemini/antigravity/brain/6b5773e6-4806-4a7a-a6a6-b18a9519bf75/theme-light-11-help-sheet.png)
<!-- slide -->
### 11. How to Read Digest Help Sheet (Dark)
![Help Sheet - Dark](/~/.gemini/antigravity/brain/6b5773e6-4806-4a7a-a6a6-b18a9519bf75/theme-dark-11-help-sheet.png)
````
