# G3 filing pack review · 12 Nov 2026

ChatGPT applied the merged prompts to pack sections A–C. Responses are grouped by task in [G3-outputs.json](G3-outputs.json). The keys around individual responses identify the corresponding filing. All responses passed the backend Pydantic schemas. This records manual model-in-chat outputs, not a production provider or router run.

## Classification

All 45 IDs appear once in input order. The pack has no reference labels, so this check establishes coverage and schema validity, not accuracy. Review these cases before using the outputs as training labels:

- `5025e69b`: a special committee met, but its decision is absent. Another record about a QIP cannot supply the answer for this record.
- `f3f0a540` and `769b3262`: commercial paper was redeemed. Calling repayment a fresh fundraise would misstate cash flow. Both fall back to unclassified under the present taxonomy.
- `bfdf6a9e` explicitly names promoter encumbrance. `e677d431` gives regulation numbers alone. A verified regulation-to-category lookup in the rules layer could resolve the latter without asking a model to use outside knowledge.
- `9e16b3c7`: the press-release subcategory supports a format label only. It cannot establish materiality. Keep this out of high-priority alerts until the attachment supplies the event.

## Filing headlines

All four are within 70 characters (54, 68, 59 and 65 in pack order). The Bajaj headline reports board approval of a reappointment; the source qualifies it with any required regulatory approvals. Reliance's A− rating applies to its senior unsecured dollar notes. The TCS acquisition was completed, and the dividend payment date is distinct from its record date.

## Results

Reviewed physical pages of the [TCS filing](https://www.bseindia.com/xml-data/corpfiling/AttachHis/2b021530-bbc2-4590-8375-cefc205a7132.pdf) and [Infosys filing](https://www.bseindia.com/xml-data/corpfiling/AttachHis/26c12463-d44e-4050-bd47-b53cc294b4e0.pdf) against the pack's first-eight-page input boundary.

- TCS p. 8: group PAT for September 2026 is ₹13,934 crore; ₹13,884 crore is attributable to shareholders. The statutory PBT row is after exceptional items. For all three quarters, EBITDA has four individually sourced inputs and a null value for downstream calculation.
- Infosys p. 6: the prior-year column precedes the previous-quarter column, with percentage columns interleaved. September revenue is ₹49,244 crore, June revenue ₹48,211 crore, and prior September revenue ₹44,490 crore. PAT remains missing because the fact sheet presents net profit after non-controlling interests. Separate finance cost, gross other income and depreciation are unavailable in the excerpt. These missing values describe only the test input, not the entire 195-page filing.

For B3, feed the relevant statutory consolidated statement pages in their original layout. The Infosys case demonstrates why a fixed first-eight-page cutoff can hide evidence even when the PDF is legible.
