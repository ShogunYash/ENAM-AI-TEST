# GPT-7 · Cost screen copy

| Current text | New text |
|---|---|
| LLM Cost & Efficiency Ledger | AI cost and usage |
| Zero marginal cost architecture · Strict cache-first router | Spending, calls and reuse |
| Total Spend | Model API spend |
| 100% Free Tier (Gemini & Groq) | Free tiers and local models |
| Cache Hit Rate | Answers reused |
| {hits} hits / {queries} queries | {hits} of {queries} requests |
| Zero marginal cost for repeated filings | Omit; the count explains it. |
| Total API Invocations | Model calls |
| Tokens Processed | Input and output tokens |
| Avg Calls / New Ticker | Average calls per new ticker |
| Unverified Quotes Dropped | Claims without verified quotes |
| Router Calls by Model (All Free Tier) | Usage by model |
| Per-model calls, tokens and spend | {calls} calls · {tokens} tokens |
| Not used yet | Models not used yet |
| Invocations by Pipeline Task | Calls by task |
| Live ledger / Saved snapshot / Sample | Live / Snapshot / Sample |

**Quote-check explanation:** If FINN cannot match a supporting quote to the cited page, it leaves that claim out of the report.

Keep the rejected count neutral. If no new-ticker average was measured, show “Not measured” instead of the hard-coded 7.0 fallback. Keep the timestamp once beside the live or snapshot label.

Reviewed against Antigravity’s 9-cost.png and the current StatsScreen labels.
