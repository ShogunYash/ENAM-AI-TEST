---
name: finn-submission
description: Prepare the ENAM FINN challenge submission — deliverables checklist, README structure, and a draft covering-email writeup (what was built, key decisions and trade-offs, what was left out, next steps). Use near the deadline (15 Nov 2026) or when asked to write the README or covering note.
disable-model-invocation: true
---

# Prepare the FINN submission

**Deadline:** 15 Nov 2026. **Send to:** assessment@enam.com, subject **"IIT Delhi – AI Engineer - 2027"**.
Draft only. **Never send email or publish anything yourself.** The user sends it.

## 1. Deliverables checklist (report the status of each)
- [ ] Deployed mobile-first link opens on a phone (the frontend URL, plus whether the backend is warm)
- [ ] GitHub repo is public (or access is shared), the README is complete, and no secrets are in history (`git log -p | grep -E "AIza|gsk_|sk-"`)
- [ ] AI build history: `docs/ai-history/README.md` is filled in, Claude Code transcripts are scrubbed, Codex/Antigravity share links are present
- [ ] `finn-demo-check` passed in the last 24h
- [ ] Covering email drafted

## 2. README structure (repo root)
1. One-line thesis and **demo link** at the top, plus a 30-second "try this" path for graders
2. Screenshots or GIF (phone frame)
3. What FINN does: Push (digest, alerts, results card, bio card) and Pull (snapshot, promised-vs-delivered)
4. Architecture diagram (from `docs/PLAN.md` §2)
5. **Model routing and cost:** the tier table with **measured** numbers from `/stats/llm`
   (calls per new ticker, cache-hit %, ₹0 spend)
6. Grounding approach (quote verification, how many claims were dropped)
7. Run locally (uv / npm commands, env vars, free keys needed)
8. Limitations and data-source caveats (screener ToS, BSE-only, free-tier quotas)

Take every number from the repo or ledger. If one isn't available, write `TODO` rather than inventing it.

## 3. Covering email (about 300–400 words, plain and specific)
```
Subject: IIT Delhi – AI Engineer - 2027

Hi ENAM team,

Demo (open on phone): <url>   ·   Repo: <url>   ·   AI build history: <url/path>

What I built — 3–4 lines: the "triage desk" thesis, the two workflows I went deep on, the one I'm proudest of.

Key decisions & trade-offs — 4–6 bullets, each "chose X over Y because Z", e.g.
 • BSE over NSE (cloud-IP blocking) · rules-first classification (≈80% of filings never hit an LLM)
 • long-context + page regex instead of a vector DB · server-side quote verification for grounding
 • free-model routing: Flash-Lite / Flash / thinking tiers, ≈N calls per new ticker, ₹0 spend

What I deliberately left out — 3–4 bullets with the reason (voice, auth, real push notifications, remaining research modules).

Where I'd take it next — 3 bullets (e.g. intraday filings via websocket, portfolio-level narrative drift, eval harness for verdict accuracy).

Thanks,
<name>
```
Leave `<name>` and the contact details for the user to fill in. Don't insert personal details yourself.
Keep the tone factual: no superlatives, and no claims the demo can't back up.
