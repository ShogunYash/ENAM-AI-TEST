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
    effective: str | None = Field(default=None, description="YYYY-MM-DD the change takes effect, as stated in the filing")
    background_source: Literal["filing", "web", "none"] = Field(
        default="none", description="Where `background` came from. The UI says 'From the filing' / 'From the web' / nothing.")


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


class CompanySummary(Model):
    """One row of the by-company view (used for the 30-day window, where one flat list is too much)."""

    symbol: str
    name: str
    sector: str | None
    in_portfolio: bool = Field(default=True, description="True = a holding; False = watchlist only (tracked, never in the "
                                                          "ranked digest, never raises alerts)")
    total: int = Field(description="Filings in the window")
    material: int = Field(description="High/medium-priority filings in the window, muted categories excluded")
    categories: dict[str, int] = Field(description="Material filings per category, e.g. {'results': 1, 'fund_raise': 3}")
    top: Filing | None = Field(description="The highest-scoring non-muted filing (headline shown on the row), else null")
    price: PriceReaction | None = Field(description="Latest session move: pct_1d and volume ratio")


class CompanyList(Model):
    window: DigestWindow
    generated_at: datetime
    companies: list[CompanySummary] = Field(description="Every portfolio company, most important first")


class CompanyFilings(Model):
    """Everything one company filed in the window, uncapped (the Digest lists are capped, this is not)."""

    symbol: str
    name: str
    window: DigestWindow
    generated_at: datetime
    counts: DigestCounts
    important: list[Filing] = Field(description="High/medium priority, best first")
    routine: RoutineGroup = Field(description="Low/hidden priority and muted categories, collapsed in the UI")


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
    answerable: bool = Field(default=True, description="False when the evidence on screen does not contain the answer, "
                                                       "or no model could be reached; `answer` then says so plainly.")


# ───────────────────────────── Price charts ─────────────────────────────
ChartRange = Literal["1d", "3d", "7d", "30d"]


class ChartPoint(Model):
    t: str = Field(description="ISO-8601 IST timestamp (15-minute bars) or YYYY-MM-DD (daily bars)")
    c: float = Field(description="close, in rupees")


class PriceChart(Model):
    symbol: str
    range: ChartRange
    points: list[ChartPoint]
    source: Literal["intraday", "eod"] = Field(description="intraday = 15-minute bars from Yahoo (delayed); eod = daily closes")
    change_pct: float | None = Field(description="first to last point in the range")
    high: float | None
    low: float | None
    as_of: str | None = Field(description="timestamp of the last point")
    note: str | None = Field(default=None, description="Honest limit, e.g. 'Daily closes: no intraday data for this range'")


# ───────────────────────────── Network (the investor's own contacts) ─────────────────────────────
# Everything below describes PEOPLE. The demo network is SYNTHETIC (`synthetic: true`); see docs/ARCHITECTURE.md for
# how real profile data and consent would be handled. Matches are derived by rules from the facts listed in `evidence`.
NetworkLink = Literal["worked_at_company", "overlapped_with_person", "same_school", "sector_expert"]


class NetworkJob(Model):
    org: str
    nse_symbol: str | None = Field(description="NSE symbol when `org` is a company FINN tracks, else null")
    role: str
    start_year: int
    end_year: int | None = Field(description="null = current job")


class NetworkEdu(Model):
    school: str
    degree: str | None
    year: int | None


class NetworkRelationship(Model):
    strength: int = Field(ge=1, le=5, description="1 = acquaintance, 5 = close, trusted contact")
    how_met: str
    last_contact: str = Field(description="YYYY-MM-DD")


class NetworkPerson(Model):
    id: str
    name: str
    headline: str
    city: str | None
    jobs: list[NetworkJob]
    education: list[NetworkEdu]
    expertise: list[str]
    relationship: NetworkRelationship
    synthetic: bool = Field(default=True, description="True for the demo network; the UI says so")


class PersonMatch(Model):
    person_id: str
    name: str
    headline: str
    strength: int = Field(description="relationship strength 1-5")
    link: NetworkLink
    why: str = Field(max_length=140, description="One line the investor can act on")
    evidence: list[str] = Field(description="The facts the match rests on, e.g. 'Bajaj Finance 2014-2019, credit risk'")
    score: float


class NetworkInsight(Model):
    key: str = Field(description="filing id for management_change / material_event, NSE symbol for company")
    kind: Literal["management_change", "material_event", "company"]
    symbol: str
    headline: str = Field(max_length=90, description="e.g. '2 contacts overlapped with Prashant Verma'")
    subject: str | None = Field(description="The person in the filing, when there is one")
    matches: list[PersonMatch]
    note: str | None = Field(default=None, description="Honest limit, e.g. 'The filing gives no career history, so this "
                                                      "matches on the employer only'")


class WarmNudge(Model):
    person_id: str
    name: str
    headline: str
    last_contact: str
    days_since: int
    symbol: str
    trigger: str = Field(description="Why now, e.g. 'Bajaj Finance: Q2 FY27 PAT +29% YoY'")
    filing_id: str | None
    opener: str = Field(max_length=200, description="A natural first line for reconnecting")


class ExpertiseMember(Model):
    person_id: str
    name: str
    strength: int


class ExpertiseTheme(Model):
    theme: str
    members: list[ExpertiseMember]
    companies: list[str] = Field(description="Tracked NSE symbols in this theme")


class AgentStep(Model):
    tool: str
    input: str
    summary: str


class NetworkAskRequest(Model):
    question: str


class NetworkAskResponse(Model):
    answer: str
    matches: list[PersonMatch]
    steps: list[AgentStep] = Field(description="The tool calls the agent made, shown to the user")
    answerable: bool = True
