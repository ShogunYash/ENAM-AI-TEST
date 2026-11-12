To: assessment@enam.com
Subject: IIT Delhi – AI Engineer - 2027

Hi ENAM team,

Demo (open on a phone): <demo URL> · GitHub: <repo URL> · AI build history: <history URL>

I built FINN for an investor following 17 Indian companies. Open Today, choose a filing window, and tap a results card to compare the quarter with the previous quarter and a year earlier. For company research, open KPIL and follow the guidance back to management’s words.

In one run, FINN classified 468 BSE filings. Rules handled 396 (84.6%). Three batched model calls handled the other 72. On a separate set of 90 filings, the model agreed with the rules 87.8% of the time. Reviewing disagreements exposed an acquisition of a majority stake announced in a press release, and I updated the rules.

FINN extracted 17 quarterly results filings from PDFs. Fifteen passed all nine comparisons with Screener within 2%: revenue, PBT and PAT for three quarters. Two were flagged. A separate ten-card review found one incorrect prior-year EBITDA and three cards with recoverable EBITDA missing.

I pre-built four research reports. KPIL raised its FY26 growth target from 20–25% to 25% or more. Consolidated revenue subsequently grew 21.6%. When management said it had “fully delivered,” it was referring back to the original band. Keeping both versions lets the investor judge each promise in context.

FINN checks each quoted passage against a source page, requires every number in the quotation to appear there, and drops unsupported quotations. Table-derived figures have separate references. Testing found that a quote can pass this check while referring to the wrong business or speaker; those evidence checks are my next priority.

The ledger records ₹0 in model API spend. The build uses free Gemini, Groq and OpenRouter routes and a local gpt-oss-20b on a GPU. Daily per-model Gemini quotas limit live research on unseen tickers. Screener access is for personal, non-commercial use. I left voice and push notifications out to focus on filing triage and research evidence.

Thanks,
<name>
