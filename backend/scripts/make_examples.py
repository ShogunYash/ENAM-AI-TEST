"""Generate docs/examples/*.json — ILLUSTRATIVE MOCK DATA (numbers and people are fake).

Built from app.models so examples always match the contract. Used as:
  - frontend mocks / initial snapshot seed (copy to frontend/public/data/)
  - backend mock mode (app.main serves these when no real data exists)

Run from backend/:  uv run python -m scripts.make_examples
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from app import models as m

IST = timezone(timedelta(hours=5, minutes=30))
NOW = datetime(2026, 11, 11, 18, 30, tzinfo=IST)
OUT = Path(__file__).resolve().parents[2] / "docs" / "examples"
BSE_PDF = "https://www.bseindia.com/xml-data/corpfiling/AttachLive/{}.pdf"


def t(hours_ago: float) -> datetime:
    return NOW - timedelta(hours=hours_ago)


# ───────────── companies & prices ─────────────
PORTFOLIO = json.loads((Path(__file__).resolve().parents[2] / "data" / "portfolio.json").read_text("utf-8"))
companies = [
    m.Company(symbol=c["nse_symbol"], bse_code=c["bse_scrip_code"], name=c["name"], sector=c["sector"],
              in_portfolio=True)
    for c in PORTFOLIO["portfolio"]
]


def spark(base: float, drift: float, n: int = 30) -> list[float]:
    out, v = [], base
    for i in range(n):
        v = v * (1 + drift + (0.006 if i % 3 == 0 else -0.004))
        out.append(round(v, 1))
    return out


prices = [
    m.PriceSnapshot(symbol="CERA", as_of=NOW, close=6512.0, pct_1d=7.8, volume=182_400, vol_avg_20d=41_300,
                    vol_ratio=4.42, spark_30d=spark(5900, 0.001)),
    m.PriceSnapshot(symbol="BAJFINANCE", as_of=NOW, close=1012.5, pct_1d=-2.1, volume=6_120_000,
                    vol_avg_20d=4_950_000, vol_ratio=1.24, spark_30d=spark(1040, -0.0008)),
    m.PriceSnapshot(symbol="TITAN", as_of=NOW, close=3421.0, pct_1d=0.6, volume=910_000, vol_avg_20d=1_020_000,
                    vol_ratio=0.89, spark_30d=spark(3380, 0.0002)),
    m.PriceSnapshot(symbol="FINEORG", as_of=NOW, close=4380.0, pct_1d=-5.6, volume=96_000, vol_avg_20d=38_000,
                    vol_ratio=2.53, spark_30d=spark(4700, -0.002)),
    m.PriceSnapshot(symbol="RELIANCE", as_of=NOW, close=1335.4, pct_1d=0.3, volume=17_550_840,
                    vol_avg_20d=16_200_000, vol_ratio=1.08, spark_30d=spark(1320, 0.0003)),
]

# ───────────── filings ─────────────
cera_results = m.Filing(
    id="ex-0001", symbol="CERA", company_name="Cera Sanitaryware Ltd", filed_at=t(26),
    headline="Unaudited Financial Results for the quarter and half year ended September 30, 2026",
    so_what="PAT +21% YoY on margin expansion; revenue +9% YoY",
    category=m.Category.results, category_source="rule", priority=m.Priority.high, score=9.4,
    pdf_url=BSE_PDF.format("example-cera-results"),
    price_reaction=m.PriceReaction(pct_1d=7.8, vol_ratio=4.42),
    enrichment=m.ResultsCard(
        period="Q2 FY27", basis="consolidated", margin_ebitda_pct=16.9,
        metrics=[
            m.ResultsMetric(name="revenue", value=512.4, prev_q=468.0, prev_y=470.1, qoq_pct=9.5, yoy_pct=9.0),
            m.ResultsMetric(name="ebitda", value=86.6, prev_q=71.2, prev_y=70.4, qoq_pct=21.6, yoy_pct=23.0),
            m.ResultsMetric(name="pbt", value=82.1, prev_q=68.9, prev_y=67.5, qoq_pct=19.2, yoy_pct=21.6),
            m.ResultsMetric(name="pat", value=61.3, prev_q=51.4, prev_y=50.6, qoq_pct=19.3, yoy_pct=21.1),
        ],
        cross_check=m.CrossCheck(status="match", note=None),
        source=m.DocRef(doc_url=BSE_PDF.format("example-cera-results"), page=3),
    ),
)
bajfin_warrants = m.Filing(
    id="ex-0002", symbol="BAJFINANCE", company_name="Bajaj Finance Ltd", filed_at=t(8),
    headline="Allotment of equity shares upon conversion of warrants",
    so_what="Warrant conversion adds equity; dilution <0.5%",
    category=m.Category.fund_raise, category_source="rule", priority=m.Priority.high, score=7.1,
    pdf_url=BSE_PDF.format("example-bajfin-allot"),
    price_reaction=m.PriceReaction(pct_1d=-2.1, vol_ratio=1.24),
    enrichment=m.OneLiner(text="Promoter-group warrants converted; equity capital up marginally, "
                               "no new money beyond the 25% paid at issue."),
)
titan_cfo = m.Filing(
    id="ex-0003", symbol="TITAN", company_name="Titan Company Ltd", filed_at=t(14),
    headline="Appointment of Chief Financial Officer",
    so_what="New CFO from FMCG background takes over 1 Dec",
    category=m.Category.management_change, category_source="rule", priority=m.Priority.high, score=6.8,
    pdf_url=BSE_PDF.format("example-titan-cfo"), price_reaction=m.PriceReaction(pct_1d=0.6, vol_ratio=0.89),
    enrichment=m.BioCard(
        person="Example Person (mock)", role="Chief Financial Officer", change="appointed",
        background=["~20 yrs in finance; previously CFO at a listed FMCG company",
                    "Earlier treasury & investor-relations roles at a large conglomerate",
                    "Chartered Accountant"],
        links=["https://www.linkedin.com/in/example"],
    ),
)
fineorg_rating = m.Filing(
    id="ex-0004", symbol="FINEORG", company_name="Fine Organic Industries Ltd", filed_at=t(20),
    headline="Credit Rating - outlook revised to Negative",
    so_what="CRISIL outlook cut to Negative; rating kept AA",
    category=m.Category.credit_rating, category_source="llm", priority=m.Priority.medium, score=5.2,
    pdf_url=BSE_PDF.format("example-fineorg-rating"), price_reaction=m.PriceReaction(pct_1d=-5.6, vol_ratio=2.53),
    enrichment=m.OneLiner(text="Outlook cut on weaker export demand; rating AA reaffirmed."),
)
reliance_meet = m.Filing(
    id="ex-0005", symbol="RELIANCE", company_name="Reliance Industries Ltd", filed_at=t(10),
    headline="Participation in CLSA India Forum on November 16, 2026",
    so_what=None, category=m.Category.investor_meetings, category_source="rule", priority=m.Priority.low,
    score=1.1, pdf_url=BSE_PDF.format("example-ril-meet"), price_reaction=None, enrichment=None,
)
reliance_ad = m.Filing(
    id="ex-0006", symbol="RELIANCE", company_name="Reliance Industries Ltd", filed_at=t(22),
    headline="Newspaper publication of financial results", so_what=None,
    category=m.Category.unclassified, category_source="rule", priority=m.Priority.hidden, score=0.1,
    pdf_url=BSE_PDF.format("example-ril-ad"), price_reaction=None, enrichment=None,
)

alerts = [
    m.Alert(id="al-1", symbol="CERA", kind=m.AlertKind.volume_spike, triggered_at=NOW, value=4.42, threshold=2.0,
            message="Volume 4.4× 20-day avg after Q2 results", filing_id="ex-0001"),
    m.Alert(id="al-2", symbol="CERA", kind=m.AlertKind.price_move, triggered_at=NOW, value=7.8, threshold=5.0,
            message="+7.8% today", filing_id="ex-0001"),
    m.Alert(id="al-3", symbol="FINEORG", kind=m.AlertKind.price_move, triggered_at=NOW, value=-5.6,
            threshold=5.0, message="−5.6% today; volume 2.5× avg", filing_id="ex-0004"),
    m.Alert(id="al-4", symbol="TITAN", kind=m.AlertKind.material_filing, triggered_at=t(14), value=6.8,
            threshold=5.0, message="Management change: new CFO", filing_id="ex-0003"),
]

routine = [reliance_meet, reliance_ad]
digest = m.Digest(
    window=m.DigestWindow(label="24h", start=t(24), end=NOW), generated_at=NOW,
    needs_you=[bajfin_warrants, titan_cfo, fineorg_rating],
    also_material=[],
    routine=m.RoutineGroup(count=len(routine), by_category={"investor_meetings": 1, "unclassified": 1},
                           items=routine),
    alerts=[a for a in alerts if a.symbol != "CERA"] + alerts[:2],
    counts=m.DigestCounts(total=5, rule_classified=4, llm_classified=1),
)
digest_3d = digest.model_copy(update={
    "window": m.DigestWindow(label="3d", start=t(72), end=NOW),
    "needs_you": [cera_results, bajfin_warrants, titan_cfo, fineorg_rating],
    "counts": m.DigestCounts(total=6, rule_classified=5, llm_classified=1),
})

# ───────────── research ─────────────
def claim(text: str, kind: str, doc: str, page: int, quote: str) -> m.Claim:
    return m.Claim(text=text, kind=kind, sources=[m.Source(doc_id=doc, page=page, quote=quote)], verified=True)


research = m.Research(
    symbol="INFY", name="Infosys Ltd", status="ready", is_sample=True,
    progress=["Loaded financial tables", "Found 5 concall transcripts", "Extracted guidance 5/5",
              "Matched 4 promises to outcomes", "Verified 11/12 quotes (1 dropped)"],
    generated_at=NOW,
    sources=[
        m.SourceDoc(doc_id=f"concall_{q.replace(' ', '')}", kind="concall", period=q,
                    url="https://www.bseindia.com/stockinfo/AnnPdfOpen.aspx?Pname=example.pdf", pages=22)
        for q in ["Q2 FY26", "Q3 FY26", "Q4 FY26", "Q1 FY27", "Q2 FY27"]
    ] + [m.SourceDoc(doc_id="ar_FY26", kind="annual_report", period="FY26",
                     url="https://www.bseindia.com/xml-data/corpfiling/AttachHis/example.pdf", pages=312)],
    snapshot=m.FinancialSnapshot(
        latest_period="Q2 FY27",
        headline=[m.HeadlineNumber(name="Revenue (TTM)", value=171_200.0, unit="INR_CR", yoy_pct=6.1),
                  m.HeadlineNumber(name="EBITDA margin", value=24.6, unit="pct", yoy_pct=None),
                  m.HeadlineNumber(name="PAT (TTM)", value=27_900.0, unit="INR_CR", yoy_pct=5.3)],
        series=m.Series(years=["FY22", "FY23", "FY24", "FY25", "FY26"],
                        revenue=[121_641, 146_767, 153_670, 162_990, 168_400],
                        ebitda_margin=[27.0, 24.4, 24.1, 24.3, 24.5],
                        pat=[22_110, 24_108, 26_248, 26_750, 27_400],
                        cfo=[23_224, 22_467, 25_210, 26_900, 28_100],
                        borrowings=[5_325, 8_299, 8_359, 8_100, 7_900]),
        ratios=m.Ratios(roce=37.5, roe=29.1, debt_equity=0.09, cash_conversion=1.03, working_capital_days=61),
    ),
    pvd=[
        m.PvDItem(
            metric="FY26 revenue growth (cc)", said_in="Q2 FY26", horizon="FY26",
            promised=claim("Guided 2–3% constant-currency revenue growth for FY26", "guidance", "concall_Q2FY26", 4,
                           "we are revising our revenue growth guidance to 2 to 3 percent in constant currency"),
            outcome=claim("FY26 closed at 2.6% cc growth", "fact", "concall_Q4FY26", 3,
                          "for the full year we grew 2.6 percent in constant currency"),
            actual=m.Actual(value=2.6, unit="pct", source="concall_Q4FY26"),
            verdict=m.Verdict.met, reason="Guided 2–3% cc, delivered 2.6% — within band (Q4 FY26 call, p.3)",
        ),
        m.PvDItem(
            metric="Operating margin band", said_in="Q3 FY26", horizon="FY26",
            promised=claim("Operating margin guided at 20–22%", "guidance", "concall_Q3FY26", 5,
                           "operating margin guidance remains at 20 to 22 percent"),
            outcome=claim("FY26 operating margin 21.1%", "fact", "concall_Q4FY26", 4,
                          "operating margin for the year was 21.1 percent"),
            actual=m.Actual(value=21.1, unit="pct", source="concall_Q4FY26"),
            verdict=m.Verdict.met, reason="21.1% vs 20–22% band",
        ),
        m.PvDItem(
            metric="Large-deal TCV", said_in="Q4 FY26", horizon="FY27",
            promised=claim("Expected large-deal wins to sustain above $2.5bn per quarter", "guidance",
                           "concall_Q4FY26", 8, "we expect large deal wins to remain above 2.5 billion dollars"),
            outcome=claim("Q1 FY27 large deals at $1.9bn", "fact", "concall_Q1FY27", 6,
                          "large deal TCV for the quarter was 1.9 billion dollars"),
            actual=m.Actual(value=1.9, unit="USD_bn", source="concall_Q1FY27"),
            verdict=m.Verdict.missed, reason="Promised >$2.5bn/qtr; Q1 FY27 printed $1.9bn",
        ),
        m.PvDItem(
            metric="Fresher hiring", said_in="Q1 FY26", horizon="FY26",
            promised=claim("Planned to onboard 20,000 freshers in FY26", "guidance", "concall_Q2FY26", 11,
                           "we plan to onboard about 20000 freshers this year"),
            outcome=None, actual=None, verdict=m.Verdict.quietly_dropped,
            reason="Not mentioned in Q3, Q4 FY26 or Q1–Q2 FY27 calls",
        ),
        m.PvDItem(
            metric="FY27 revenue growth (cc)", said_in="Q1 FY27", horizon="FY27",
            promised=claim("FY27 guidance of 3–5% cc revenue growth", "guidance", "concall_Q1FY27", 3,
                           "we are guiding for 3 to 5 percent growth in constant currency for the year"),
            outcome=claim("Guidance narrowed to 3.5–5%", "fact", "concall_Q2FY27", 3,
                          "we are narrowing our guidance to 3.5 to 5 percent"),
            actual=None, verdict=m.Verdict.raised, reason="Lower end raised 3%→3.5% in Q2 FY27 call",
        ),
    ],
    extra=m.ResearchExtra(bull_bear=m.BullBear(
        bull=[claim("Cash conversion >100% for five years", "judgment", "ar_FY26", 188,
                    "free cash flow conversion was over 100 percent of net profit")],
        bear=[claim("Large-deal momentum slowed in Q1 FY27", "judgment", "concall_Q1FY27", 6,
                    "large deal TCV for the quarter was 1.9 billion dollars")],
    )),
    gaps=["Annual report FY27 not yet published"],
    cost=m.ResearchCost(llm_calls=7, cached=True),
)
research_building = m.Research(
    symbol="DIXON", name=None, status="building", is_sample=True,
    progress=["Resolving symbol", "Loaded financial tables", "Found 4 concall transcripts",
              "Extracting guidance 2/4…"],
    generated_at=None, sources=[], snapshot=None, pvd=[], extra=None, gaps=[],
    cost=m.ResearchCost(llm_calls=2, cached=False),
)

stats = m.LlmStats(
    as_of=NOW,
    totals=m.LlmTotals(calls=63, tokens_in=812_000, tokens_out=41_500, cache_hits=118, cache_hit_pct=65.2),
    by_feature=[
        m.LedgerRow(key="push.classify", calls=6, tokens_in=21_000, tokens_out=3_200, cache_hits=40),
        m.LedgerRow(key="push.results", calls=9, tokens_in=310_000, tokens_out=6_100, cache_hits=12),
        m.LedgerRow(key="push.mgmt_bio", calls=3, tokens_in=4_500, tokens_out=900, cache_hits=2),
        m.LedgerRow(key="pull.guidance", calls=30, tokens_in=420_000, tokens_out=24_000, cache_hits=55),
        m.LedgerRow(key="pull.pvd", calls=15, tokens_in=56_500, tokens_out=7_300, cache_hits=9),
    ],
    by_model=[
        m.LedgerRow(key="gemini-flash-lite", calls=8, tokens_in=24_000, tokens_out=3_800, cache_hits=41),
        m.LedgerRow(key="gemini-flash", calls=52, tokens_in=780_000, tokens_out=36_400, cache_hits=75),
        m.LedgerRow(key="groq/gpt-oss-120b", calls=3, tokens_in=8_000, tokens_out=1_300, cache_hits=2),
    ],
    avg_calls_new_ticker=6.4, grounding_dropped=3,
)

EXAMPLES: dict[str, object] = {
    "companies": companies,
    "prices": prices,
    "digest-24h": digest,
    "digest-3d": digest_3d,
    "filing-results": cera_results,
    "filing-management": titan_cfo,
    "filing-oneliner": bajfin_warrants,
    "alerts": alerts,
    "settings": m.Settings(),
    "research-INFY": research,
    "research-building": research_building,
    "stats": stats,
    "health": m.Health(ok=True, version="0.1.0", mode="mock", snapshot_as_of=NOW),
    "debug-sources": m.SourcesReport(checked_at=NOW, checks=[
        m.SourceCheck(name="bse", ok=True, detail="20 filings, PDF reachable"),
        m.SourceCheck(name="screener", ok=True, detail="7/7 sections, 41 transcripts"),
        m.SourceCheck(name="yfinance", ok=True, detail="2/2 tickers, 63 days"),
    ]),
    "meta": m.SnapshotMeta(as_of=NOW, portfolio_size=len(companies), research_symbols=["INFY"]),
    "ask": m.AskResponse(answer="Results beat on margins: EBITDA +23% YoY vs revenue +9%, so operating "
                                "leverage drove the PAT jump.", claims=[]),
}


def dump(obj: object) -> object:
    if isinstance(obj, list):
        return [o.model_dump(mode="json") for o in obj]
    return obj.model_dump(mode="json")  # type: ignore[attr-defined]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, obj in EXAMPLES.items():
        (OUT / f"{name}.json").write_text(json.dumps(dump(obj), indent=2, ensure_ascii=False) + "\n", "utf-8")
    print(f"wrote {len(EXAMPLES)} examples to {OUT}")


if __name__ == "__main__":
    main()
