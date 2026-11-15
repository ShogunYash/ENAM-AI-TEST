# Submission drafts (DRAFTS ONLY: the owner sends them; nothing here has been sent)

**To:** assessment@enam.com · **Deadline:** 15 Nov 2026 · **Send two emails** (same links, different subject and body):

| Email | Subject | Body |
|---|---|---|
| A | `IIT Delhi – AI Engineer - 2027` | Email A below (the role applied for) |
| B | `IIT Delhi – Founding AI Engineer - 2027` | Email B below (adds the Network and the architecture and privacy writeup that brief requires) |

Links used in both: demo https://enam-ai-test.pages.dev/ · repo https://github.com/ShogunYash/ENAM-AI-TEST (must be **public**) · AI build history `docs/ai-history/README.md`.

## Before sending
- [ ] Repo is **public** (the brief requires it). Skim `docs/ai-history/transcripts/` first: they are the owner's own prompts, scrubbed of keys, emails, IPs and the local user name.
- [ ] Phone check of https://enam-ai-test.pages.dev/ (close and reopen the tab so the PWA drops its cache): Today, a results card, a price chart, Research INFY, Network tab, Settings > Appearance.
- [ ] Render API healthy: https://finn-api-7n6q.onrender.com/health (free tier sleeps: the first request can take about a minute).
- [ ] Replace `<your name>` below. Attach nothing: the links carry everything.

Facts behind the emails (all verifiable in the repo): 328 backend tests and 9 browser suites pass; 195 recorded model calls, 54.4 % cache hits, ₹0.00 spend (the live Cost screen keeps counting after deploy);
rules classify 84.6 % of 468 filings; 17 of 17 results cards match screener.in; BSE's announcement API answers 403 to the Render host, but transcripts download fine, so an unseen ticker builds live in about a minute or two.

---

## Email A: AI Engineer

**Subject:** IIT Delhi – AI Engineer - 2027

Hi ENAM team,

**Try FINN on your phone:** https://enam-ai-test.pages.dev/ · **GitHub:** https://github.com/ShogunYash/ENAM-AI-TEST · **AI build history:** `docs/ai-history/README.md` in the repo (Claude Code, Antigravity and Codex sessions).

**What I built.** FINN is a triage desk for a public-markets investor, not a news feed. **Push:** a windowed digest of BSE filings across a 17-stock portfolio (24h to 30d) with routine paperwork collapsed, configurable price, volume and filing alerts, a results card (Revenue, EBITDA, PBT, PAT with QoQ and YoY, read from the filing and cross-checked against screener.in) and a management-change card. **Pull:** research on any NSE ticker from earnings calls only: financial snapshot, 1D/3D/7D/30D price charts, and a promised-vs-delivered timeline in which every verdict carries a quote the server has checked against the page. KPIL guided at least 25% FY26 revenue growth; its filed consolidated growth was 21.6%, and FINN says missed.

**Decisions and trade-offs.**
- *Rules first, models second:* rules classified 84.6 % of 468 filings; the rest took three batched cheap-model calls.
- *Models copy, code computes:* the model copies printed figures from the results PDF, code does units, EBITDA, QoQ and YoY.
- *Checked, not trusted:* an independent reviewer re-checked every promised-vs-delivered quote; 11 of 36 items did not hold up and FINN withholds them and says so, instead of showing a confident wrong card.
- *Cost:* ₹0.00 over 195 recorded calls and 54.4 % cache hits, using a free-tier model router with fallbacks, a local open model for build-time work and a committed snapshot, so the demo never depends on a live model.

**Left out on purpose:** voice, real push notifications, accounts, bull/bear and the other research modules, web enrichment for bios (they come from the filing text only). **Next:** evaluate verdicts against analyst-labelled examples, add narrative-vs-numbers, stream filings intraday.

The repository also contains a **Network layer** (the investor's contacts as an intelligence layer inside Push and Pull) that I built for ENAM's related Founding AI Engineer brief; see `docs/ARCHITECTURE.md` if it is of interest. Limits are in the README (free-tier daily quotas can make a live build slower or partial; the report says what it could not finish).

Thanks,
<your name>

---

## Email B: Founding AI Engineer

**Subject:** IIT Delhi – Founding AI Engineer - 2027

Hi ENAM team,

**Try FINN on your phone:** https://enam-ai-test.pages.dev/ · **GitHub:** https://github.com/ShogunYash/ENAM-AI-TEST · **AI build history:** `docs/ai-history/README.md` in the repo (Claude Code, Antigravity and Codex sessions).

**What I built.** FINN is a triage desk for a public-markets investor with all three layers. **Push:** a windowed BSE digest across a 17-stock portfolio, configurable alerts, a results card (Revenue, EBITDA, PBT, PAT with QoQ and YoY, cross-checked against screener.in) and a management-change card. **Pull:** research on any NSE ticker from earnings calls only, with price charts and a promised-vs-delivered timeline in which every verdict carries a server-checked quote (KPIL guided at least 25% FY26 revenue growth, filed 21.6%, FINN says missed). **Network:** a synthetic 36-contact network woven into both. A management-change card shows which contacts overlapped with the new executive, using only the tenure the filing itself states (and saying so when it gives none); M&A, capex and litigation filings name the best contact to call and why; each Research page has "Who to call about"; the Network tab has an ask box, reconnect nudges tied to real recent filings and an expertise map. Matches are rules over listed facts, never a model's guess.

**Architecture and privacy** (diagram and detail in `docs/ARCHITECTURE.md`):
- *Data pipelines:* BSE filings and yfinance prices are ingested on a laptop (BSE blocks cloud IPs) into SQLite, classified by rules then a cheap model, enriched, and exported as a committed snapshot and seed; screener.in tables and transcripts are fetched live for any ticker. A person named in a filing is matched to a contact by employer and by the tenure the filing states.
- *Security and privacy:* the demo network is synthetic and deliberately public (shared fictional data in a public repo and static files), which I call out; a real deployment would keep one network per investor behind row-level access control, store only roles, employers, tenure and relationship metadata, keep third-party profile data only with consent or a licence, expire it, and never put contacts in a prompt.
- *LLMs and agents:* rules before models. Gemini reads the results PDF natively; stronger models only for promised-vs-delivered; a local open model does build-time work; one router handles tiers, fallbacks, circuit-breaking, caching and the cost ledger (₹0.00 over 195 calls, 54.4 % cache hits). The only agent is the Network question box: a model picks one tool, code runs it, and the answer is built from the tool's matches, so it cannot name anyone outside the network.
- *Cloud:* laptop (ingest, local GPU), GitHub, Render (FastAPI, live research), Cloudflare Pages (PWA and snapshot, works with the API asleep), free-tier model APIs.

**Key decisions.** Rules first (84.6 % of 468 filings classified without a model); models copy and code computes; every claim needs a verified quote; an independent reviewer re-checked all 36 promised-vs-delivered items and FINN withholds the 11 that did not hold up, saying so.

**Left out on purpose:** voice, real push notifications and accounts (so the privacy design is described, not implemented), real profile data (synthetic by choice; the real route is documented), bull/bear and the other research modules. **Next:** consented profile import with per-investor access control, evaluate verdicts against analyst-labelled examples, narrative-vs-numbers, intraday filings.

Limits are in the README (free-tier daily quotas can make a live build slower or partial; the report says what it could not finish).

Thanks,
<your name>
