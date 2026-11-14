"""Output schemas for LLM tasks. A prompt's front-matter `schema:` names an entry in SCHEMAS.

Add new task schemas here (B2 ClassifyBatch, B3 ResultsExtract, C3 GuidanceItems, ...).
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models import Category


class Ping(BaseModel):
    model_config = ConfigDict(extra="ignore")
    ok: bool
    echo: str


class NetworkPlan(BaseModel):
    model_config = ConfigDict(extra="ignore")
    tool: str
    argument: str = ""


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


class ClassifiedFiling(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    category: Category               # one of the 17 labels; anything else fails validation -> retry
    confidence: float = Field(ge=0, le=1)


class ClassificationBatch(BaseModel):
    """prompt classify_batch (T1). Input `filings` is a JSON list of {id, headline, subcategory}."""
    model_config = ConfigDict(extra="ignore")
    items: list[ClassifiedFiling]


class SoWhat(BaseModel):
    """prompt so_what (T1). Over-long output fails validation (-> retry/fallback) instead of being cut,
    so a number or its unit is never truncated. An empty string means 'no useful event' -> null in the API."""
    model_config = ConfigDict(extra="ignore")
    so_what: str = Field(max_length=70)


class ResultSource(BaseModel):
    model_config = ConfigDict(extra="ignore")
    label: str                  # printed row label
    printed: str                # exact signed cell text, e.g. "(1,234.5)"
    unit: str                   # printed currency + scale, e.g. "₹ crore", "Rs. in lakhs"
    page: int                   # physical 1-based PDF page


class ResultCell(BaseModel):
    """One metric x one period. `value_inr_cr` is set only when the figure was printed in INR crore;
    other scales keep `source` and are converted deterministically by code (B3). For status "derived"
    (EBITDA absent) the model supplies `components` only; the CALLER evaluates
    PBT + finance cost + D&A - other income. The model never does arithmetic."""
    model_config = ConfigDict(extra="ignore")
    value_inr_cr: float | None = None
    status: Literal["reported", "derived", "missing"] = "missing"
    source: ResultSource | None = None
    components: dict[str, ResultSource] | None = None


class PeriodCells(BaseModel):
    model_config = ConfigDict(extra="ignore")
    current: ResultCell
    previous: ResultCell
    year_ago: ResultCell


class ResultPeriods(BaseModel):
    model_config = ConfigDict(extra="ignore")
    current: str | None = None      # quarter-end date YYYY-MM-DD
    previous: str | None = None
    year_ago: str | None = None


class ResultMetrics(BaseModel):
    model_config = ConfigDict(extra="ignore")
    revenue: PeriodCells
    ebitda: PeriodCells
    pbt: PeriodCells
    pat: PeriodCells


class ResultsExtraction(BaseModel):
    """prompt results_extract (T2). Raw extraction only; QoQ/YoY, unit conversion and EBITDA derivation are code."""
    model_config = ConfigDict(extra="ignore")
    basis: Literal["consolidated", "standalone"] | None
    periods: ResultPeriods
    metrics: ResultMetrics


class MgmtBio(BaseModel):
    """prompt mgmt_bio (T2). Identity/role/date come ONLY from the filing; background from the filing, else supplied web
    context, else empty. Over-long lines fail validation (-> retry) instead of being cut."""
    model_config = ConfigDict(extra="ignore")
    person: str = Field(min_length=2)
    role: str = Field(min_length=2)
    change: Literal["appointed", "resigned", "retired"]
    effective: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    background: list[str] = Field(default_factory=list, max_length=3)
    background_source: Literal["filing", "web", "none"] = "none"
    links: list[str] = Field(default_factory=list)


class AskCitation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    source: int = Field(ge=1)           # evidence block number
    quote: str


class AskAnswer(BaseModel):
    """prompt ask (T1). Over-long answers fail validation (-> retry) instead of being cut."""
    model_config = ConfigDict(extra="ignore")
    answerable: bool
    answer: str = Field(default="", max_length=300)
    citations: list[AskCitation] = Field(default_factory=list, max_length=4)


SCHEMAS: dict[str, type[BaseModel]] = {
    "NetworkPlan": NetworkPlan,
    "Ping": Ping,
    "GuidanceItems": GuidanceItems,
    "PvDVerdicts": PvDVerdicts,
    "ClassificationBatch": ClassificationBatch,
    "SoWhat": SoWhat,
    "ResultsExtraction": ResultsExtraction,
    "MgmtBio": MgmtBio,
    "AskAnswer": AskAnswer,
}
