# FINN announcement taxonomy and T0 (no-LLM) mapping

The target categories come from the ENAM reference doc. The BSE category/subcategory strings below are a
**starting guess**. After A0, replace them with the real `CATEGORYNAME` / `SUBCATNAME` values you
observe (dump the distinct pairs from 30 days of filings and map each one).

Order of evaluation in `pipeline/classify.py`:
1. Exact `(CATEGORYNAME, SUBCATNAME)` → category lookup table.
2. Headline / `NEWSSUB` regex rules, checked in the order listed below.
3. Anything still unmatched goes to the **T1 batch classifier** (about 30 headlines per call, cached).

| Category | Default priority | BSE hints (verify) | Headline regex hints (case-insensitive) | Card treatment |
|---|---|---|---|---|
| results | **high** | Result; "Financial Results" | `financial results\|quarter(ly)? results\|unaudited\|audited results` | Results card: Revenue/EBITDA/PBT/PAT, QoQ and YoY |
| management_change | **high** | "Change in Management", "Change in Directors/KMP" | `resign\|appoint\|cessation\|(chief\|managing) (executive\|financial)\|\bCEO\b\|\bCFO\b\|\bMD\b` | Bio card for incoming person |
| M&A | **high** | "Acquisition", "Amalgamation / Merger", "Scheme of Arrangement" | `acqui\|merger\|amalgamat\|demerger\|joint venture\|stake sale` | One-liner: what, size, consideration |
| fund_raise | **high** | "Allotment" (non-ESOP), "QIP", "Rights", "Buy back" | `\bQIP\b\|rights issue\|preferential\|buy-?back\|commercial paper\|NCD` | One-liner: amount, instrument, dilution |
| litigation | **high** | — | `order\|penalty\|SEBI\|show cause\|NCLT\|insolvency\|litigation\|tax demand` | One-liner: who, amount, stage |
| credit_rating | medium (high if downgrade) | "Credit Rating" | `rating\|CRISIL\|ICRA\|CARE\|India Ratings` | One-liner: agency, from→to, outlook |
| pledging | medium (high if pledge up) | "Pledge", SAST | `pledg\|encumbr` | One-liner: promoter, % change |
| insider_trading | medium | "Insider Trading / SAST" | `regulation 7\|insider\|SAST\|disclosure under reg` | Collapse unless promoter and size is material |
| capex | medium | — | `capex\|capacity expansion\|new plant\|greenfield\|brownfield` | One-liner: amount, capacity, timeline |
| press_release | medium | "Press Release / Media Release" | `order (win\|received)\|launch\|partnership\|clarification` | One-liner |
| earnings_call | low | "Earnings Call Transcript", "Analyst / Investor Meet" (call) | `earnings call\|conference call\|concall\|transcript\|audio recording` | Surface; transcript feeds Pull |
| dividend | low | Corp. Action — Dividend | `dividend` | Collapsed chip: ₹/share, record date |
| bonus_split | low | Corp. Action — Bonus / Split | `bonus\|split\|sub-division` | Collapsed chip: ratio, record date |
| investor_meetings | low | "Analyst / Investor Meet" | `investor meet\|analyst meet\|one-on-one\|conference` | Routine |
| agm_egm | low | AGM/EGM | `\bAGM\b\|\bEGM\b\|annual general` | Routine |
| postal_ballot | low | "Postal Ballot" | `postal ballot\|e-voting` | Routine |
| unclassified | hidden | "Compliance", "ESOP allotment", "Trading Window", "Loss of share certificate" | `trading window\|ESOP\|ESPS\|certificate\|regulation 74\|newspaper\|duplicate share` | Hidden inside "Routine (n)" |

**Priority score** (`pipeline/score.py`):
`score = category_weight × user_interest(category) × (1 + price_reaction) × recency_decay`.
- `user_interest` comes from settings (categories the user cares about = 1.5, muted = 0).
- `price_reaction` is the |pct_move| or vol_ratio excess on the filing day.
