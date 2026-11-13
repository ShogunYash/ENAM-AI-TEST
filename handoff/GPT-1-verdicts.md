# GPT-1 • Final verdict check

Main snapshot 984b782. All 36 items match the versions in the original PDF audit. Rows are in JSON order within each ticker. “Withhold” is a review action: suppress the judgment until there is evidence; it is not a new verdict enum. Severity applies to the displayed claim, including its scope and reason. “Fine” means the verdict follows; it does not certify that punctuation or wording is verbatim. See D5-quote-checks.csv for the page and exact-text comparison on each side.

| Symbol | Metric (call) | Shown | Use | Reason | Severity |
|---|---|---|---|---|---|
| INFY | FY27 constant-currency revenue (Q1) | cut | cut | The later quote explicitly lowers both ends of the range. | fine |
| INFY | FY27 operating margin (Q1) | pending | pending | Same band, open year. Neither quote describes operating margin as constant currency. | debatable |
| INFY | FY27 effective tax rate | pending | pending | Later call repeats the annual range; it reports no final tax rate. | fine |
| INFY | FY27 operating margin (Q4) | pending | pending | Same open target as the Q1 item; merge reaffirmations. | fine |
| INFY | FY26 constant-currency revenue (Q3) | met | met | Full-year growth of 3.1% is inside the 3–3.5% band on the same currency basis. | fine |
| INFY | FY26 constant-currency revenue (Q2) | raised | raised | Both endpoints rose, from 2–3% to 3–3.5%. | fine |
| INFY | Compensation increases | pending | pending | October rollout began; January phase remains open. The promise concerns compensation, not hiring. | debatable |
| BAJFINANCE | FY27 credit cost | pending | pending after reciting | Promise misattributes an analyst’s question. Cite management’s confirmation on the same page; no annual outcome yet. | wrong |
| BAJFINANCE | Opex/NTI improvement | pending | pending | Management restates the improvement target; the full year remains open. | fine |
| BAJFINANCE | Gold loans/AUM | pending | pending | No later actual. Remove “not reached”; the card only establishes a future target. | debatable |
| BAJFINANCE | Vehicle finance AUM | pending | withhold | Neither “them” nor overall AUM growth establishes a vehicle-specific promise or outcome. | wrong |
| BAJFINANCE | FY26 credit cost | quietly_dropped | withhold | An absent outcome citation cannot establish silence; later discussion changes the recovery basis. | wrong |
| BAJFINANCE | FY26 other operating income | quietly_dropped | withhold | Promise covers a fee pool. No matching annual actual or list of checked calls establishes abandonment. | wrong |
| BAJFINANCE | FY27 ROA | pending | pending | Quarterly ROA cannot settle annual guidance; remove the editorial bracket from the quote. | debatable |
| BAJFINANCE | FY27 ROE | pending | pending | Quarterly ROE is progress; the annual range remains open. | fine |
| POLYCAB | Wires & cables EBIT | pending | pending after relabelling | Quoted long-term margin target does not identify EBIT. Cite the EBITDA passage or leave the measure unspecified. | debatable |
| POLYCAB | FMEG EBIT | pending | pending for EBITDA | The promise explicitly targets EBITDA; EBIT is a reported quarterly fact. | wrong |
| POLYCAB | EPC EBIT | pending | pending; remove actual | Promise says operating margin. Neither cited passage supplies the claimed EPC actual. | wrong |
| POLYCAB | Export top-line growth | pending | pending for export share | Percentage of total revenue measures export contribution, not export growth. | wrong |
| POLYCAB | Wires & cables EBITDA | pending | pending | Later call explicitly retains the EBITDA band; delivery horizon remains open. | fine |
| POLYCAB | FMEG EBITDA | pending | pending | Later calls explicitly reaffirm the band. Restore the original wording of the promise. | debatable |
| POLYCAB | Project Spring EBITDA | pending | pending | Later quote distinguishes interim EBIT from target EBITDA; combine with FMEG reaffirmations. | fine |
| POLYCAB | Dividend payout | pending | pending | The reported payout is progress toward a future floor. | fine |
| POLYCAB | Five-year capex | pending | pending | Neither outcome postdates this promise. Remove the suggestion of subsequent confirmation. | debatable |
| POLYCAB | Annual capex | pending | met for FY26; pending programme | FY26 spend was 14.8 billion against 12–16 billion annually; future instalments remain open. | debatable |
| POLYCAB | Export contribution | pending | pending | Later call repeats the share target and its horizon. | fine |
| KPIL | FY26 consolidated revenue (Q3) | missed | missed | Filed consolidated growth falls outside tolerance for the approximate target. | fine |
| KPIL | FY26 consolidated revenue (Q2) | missed | missed | Consolidated actual falls below the explicit floor, which applied to both bases. | fine |
| KPIL | FY26 standalone and consolidated revenue (Q1) | met | met, consolidated only; then raised | Original band fits consolidated actual only in this card. The next promise raises the floor. | wrong |
| KPIL | FY27 order wins | pending | pending | Management maintains the order-inflow target; neither quote gives a closed-year outcome. | fine |
| KPIL | FY27 top-line growth | pending | pending | Later call reiterates the annual floor. | fine |
| KPIL | FY27 consolidated PBT margin | pending | pending | Management explicitly says the improvement guidance remains unchanged. | fine |
| KPIL | B&F order-book growth | quietly_dropped | withhold; relabel | Promise concerns international transmission activity; domestic bidding does not establish abandonment. Horizon remains open. | wrong |
| KPIL | Standalone PBT margin | met | withhold | Only consolidated expansion is quoted. Standalone needs its own comparable actual. | wrong |
| KPIL | Consolidated PBT margin | met | met | Quoted consolidated improvement exceeds the minimum. | fine |
| KPIL | FY26 consolidated order inflow | pending | raised | Later quote increases the target. It is not a final actual; the report already covers year-end. | wrong |

**Numeric provenance in displayed reasons.** KPIL revenue rows 1–3: **21.6%** comes from the structured actual, not the promised quotes. It is consolidated: (27,143 / 22,316 − 1) × 100 = 21.63%. The original band and later floor are separate promises. “Fully delivered” refers to the original band. KPIL B&F: **9k** is not quoted; the source says 8,000 and 8,500. POLYCAB EPC: **7.2%** has no attached numerical support. For FY26 order inflow, Q4 p3 is closing evidence for the revised floor; add it before presenting “met.”

Period numbers are sometimes metadata, not quoted figures: e.g. INFY’s “Q3 FY26” revision; BAJFINANCE’s Q2/Q4 status dates; KPIL’s Q1/Q3 status dates and FY26 label on the approximately 25% promise. POLYCAB wires & cables' first quote says “medium- to long-term,” not FY30; the five-year capex quote does not itself say FY2030. Render sourced horizons separately from verbatim excerpts. FY30/FY2030 and equivalent range notation are not numerical discrepancies.
