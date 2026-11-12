"""Load backend/config/models.yaml (provider endpoints + tier fallback chains)."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import yaml


@dataclass(frozen=True)
class Provider:
    name: str
    base_url: str
    key: str | None  # settings field prefix, e.g. "gemini" -> GEMINI_API_KEY; None = no auth (local Ollama)


@dataclass(frozen=True)
class ModelRef:
    provider: str
    model: str
    max_input_chars: int | None = None
    timeout_s: float | None = None   # per-model override (a local 20B model reading a transcript is slow)
    max_output_tokens: int | None = None   # per-model override (reasoning models spend output tokens on thinking)
    reasoning_effort: str | None = None    # 'low'|'medium'|'high' for reasoning models (Ollama gpt-oss); None = server default


@dataclass(frozen=True)
class LLMConfig:
    providers: dict[str, Provider]
    tiers: dict[str, list[ModelRef]]
    timeout_s: float = 90
    max_output_tokens: int = 4096
    temperature: float = 0.1
    cooldown_s: float = 60


def load_config(path: Path) -> LLMConfig:
    raw = yaml.safe_load(path.read_text("utf-8"))
    providers = {n: Provider(n, p["base_url"].rstrip("/"), p.get("key")) for n, p in raw["providers"].items()}
    tiers = {
        tier: [ModelRef(e["provider"], e["model"], e.get("max_input_chars"), e.get("timeout_s"), e.get("max_output_tokens"),
                     e.get("reasoning_effort")) for e in chain]
        for tier, chain in raw["tiers"].items()
    }
    for tier, chain in tiers.items():
        for ref in chain:
            if ref.provider not in providers:
                raise ValueError(f"tier {tier}: unknown provider {ref.provider!r}")
    req = raw.get("request", {})
    return LLMConfig(providers, tiers, req.get("timeout_s", 90), req.get("max_output_tokens", 4096),
                     req.get("temperature", 0.1), req.get("cooldown_s", 60))
