# Covering email

To: assessment@enam.com  
Subject: IIT Delhi – AI Engineer - 2027

Hi ENAM team,

I built FINN for the investor who opens a phone between meetings and needs to know which filing deserves a closer look. Today ranks BSE events across a 17-stock portfolio and collapses routine filings. Research lets the investor compare an earlier management promise with a later result and open the evidence.

Try KPIL: management guided for 25% or more in FY26 revenue growth. Filed consolidated growth was 21.6%. FINN marks the revised target missed. The earlier target matters because that was the one management described as “fully delivered.”

Three decisions shaped the build. Rules classified 84.6% of 468 filings, leaving the ambiguous cases for a model. For results, the model copies printed figures and code calculates changes. For research, FINN checks quotations against their cited pages before showing them. The ledger records 190 model calls, 54.4% cache hits and ₹0 in model API spend.

Daily free-tier quotas can leave gaps on an unseen ticker; FINN shows what it could not complete. Next I would have analysts label verdicts, starting with cases where the quote is accurate but the comparison is wrong.

Phone demo: [PAGES_URL]  
Repository and build history: [REPO_URL] · [REPO_URL]/blob/main/docs/ai-history/README.md  
API health: [RENDER_URL]/health

Thanks,  
[Name]

# One-page writeup

**FINN: deciding which filing to open**

An exchange can publish several notices about one financing. An investor needs to know what changed, not how many notices arrived. FINN groups filings by event, puts material changes first and leaves routine paperwork one tap away. The phone demo opens from a saved snapshot, so an idle API does not delay that first decision.

**Push and Pull.** Today follows 17 holdings. A results card puts revenue, EBITDA, profit before tax and profit after tax beside quarterly and annual comparisons; a management card identifies the person, role and effective date. Research follows a different question: did management do what it said? It places the original guidance beside the later evidence. KPIL’s filed FY26 consolidated revenue growth was 21.6%, below its revised 25% floor. Keeping earlier guidance visible explains why management could describe the original target as delivered.

**Three engineering decisions**

1. **Use a model where the filing is ambiguous.** Rules classified 84.6% of 468 filings. On a separate 90-filing check, the model agreed with the rules 87.8% of the time. The useful disagreement was an acquisition announced in a press release. Agreement measures consistency; it is not an accuracy score.
2. **Separate reading from arithmetic.** The model reads the results PDF; code converts units, derives EBITDA and calculates changes. A cross-check can expose a difference in definitions: ICICI Bank’s printed PAT is after minority interest, while the comparison includes that interest. The card keeps the mismatch visible.
3. **Make evidence inspectable and gaps explicit.** FINN checks a quote against its page and checks that its numbers appear there. A quote can still refer to the wrong business or accounting basis. Reported rupee growth, for example, cannot settle constant-currency guidance. The router caches answers and uses free providers or a local model. The recorded run shows 190 calls, 54.4% cache hits and ₹0 in model API spend. A new ticker takes 6 to 8 calls; daily provider quotas can leave a partial report with a stated gap.

**Next.** I would start with an analyst-labelled set of promises, revisions and outcomes. It would test whether FINN matched the speaker, period and accounting basis before adding more research features.

Demo: [PAGES_URL] · API: [RENDER_URL]/health · Code: [REPO_URL] · Build history: [REPO_URL]/blob/main/docs/ai-history/README.md
