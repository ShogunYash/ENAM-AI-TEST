"""run_task(): the ONLY way feature code calls an LLM.

Flow: render prompt → cache lookup → walk the tier's fallback chain → validate against the task's
pydantic schema → cache + ledger. All providers are OpenAI-compatible `/chat/completions` endpoints
(Gemini, Groq, OpenRouter), called over plain httpx so the router is trivial to test with a mock
transport. Native-PDF input and Search grounding (Gemini-only) get a separate path in B3/B4.

Per attempt: 429/503 → cool that (provider, model) down and fall through; 5xx / timeout → fall through;
unparseable or schema-invalid output → one corrective retry on the same model, then fall through.
"""
from __future__ import annotations

import base64
import hashlib
import json
import re
import time
from typing import Any

import httpx
from pydantic import BaseModel, ValidationError

from app.llm import store
from app.llm.config import LLMConfig, ModelRef, load_config
from app.llm.prompts import Prompt, load_prompt
from app.llm.schemas import SCHEMAS
from app.settings import AppSettings, get_settings


class LLMUnavailable(RuntimeError):
    """Every model in the tier's chain failed or was skipped."""


# (provider, model) -> monotonic time until which it is skipped after a 429
_cooldown: dict[tuple[str, str], float] = {}
_config_cache: dict[str, LLMConfig] = {}


def _config(settings: AppSettings) -> LLMConfig:
    key = str(settings.finn_llm_config)
    if key not in _config_cache:
        _config_cache[key] = load_config(settings.finn_llm_config)
    return _config_cache[key]


def _cache_key(prompt: Prompt, system: str, user: str, extra: str) -> str:
    blob = json.dumps([prompt.task, prompt.version, prompt.tier, system, user, extra], ensure_ascii=False)
    return hashlib.sha256(blob.encode()).hexdigest()


def extract_json(text: str) -> Any:
    """Parse model output that should be JSON, tolerating ``` fences and surrounding prose."""
    t = text.strip()
    t = re.sub(r"^```(?:json)?\s*|\s*```$", "", t, flags=re.DOTALL)
    try:
        return json.loads(t)
    except json.JSONDecodeError:
        start, end = t.find("{"), t.rfind("}")
        if start != -1 and end > start:
            return json.loads(t[start:end + 1])
        raise


def quota_cooldown(resp: httpx.Response, default_s: float) -> tuple[float, str]:
    """Seconds to skip a model after HTTP 429/503, and why. Gemini's free tier has DAILY per-model request quotas
    (`GenerateRequestsPerDayPerProjectPerModel-FreeTier`, retryDelay ~ 80 000 s): waiting 60 s and retrying is useless."""
    delay, reason = default_s, f"HTTP {resp.status_code}"
    try:
        for d in resp.json().get("error", {}).get("details", []) or []:
            if m := re.fullmatch(r"([\d.]+)s", str(d.get("retryDelay", ""))):
                delay = max(delay, float(m.group(1)))
            for v in d.get("violations", []) or []:
                if "PerDay" in str(v.get("quotaId", "")):
                    reason = "daily free-tier quota used up"
    except (ValueError, AttributeError):
        pass
    return min(delay, 26 * 3600), reason


def _call(client: httpx.Client, cfg: LLMConfig, ref: ModelRef, api_key: str, system: str, user: str,
          json_schema_hint: str, extra_user: str = "") -> tuple[str, int, int]:
    provider = cfg.providers[ref.provider]
    body = {
        "model": ref.model,
        "messages": [
            {"role": "system", "content": f"{system}\n\nReturn ONLY JSON matching this schema:\n{json_schema_hint}"},
            {"role": "user", "content": user + extra_user},
        ],
        "temperature": cfg.temperature,
        "max_tokens": ref.max_output_tokens or cfg.max_output_tokens,
        "response_format": {"type": "json_object"},
    }
    if ref.reasoning_effort:                  # measured on gpt-oss-20b: 'low' = 9 s and valid JSON, 'medium' = 136 s and
        body["reasoning_effort"] = ref.reasoning_effort    # the whole 12k-token budget spent thinking, no JSON
    r = client.post(f"{provider.base_url}/chat/completions", json=body,
                    headers={"Authorization": f"Bearer {api_key}"}, timeout=ref.timeout_s or cfg.timeout_s)
    r.raise_for_status()
    data = r.json()
    content = data["choices"][0]["message"]["content"] or ""
    usage = data.get("usage") or {}
    return content, int(usage.get("prompt_tokens", 0)), int(usage.get("completion_tokens", 0))


