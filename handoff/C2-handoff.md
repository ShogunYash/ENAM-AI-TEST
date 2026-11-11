---
name: finn-grounding
description: Primary-source grounding rules for FINN's Pull/research side — allowed inputs, the claim/citation schema, server-side quote verification, and precise verdict definitions for promised-vs-delivered. Use when building or reviewing anything in backend/app/research/, research prompts, or research UI output, and when checking a generated research report for outside-knowledge leakage.
---

# Grounding discipline (Pull side)

The brief requires research grounded **only** in primary sources, with no reliance on the model's own
knowledge. Grounding is also our product thesis: **no verified quote, no claim.**

## Allowed inputs
| Allowed | Not allowed |
|---|---|
| Annual report pages (downloaded PDF) | News, broker notes, research reports |
| Concall transcripts (downloaded PDF) | Web search (that's Push-only, for bios) |
| Investor presentations / results filings from the exchange | The model's memory of the company |
| screener.in financial tables (standardised from company filings) | Third-party ratings or opinions |

## Claim schema (every research output)
```json
{
  "text": "Management guided ~20% revenue growth for FY26.",
  "kind": "guidance | fact | judgment",
  "sources": [{"doc_id": "concall_2025Q2", "page": 7, "quote": "we expect revenue growth of around 20% for FY26"}],
  "numbers_from": "screener.quarters | screener.profit-loss | doc | null",
  "verified": true
}
```
- `fact` and `guidance` claims need at least 1 source with a verbatim quote.
- `judgment` claims (verdicts, bull/bear) must cite the facts they rest on.
- Numbers come from screener tables or the filing, **never from model text**. The model can compare numbers but not invent them.

## Verification (`research/verify.py`)
1. Normalise both strings: lowercase, collapse whitespace, unify quotes, strip hyphenation across line breaks.
2. Score with `rapidfuzz.fuzz.partial_ratio(quote, page_text)`. If it's ≥ 90, mark the claim verified.
   - Otherwise, check the neighbouring pages (±1) before failing.
3. **Unverified claims are dropped from the API response.** Count them in the ledger as `grounding_dropped`.
4. A judgment loses any support that was dropped. If nothing is left, drop the judgment too.

## Promised vs delivered: verdict definitions
Guidance is collected per quarter from transcripts Q-4 … Q-1. Delivery is checked against later transcripts plus actual numbers. You need 5 transcripts for 4 quarters.

| Verdict | Rule |
|---|---|
| **met** | Actual is within ±10% of a numeric target (or at/above it for "at least"), or the stated milestone is confirmed in a later call |
| **missed** | Horizon reached and actual is outside tolerance in the wrong direction, or management admits the miss |
| **slipped** | Same goal still alive but the timeline was pushed in a later call (cite both quotes) |
| **quietly dropped** | Guidance never mentioned again in later calls and no outcome is reported. Cite the original quote and list the calls checked |
| **pending** | Horizon not reached yet; show the latest status quote |
| **raised / cut** | Target revised up or down in a later call (cite both) |

Every verdict needs a one-line reason that a busy investor can read in 3 seconds. For example:
"Guided 18–20% growth, delivered 14%; blamed on export delays (Q3 call, p.5)".

## Leakage defences
- Refer to "the company" in reasoning prompts, not its name or ticker.
- The system prompt says "use only the provided text".
- If a claim mentions facts absent from the inputs (a product, a person, a year that isn't in the docs), verification fails, and the claim is dropped.
- Missing data is an output, not a gap to fill. Example: "No transcript for Q1 FY26 available". Never guess.

## Review checklist (run before shipping any research view)
- [ ] Every displayed claim has `verified: true` and a tappable source (doc, page)
- [ ] All numbers trace to screener tables or a filing page
- [ ] No sentence relies on knowledge not in the inputs (spot-check 5 claims by hand)
- [ ] Empty states are explicit (no transcripts, no guidance found, scanned PDF)
- [ ] The ledger shows the per-ticker call count within budget (about 6 for a new ticker)

---

## Infosys transcript and prompt test

[Infosys on Screener, Documents → Concalls → Jan 2026](https://www.screener.in/company/INFY/consolidated/#documents) · [Read the complete January 14 transcript (PDF)](https://www.infosys.com/investors/reports-filings/quarterly-results/2025-2026/q3/documents/transcripts/earningscall.pdf) · [Later Q4 transcript (PDF)](https://www.infosys.com/investors/reports-filings/quarterly-results/2025-2026/q4/documents/transcripts/earningscall.pdf)

### ChatGPT test on the Q3 FY26 guidance passage

Input: management's FY26 guidance on page 4. Expected and observed extraction in this manual test:

```json
[
  {"metric":"Group revenue growth, constant currency","target":"3% to 3.5%","horizon":"FY26","quote":"3% to 3.5% growth in constant currency","page":4},
  {"metric":"Group operating margin","target":"20% to 22%","horizon":"FY26","quote":"Our operating margin guidance for the financial year remains the same at 20% to 22%.","page":4}
]
```

### ChatGPT test on the later outcome

Input: the first item above and Q4 FY26 transcript page 4, after fiscal year end. Observed output:

```json
{
  "verdicts": [{
    "guidance_id": "q3-revenue",
    "verdict": "met",
    "reason": "FY26 revenue grew 3.1% in constant currency, within the January target of 3.0–3.5%.",
    "sources": [
      {"doc_id":"q3-fy26","page":4,"quote":"3% to 3.5% growth in constant currency"},
      {"doc_id":"q4-fy26","page":4,"quote":"FY26 revenues crossed $20 bn and grew 3.1% in constant currency terms"}
    ],
    "calls_checked": ["q4-fy26"]
  }],
  "unresolved": []
}
```

Iteration: the CEO and CFO repeat the annual guidance on pages 4 and 7, so the map now merges confirmations and retains the currency basis. The later call also gives guidance for FY27. The reducer now requires the same horizon for a revision, which keeps the new FY27 range from being classified as a cut to FY26. These are passage-level ChatGPT checks, not an exhaustive transcript recall evaluation or a run through FINN's model router.
