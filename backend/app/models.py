"""FINN API contract — the single source of truth for every response shape.

Human-readable companion: docs/CONTRACT.md. Examples: docs/examples/*.json (validated in tests).
Change procedure: .claude/skills/finn-contract-change/SKILL.md (additive changes only).

Conventions
- Times: ISO-8601 with IST offset (+05:30).
- Money: float in ₹ crore (unit "INR_CR"). Percentages: float, 12.4 means 12.4 %.
- Optional values are null, never missing.
"""
from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field


class Model(BaseModel):
    model_config = ConfigDict(extra="forbid", use_enum_values=True)


# ───────────────────────────── Enums ─────────────────────────────
class Category(StrEnum):
    results = "results"
    m_and_a = "m_and_a"
    fund_raise = "fund_raise"
    management_change = "management_change"
    litigation = "litigation"
    insider_trading = "insider_trading"
    earnings_call = "earnings_call"
    investor_meetings = "investor_meetings"
    credit_rating = "credit_rating"
    dividend = "dividend"
    bonus_split = "bonus_split"
    capex = "capex"
    press_release = "press_release"
    postal_ballot = "postal_ballot"
    agm_egm = "agm_egm"
    pledging = "pledging"
    unclassified = "unclassified"


class Priority(StrEnum):
    high = "high"
    medium = "medium"
    low = "low"
    hidden = "hidden"


class Verdict(StrEnum):
    met = "met"
    missed = "missed"
    slipped = "slipped"
    quietly_dropped = "quietly_dropped"
    pending = "pending"
    raised = "raised"
    cut = "cut"


class AlertKind(StrEnum):
    volume_spike = "volume_spike"
    price_move = "price_move"
    material_filing = "material_filing"


WindowLabel = Literal["24h", "3d", "7d", "30d", "custom"]
MetricName = Literal["revenue", "ebitda", "pbt", "pat"]


# ───────────────────────────── Companies & prices ─────────────────────────────
class Company(Model):
    symbol: str = Field(description="NSE symbol, e.g. RELIANCE")
    bse_code: str | None
    name: str
    sector: str | None
    in_portfolio: bool


class PriceSnapshot(Model):
    symbol: str
    as_of: datetime
    close: float
    pct_1d: float = Field(description="Close-to-close % change")
    volume: int
    vol_avg_20d: float = Field(description="Mean volume of the previous 20 sessions (excludes as_of)")
    vol_ratio: float = Field(description="volume / vol_avg_20d")
    spark_30d: list[float] = Field(description="Last ≤30 closes, oldest first")


# ───────────────────────────── Filing enrichments ─────────────────────────────
class DocRef(Model):
    doc_url: str
    page: int | None


class ResultsMetric(Model):
    name: MetricName
    value: float | None = Field(description="This quarter, ₹ crore")
    prev_q: float | None = Field(description="Previous quarter (QoQ base)")
    prev_y: float | None = Field(description="Same quarter last year (YoY base)")
    qoq_pct: float | None
    yoy_pct: float | None


class CrossCheck(Model):
    status: Literal["match", "mismatch", "unavailable"]
    note: str | None = Field(description="e.g. 'PAT differs from screener by 3.2%'")


class ResultsCard(Model):
    type: Literal["results"] = "results"
    period: str = Field(description="Indian FY label, e.g. 'Q2 FY27'")
    basis: Literal["consolidated", "standalone"]
    unit: Literal["INR_CR"] = "INR_CR"
    metrics: list[ResultsMetric] = Field(min_length=4, max_length=4, description="revenue, ebitda, pbt, pat")
    margin_ebitda_pct: float | None
    cross_check: CrossCheck
    source: DocRef


class BioCard(Model):
    type: Literal["management"] = "management"
    person: str
    role: str
    change: Literal["appointed", "resigned", "retired"]
    background: list[str] = Field(max_length=3, description="≤3 short lines on prior roles/education")
    links: list[str] = Field(description="Web sources used for the bio (push-side enrichment)")


class OneLiner(Model):
    type: Literal["oneliner"] = "oneliner"
    text: str = Field(max_length=160)


Enrichment = Annotated[ResultsCard | BioCard | OneLiner, Field(discriminator="type")]


class PriceReaction(Model):
    pct_1d: float
    vol_ratio: float


class Filing(Model):
    id: str = Field(description="BSE NEWSID")
    symbol: str
    company_name: str
    filed_at: datetime
    headline: str = Field(description="Exchange headline, verbatim")
    so_what: str | None = Field(max_length=70, description="Headline rewritten as the 'so what'")
    category: Category
    category_source: Literal["rule", "llm"]
    priority: Priority
    score: float
    pdf_url: str | None
    price_reaction: PriceReaction | None
    enrichment: Enrichment | None


# ───────────────────────────── Alerts, digest, settings ─────────────────────────────
class Alert(Model):
    id: str
    symbol: str
    kind: AlertKind
    triggered_at: datetime
    value: float = Field(description="vol_ratio, pct_1d, or filing score depending on kind")
    threshold: float
    message: str = Field(max_length=90)
    filing_id: str | None


class DigestWindow(Model):
    label: WindowLabel
    start: datetime
    end: datetime


