"""Live check of the free LLM providers (needs keys in .env).

  uv run python -m scripts.ping_llm --list     # which model IDs each key can use → fix config/models.yaml
  uv run python -m scripts.ping_llm            # one tiny real call per tier through run_task (uses cache bypass)
"""
from __future__ import annotations

import sys
import time

import httpx

from app.llm import router
from app.llm.config import load_config
from app.settings import get_settings


def list_models() -> None:
    s = get_settings()
    cfg = load_config(s.finn_llm_config)
    configured = {(r.provider, r.model) for chain in cfg.tiers.values() for r in chain}
    for name, p in cfg.providers.items():
        key = "local" if p.key is None else s.api_key(p.key)
        if not key:
            print(f"[skip] {name}: no API key")
            continue
        try:
            r = httpx.get(f"{p.base_url}/models", headers={"Authorization": f"Bearer {key}"}, timeout=30)
            r.raise_for_status()
            ids = sorted(m["id"].removeprefix("models/") for m in r.json().get("data", []))
        except Exception as e:  # noqa: BLE001
            print(f"[FAIL] {name}: {e!r}")
            continue
        print(f"[ok] {name}: {len(ids)} models")
        for i in ids:
            mark = "  <- in models.yaml" if (name, i) in configured else ""
            print(f"    {i}{mark}")
        missing = [m for (pn, m) in configured if pn == name and m not in ids]
        if missing:
            print(f"  !! configured but NOT listed (check for typos/deprecation): {missing}")


def ping_tiers() -> int:
    s = get_settings()
    cfg = load_config(s.finn_llm_config)
    bad = 0
    with httpx.Client() as client:
        for tier, chain in cfg.tiers.items():
            for ref in chain:
                pk = cfg.providers[ref.provider].key
                key = "local" if pk is None else s.api_key(pk)
                label = f"{tier} {ref.provider}/{ref.model}"
                if not key:
                    print(f"[skip] {label}: no API key")
                    continue
                t0 = time.monotonic()
                try:
                    content, tin, tout = router._call(client, cfg, ref, key, "Reply with JSON only.",
                                                      'Return {"ok": true, "echo": "pong"}',
                                                      '{"ok": bool, "echo": str}')
                    print(f"[ok]   {label}: {int((time.monotonic()-t0)*1000)} ms, {tin}+{tout} tok -> {content.strip()[:60]!r}")
                except httpx.HTTPStatusError as e:
                    bad += 1
                    print(f"[FAIL] {label}: HTTP {e.response.status_code} {e.response.text[:120]!r}")
                except Exception as e:  # noqa: BLE001
                    bad += 1
                    print(f"[FAIL] {label}: {e!r}")
    return bad


if __name__ == "__main__":
    if "--list" in sys.argv:
        list_models()
    else:
        sys.exit(1 if ping_tiers() else 0)
