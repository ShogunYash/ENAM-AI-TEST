"""Prompt files: backend/app/prompts/<task>.md

Format:
    ---
    task: guidance_map
    version: 3            # bump on ANY change: part of the cache key
    tier: T2
    schema: GuidanceItems # name in app.llm.schemas.SCHEMAS
    ---
    <system> ...literal text, no placeholders... </system>
    <user> ...text with {placeholders} filled from `inputs`... </user>

Only the <user> section is formatted (use {{ and }} for literal braces there).
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import yaml

PROMPT_DIR = Path(__file__).resolve().parents[1] / "prompts"
_SECTION = re.compile(r"<(system|user)>(.*?)</\1>", re.DOTALL)


@dataclass(frozen=True)
class Prompt:
    task: str
    version: int
    tier: str
    schema: str
    system: str
    user: str

    def render(self, inputs: dict) -> tuple[str, str]:
        try:
            return self.system.strip(), self.user.strip().format_map(inputs)
        except KeyError as e:
            raise ValueError(f"prompt {self.task!r} needs input {e.args[0]!r}") from e


@lru_cache
def load_prompt(task: str, directory: Path = PROMPT_DIR) -> Prompt:
    path = directory / f"{task}.md"
    if not path.exists():
        raise FileNotFoundError(f"no prompt file for task {task!r}: {path}")
    text = path.read_text("utf-8")
    m = re.match(r"---\s*\n(.*?)\n---\s*\n(.*)", text, re.DOTALL)
    if not m:
        raise ValueError(f"{path.name}: missing front-matter")
    meta = yaml.safe_load(m.group(1))
    sections = {k: v for k, v in _SECTION.findall(m.group(2))}
    if "system" not in sections or "user" not in sections:
        raise ValueError(f"{path.name}: needs <system> and <user> sections")
    for key in ("task", "version", "tier", "schema"):
        if key not in meta:
            raise ValueError(f"{path.name}: front-matter missing {key!r}")
    return Prompt(meta["task"], int(meta["version"]), meta["tier"], meta["schema"],
                  sections["system"], sections["user"])
