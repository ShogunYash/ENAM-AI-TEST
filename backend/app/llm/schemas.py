"""Output schemas for LLM tasks. A prompt's front-matter `schema:` names an entry in SCHEMAS.

Add new task schemas here (B2 ClassifyBatch, B3 ResultsExtract, C3 GuidanceItems, ...).
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict


class Ping(BaseModel):
    model_config = ConfigDict(extra="ignore")
    ok: bool
    echo: str


class GuidanceItem(BaseModel):
    """One guidance statement extracted from one transcript (prompt: guidance_map)."""
    model_config = ConfigDict(extra="ignore")
    metric: str
    target: str
    horizon: str | None = None
    quote: str          # verbatim; server fuzzy-verifies it against the page text (research/verify.py)
    page: int


class GuidanceItems(BaseModel):
    model_config = ConfigDict(extra="ignore")
    items: list[GuidanceItem]


class PvDSource(BaseModel):
    model_config = ConfigDict(extra="ignore")
    doc_id: str
    page: int | None = None          # null for structured table actuals
    quote: str | None = None         # null for structured table actuals (use actual_ref)
    actual_ref: str | None = None


class PvDVerdictEntry(BaseModel):
    """Verdict for one guidance item (prompt: pvd_reduce). `reason` is truncated server-side to 120 chars."""
    model_config = ConfigDict(extra="ignore")
    guidance_id: str
    verdict: Literal["met", "missed", "slipped", "quietly_dropped", "pending", "raised", "cut"]
    reason: str
    sources: list[PvDSource] = []
    calls_checked: list[str] = []


class PvDUnresolved(BaseModel):
    model_config = ConfigDict(extra="ignore")
    guidance_id: str
    missing: str


class PvDVerdicts(BaseModel):
    model_config = ConfigDict(extra="ignore")
    verdicts: list[PvDVerdictEntry]
    unresolved: list[PvDUnresolved] = []


SCHEMAS: dict[str, type[BaseModel]] = {
    "Ping": Ping,
    "GuidanceItems": GuidanceItems,
    "PvDVerdicts": PvDVerdicts,
}
