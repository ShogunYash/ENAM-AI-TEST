---
name: finn-llm-feature
description: How to add or change any in-app AI step in FINN (classification, summaries, results extraction, guidance extraction, promised-vs-delivered, bull/bear, copilot) — choosing the cheapest tier, writing the prompt file, JSON schema, routing through the free-model router, caching and ledger accounting. Use whenever code in backend/ would call an LLM or when touching backend/app/llm/, backend/app/prompts/ or backend/config/models.yaml.
---

# Adding an AI step to FINN

Cost efficiency is graded. Every LLM call has to justify itself, run on a **free** model, and be cached.

## Hard rules
- **No paid APIs in the app.** The allowed providers are the Gemini API free tier, Groq free and OpenRouter `:free` models.
- **Never import a provider SDK in feature code.** Everything goes through `app.llm.router`.
  - The single exception is `google-genai` for native-PDF input and Search grounding, and it's wrapped inside the router too.
- **No hard-coded model IDs.** They live in `backend/config/models.yaml`, because Gemini IDs get deprecated and rerouted.
- **No inline prompts.** Prompts live in `backend/app/prompts/<task>.md`, versioned.
- **Structured output only.** Every call has a pydantic schema; parse failures retry once, then fall through to the next model.

## Step 1: pick the lowest tier that works
| Tier | Use when | Default model chain (from models.yaml) |
|---|---|---|
| **T0 (rules, no LLM)** | Regex/lookup/arithmetic can do it: categories from BSE fields, QoQ/YoY math, signals, snapshot tables | — |
| **T1 (cheap)** | Short text in, label/one-liner out; **batch ~30 items per call** | Gemini Flash-Lite → Groq small |
| **T2 (extract)** | Document → structured JSON (results PDF, guidance items, person+role) | Gemini Flash (JSON schema, native PDF) → Groq large (short inputs only) |
| **T3 (reason)** | Cross-document judgment (P-v-D verdicts, bull/bear, copilot) | Gemini Flash with thinking → OpenRouter `:free` |
| **Grounded web** | Push-side enrichment only (management bio) | Gemini Flash + Google Search grounding |

Ask "can T0 do this?" first. If 80% of cases can be handled by rules, send only the remaining 20% to an LLM.

**Input budget:** Groq free is about 8K tokens per minute, so never route a full transcript or PDF to Groq. OpenRouter free allows about 50 requests a day, so treat it as an emergency fallback only.

## Step 2: write the prompt file
`backend/app/prompts/<task>.md`:
```markdown
---
task: guidance_map
version: 3
tier: T2
schema: GuidanceItems        # pydantic model name in app/llm/schemas.py
---
<system>
You extract management guidance from ONE earnings-call transcript.
Use ONLY the text provided. Do not use any outside knowledge about the company.
Refer to it as "the company". Return JSON matching the schema; no prose.
Every item MUST include a verbatim quote (≤ 40 words) and the page number it appears on.
If there is no explicit guidance, return an empty list.
</system>
<user>
{transcript_pages}
</user>
```
Prompts can be drafted and iterated in ChatGPT, but the version that ships is the file in the repo.
Bump `version` on any change; the version is part of the cache key.

## Step 3: call it through the router
```python
from app.llm.router import run_task

items = run_task(
    task="guidance_map",          # matches prompt file + models.yaml entry
    inputs={"transcript_pages": pages_text},
    cache_key_extra=doc_sha256,   # documents are processed once, forever
    feature="pull.guidance",      # ledger tag shown in Cost panel
)
```
The router is responsible for these, so feature code must not reimplement them:
- the cache lookup on `sha256(task, prompt_version, model, inputs, cache_key_extra)`
- the ordered model fallback on 429/5xx/parse failure
- writing the ledger row (feature, model, tokens in/out, cached?, latency)

## Step 4: test and account
- Unit test with a mocked router and a fixture input in `backend/tests/fixtures/`.
- Record the **expected calls per unit** (per filing / per document / per ticker) in the docstring.
  - Target: about 6 LLM calls for a never-seen ticker, and 0 on the second open.
- If the step produces claims shown on the Pull side, they must pass the `finn-grounding` checks.

## Anti-patterns to reject in review
- One LLM call per filing for classification. Batch instead.
- Asking the model for numbers that screener tables already have.
- Sending a 300-page annual report. Find the right pages with heading regex first.
- Free-text output parsed with regex.
- Calls made outside `run_task`, which leaves them uncached and invisible in the ledger.