def _call_gemini_pdf(client: httpx.Client, cfg: LLMConfig, ref: ModelRef, api_key: str, system: str, user: str,
                     json_schema_hint: str, pdf: bytes, extra_user: str = "") -> tuple[str, int, int]:
    """Gemini-only native PDF input (generateContent with inline_data): the model reads the pages as images, which
    is the only reliable way to read results tables (PDF text extraction flattens them). Same return as _call()."""
    base = cfg.providers[ref.provider].base_url.removesuffix("/openai")
    instruction = f"{system}\n\nReturn ONLY JSON matching this schema:\n{json_schema_hint}"
    body = {
        "systemInstruction": {"parts": [{"text": instruction}]},
        "contents": [{"role": "user", "parts": [
            {"inline_data": {"mime_type": "application/pdf", "data": base64.b64encode(pdf).decode()}},
            {"text": user + extra_user}]}],
        "generationConfig": {"temperature": cfg.temperature, "maxOutputTokens": cfg.max_output_tokens * 4,
                             "responseMimeType": "application/json"},
    }
    r = client.post(f"{base}/models/{ref.model}:generateContent", json=body,
                    headers={"x-goog-api-key": api_key}, timeout=cfg.timeout_s * 2)
    r.raise_for_status()
    data = r.json()
    parts = data["candidates"][0]["content"]["parts"]
    content = "".join(p.get("text", "") for p in parts if not p.get("thought"))
    usage = data.get("usageMetadata") or {}
    return content, int(usage.get("promptTokenCount", 0)), int(usage.get("candidatesTokenCount", 0))


