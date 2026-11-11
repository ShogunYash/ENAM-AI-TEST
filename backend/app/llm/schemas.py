"""Output schemas for LLM tasks. A prompt's front-matter `schema:` names an entry in SCHEMAS.

Add new task schemas here (B2 ClassifyBatch, B3 ResultsExtract, C3 GuidanceItems, ...).
"""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class Ping(BaseModel):
    model_config = ConfigDict(extra="ignore")
    ok: bool
    echo: str


SCHEMAS: dict[str, type[BaseModel]] = {
    "Ping": Ping,
}