class RoutineGroup(Model):
    count: int
    by_category: dict[str, int]
    items: list[Filing]


class DigestCounts(Model):
    total: int
    rule_classified: int
    llm_classified: int


class Digest(Model):
    window: DigestWindow
    generated_at: datetime
    needs_you: list[Filing] = Field(max_length=5)
    also_material: list[Filing]
    routine: RoutineGroup
    alerts: list[Alert]
    counts: DigestCounts


class Settings(Model):
    """Lives on the client (localStorage); sent to the API as query params."""

    volume_multiple: float = 2.0
    volume_lookback_days: int = 20
    price_move_pct: float = 5.0
    categories_of_interest: list[Category] = Field(
        default_factory=lambda: [Category.results, Category.m_and_a, Category.management_change,
                                 Category.fund_raise, Category.litigation, Category.pledging]
    )
    muted_categories: list[Category] = Field(default_factory=lambda: [Category.unclassified])
    default_window: WindowLabel = "24h"


# ───────────────────────────── Research (Pull) ─────────────────────────────
class Source(Model):
    doc_id: str
    page: int
    quote: str = Field(description="Verbatim text from the page (server-verified)")


class Claim(Model):
    text: str
    kind: Literal["fact", "guidance", "judgment"]
    sources: list[Source]
    verified: bool


class SourceDoc(Model):
    doc_id: str
    kind: Literal["annual_report", "concall", "results", "presentation"]
    period: str = Field(description="e.g. 'Q1 FY27' or 'FY26'")
    url: str
    pages: int | None


class Actual(Model):
    value: float | None
    unit: str = Field(description="'pct', 'INR_CR', or free text like 'stores'")
    source: str = Field(description="'screener.quarters', 'screener.profit-loss', or a doc_id")


class PvDItem(Model):
    metric: str = Field(description="e.g. 'Revenue growth (cc)', 'EBIT margin', 'Capex'")
    said_in: str = Field(description="Period of the call where it was promised")
    horizon: str | None = Field(description="e.g. 'FY27', 'next 2 quarters'")
    promised: Claim
    outcome: Claim | None
    actual: Actual | None
    verdict: Verdict
    reason: str = Field(max_length=120)


class HeadlineNumber(Model):
    name: str
    value: float | None
    unit: str
    yoy_pct: float | None


class Series(Model):
    years: list[str]
    revenue: list[float | None]
    ebitda_margin: list[float | None]
    pat: list[float | None]
    cfo: list[float | None]
    borrowings: list[float | None]


class Ratios(Model):
    roce: float | None
    roe: float | None
    debt_equity: float | None
    cash_conversion: float | None = Field(description="Sum(CFO)/Sum(PAT) over the series")
    working_capital_days: float | None


class FinancialSnapshot(Model):
    latest_period: str
    headline: list[HeadlineNumber]
    series: Series
    ratios: Ratios | None


class BullBear(Model):
    bull: list[Claim] = Field(max_length=3)
    bear: list[Claim] = Field(max_length=3)


class ResearchExtra(Model):
    bull_bear: BullBear | None


class ResearchCost(Model):
    llm_calls: int
    cached: bool


class Research(Model):
    symbol: str
    name: str | None
    status: Literal["ready", "building", "partial", "failed"]
    is_sample: bool = Field(default=False, description="True for illustrative fixture data; the UI must badge it SAMPLE. "
                                                       "False only for research built from real documents.")
    progress: list[str] = Field(description="Human-readable build steps, shown while building")
    generated_at: datetime | None
    sources: list[SourceDoc]
    snapshot: FinancialSnapshot | None
    pvd: list[PvDItem]
    extra: ResearchExtra | None
    gaps: list[str] = Field(description="Explicit missing-data notes, e.g. 'No Q1 FY26 transcript'")
    cost: ResearchCost


# ───────────────────────────── Ops ─────────────────────────────
class LedgerRow(Model):
    key: str = Field(description="feature tag or model id")
    calls: int
    tokens_in: int
    tokens_out: int
    cache_hits: int


class LlmTotals(Model):
    calls: int
    tokens_in: int
    tokens_out: int
    cache_hits: int
    cache_hit_pct: float
    spend_inr: float = 0.0


class LlmStats(Model):
    as_of: datetime
    totals: LlmTotals
    by_feature: list[LedgerRow]
    by_model: list[LedgerRow]
    avg_calls_new_ticker: float | None
    grounding_dropped: int


class Health(Model):
    ok: bool
    version: str
    mode: Literal["live", "mock"] = Field(default="live", description="'mock' = the API is serving illustrative fixtures "
                                          "(no ingested database). The UI must NOT label mock data LIVE.")
    snapshot_as_of: datetime | None


class SourceCheck(Model):
    name: str
    ok: bool
    detail: str


class SourcesReport(Model):
    checked_at: datetime
    checks: list[SourceCheck]


class SnapshotMeta(Model):
    as_of: datetime
    portfolio_size: int
    research_symbols: list[str]


class AskContext(Model):
    screen: Literal["today", "filing", "research", "alerts"]
    symbol: str | None = None
    filing_id: str | None = None


class AskRequest(Model):
    question: str = Field(max_length=500)
    context: AskContext


class AskResponse(Model):
    answer: str
    claims: list[Claim]