def run_task(task: str, inputs: dict, *, cache_key_extra: str = "", feature: str | None = None,
             unit: str | None = None, pdf: bytes | None = None, pdf_key: str | None = None, cache_only: bool = False,
             bypass_cache: bool = False, settings: AppSettings | None = None,
             client: httpx.Client | None = None) -> BaseModel:
    """Run one LLM task and return its validated pydantic output.

    task            prompt file name in app/prompts (also the ledger `task`)
    inputs          values for {placeholders} in the prompt's <user> section
    cache_key_extra stable id of the underlying document/entity (e.g. sha256 of a PDF)
    feature         ledger tag shown in the Cost panel, e.g. "pull.guidance" (default: task)
    unit            what this call was for (e.g. a ticker) — used for "calls per new ticker"
    pdf             PDF bytes sent natively to Gemini (only gemini/* models in the tier are tried). Use for documents
                    whose layout matters, e.g. results tables.
    pdf_key         stable id of the document (e.g. the BSE attachment name). Joins the cache key INSTEAD of the sliced
                    bytes' hash, so changing how pages are sliced/compressed never invalidates cached answers.
                    Without it the bytes' sha256 is used.
    cache_only      never call a model: return the cached answer or raise LLMUnavailable (demo mode, restores)
    client          injectable httpx.Client (tests use a MockTransport)
    """
    settings = settings or get_settings()
    cfg = _config(settings)
    prompt = load_prompt(task)
    schema = SCHEMAS[prompt.schema]
    feature = feature or task
    system, user = prompt.render(inputs)
    db = settings.llm_db_path
    if pdf is not None:
        cache_key_extra = f"{cache_key_extra}|pdf:{pdf_key or hashlib.sha256(pdf).hexdigest()}"
    key = _cache_key(prompt, system, user, cache_key_extra)

    hit = None if bypass_cache else store.cache_get(db, key)       # bypass_cache: re-ask, and overwrite the cached answer
    if hit:
        store.record(db, feature=feature, task=task, unit=unit, provider=None, model=hit[1], cached=True)
        return schema.model_validate_json(hit[0])

    if cache_only:
        raise LLMUnavailable(f"{task}: not in the cache (cache_only)")
    chain = cfg.tiers[prompt.tier]
    schema_hint = json.dumps(schema.model_json_schema())
    input_chars = len(system) + len(user)
    own_client = client is None
    client = client or httpx.Client()
    errors: list[str] = []
    try:
        for ref in chain:
            label = f"{ref.provider}/{ref.model}"
            pkey = cfg.providers[ref.provider].key
            if pkey is None and not settings.finn_use_local_llm:
                errors.append(f"{label}: local LLM disabled (FINN_USE_LOCAL_LLM=0)")
                continue
            api_key = "local" if pkey is None else settings.api_key(pkey)     # key-less provider = local Ollama
            if not api_key:
                errors.append(f"{label}: no API key")
                continue
            if pdf is not None and ref.provider != "gemini":
                errors.append(f"{label}: no native PDF input")
                continue
            if ref.max_input_chars and input_chars > ref.max_input_chars:
                errors.append(f"{label}: input {input_chars} chars > limit {ref.max_input_chars}")
                continue
            if _cooldown.get((ref.provider, ref.model), 0) > time.monotonic():
                errors.append(f"{label}: cooling down after 429")
                continue
            if long_cd := store.cooldown_until(db, ref.provider, ref.model):
                errors.append(f"{label}: skipped, {long_cd[1]} (for ~{(long_cd[0] - time.time()) / 3600:.1f} h)")
                continue

            extra_user = ""
            for attempt in (1, 2):  # attempt 2 = corrective retry after unparseable output
                t0 = time.monotonic()
                try:
                    if pdf is not None:
                        content, tin, tout = _call_gemini_pdf(client, cfg, ref, api_key, system, user, schema_hint,
                                                              pdf, extra_user)
                    else:
                        content, tin, tout = _call(client, cfg, ref, api_key, system, user, schema_hint, extra_user)
                except httpx.HTTPStatusError as e:
                    code = e.response.status_code
                    if code in (429, 503):  # rate-limited / quota / "high demand": skip this model for a while
                        secs, why = quota_cooldown(e.response, cfg.cooldown_s)
                        if secs > 300:           # long (daily quota): persist so other processes skip it too
                            store.cooldown_set(db, ref.provider, ref.model, secs, why)
                        else:
                            _cooldown[(ref.provider, ref.model)] = time.monotonic() + secs
                    store.record(db, feature=feature, task=task, unit=unit, provider=ref.provider,
                                 model=ref.model, ok=False, error=f"HTTP {code}",
                                 latency_ms=int((time.monotonic() - t0) * 1000))
                    errors.append(f"{label}: HTTP {code}")
                    break
                except (httpx.TransportError, KeyError, ValueError) as e:
                    store.record(db, feature=feature, task=task, unit=unit, provider=ref.provider,
                                 model=ref.model, ok=False, error=type(e).__name__,
                                 latency_ms=int((time.monotonic() - t0) * 1000))
                    errors.append(f"{label}: {type(e).__name__}")
                    break

                latency = int((time.monotonic() - t0) * 1000)
                try:
                    out = schema.model_validate(extract_json(content))
                except (ValueError, ValidationError) as e:
                    store.record(db, feature=feature, task=task, unit=unit, provider=ref.provider,
                                 model=ref.model, tokens_in=tin, tokens_out=tout, ok=False,
                                 error="invalid_output", latency_ms=latency)
                    errors.append(f"{label}: invalid output ({type(e).__name__})")
                    extra_user = "\n\nYour previous reply was not valid JSON for the schema. Reply with ONLY valid JSON."
                    continue

                store.record(db, feature=feature, task=task, unit=unit, provider=ref.provider, model=ref.model,
                             tokens_in=tin, tokens_out=tout, latency_ms=latency)
                store.cache_put(db, key, out.model_dump_json(), label)
                return out
    finally:
        if own_client:
            client.close()
    raise LLMUnavailable(f"{task} ({prompt.tier}): all models failed — " + "; ".join(errors))
