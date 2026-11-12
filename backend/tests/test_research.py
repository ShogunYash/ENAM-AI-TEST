"""C1-C3 tests: screener documents/tables, document picking, quote verification, retrieval, actuals, verdict handling.
No network, no LLM."""
import pytest

from app import db
from app.ingest import screener
from app.llm.schemas import PvDSource, PvDUnresolved, PvDVerdictEntry, PvDVerdicts
from app.research import guidance, loader, pvd, snapshot
from app.research.guidance import Guidance
from app.research.verify import norm, verify_quote


@pytest.fixture(autouse=True)
def tmp_db(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "db_path", lambda: tmp_path / "finn.sqlite")


# ───────── screener documents ─────────
DOCS_HTML = """<section id="documents">
<div class="documents annual-reports"><ul>
 <li><a href="https://bse/AttachHis/ar26.pdf">Annual Report 2026</a> from bse</li>
 <li><a href="https://bse/AttachHis/ar25.pdf">Annual Report 2025</a></li></ul></div>
<div class="documents concalls"><ul>
 <li><div>Oct 2026</div><a href="https://x/t_q2fy27.pdf">Transcript</a><a href="https://x/p.pdf">PPT</a><a href="https://x/r.mp3">REC</a></li>
 <li><div>Jul 2026</div><a href="https://x/t_q1fy27.pdf">Transcript</a></li>
 <li><div>Feb 2026</div><a href="https://x/t_q3_late.pdf">Transcript</a></li>
 <li><div>Jan 2026</div><a href="https://x/t_q3fy26.pdf">Transcript</a></li>
 <li><div>Apr 2026</div><a href="https://x/ppt_only.pdf">PPT</a></li>
 <li><div>Apr 2026</div><a href="https://x/t_q4fy26.pdf">Transcript</a></li></ul></div></section>"""


@pytest.mark.parametrize("label,want", [
    ("Oct 2026", "2026-09-30"), ("Nov 2026", "2026-09-30"), ("Jan 2026", "2025-12-31"), ("Feb 2026", "2025-12-31"),
    ("Apr 2026", "2026-03-31"), ("May 2026", "2026-03-31"), ("Jul 2026", "2026-06-30"), ("Aug 2026", "2026-06-30"),
    ("garbage", None),
])
def test_call_quarter_end(label, want):
    assert screener.call_quarter_end(label) == want


def test_parse_documents_and_pick_one_call_per_quarter():
    d = screener.parse_documents(DOCS_HTML)
    assert [c["label"] for c in d["concalls"]] == ["Oct 2026", "Jul 2026", "Feb 2026", "Jan 2026", "Apr 2026"]  # PPT-only skipped
    assert [a["year"] for a in d["annual_reports"]] == [2026, 2025]
    refs = loader.pick_documents(d, "ACME", n_concalls=5, with_annual_report=True)
    concalls = [r for r in refs if r.kind == "concall"]
    assert [r.period for r in concalls] == ["Q2 FY27", "Q1 FY27", "Q4 FY26", "Q3 FY26"]
    assert next(r for r in concalls if r.period == "Q3 FY26").url.endswith("t_q3fy26.pdf")   # Jan (the call) beats Feb
    assert concalls[0].doc_id == "ACME:concall_Q2FY27" and refs[-1].doc_id == "ACME:ar_FY26"
    assert [r.period for r in loader.pick_documents(d, "ACME", n_concalls=2, with_annual_report=False)] == ["Q2 FY27", "Q1 FY27"]


def test_page_storage_roundtrip():
    ref = loader.DocRef("ACME:concall_Q2FY27", "ACME", "concall", "Q2 FY27", "u")
    loader.store(ref, ["page one text", "page two text"])
    assert loader.load_pages(ref.doc_id) == ["page one text", "page two text"]
    assert loader.stored_docs("ACME")[0]["pages"] == 2
    loader.store(ref, ["only one"])                       # re-store replaces, never duplicates
    assert loader.load_pages(ref.doc_id) == ["only one"]
    assert loader.clean_page_text("revenue grow-\nth was 3%") == "revenue growth was 3%"


# ───────── tables + snapshot ─────────
def table(section, headers, rows):
    ths = "".join(f"<th>{h}</th>" for h in headers)
    trs = "".join(f"<tr><td>{lab}&nbsp;+</td>" + "".join(f"<td>{v}</td>" for v in vals) + "</tr>" for lab, vals in rows)
    return f'<section id="{section}"><table><thead><tr><th></th>{ths}</tr></thead><tbody>{trs}</tbody></table></section>'


YEARS = ["Mar 2023", "Mar 2024", "Mar 2025", "Mar 2026", "TTM"]
PAGE = ('<ul id="top-ratios"><li><span class="name">ROCE</span><span class="number">40</span></li>'
        '<li><span class="name">ROE</span><span class="number">31.9</span></li></ul>'
        + table("profit-loss", YEARS, [("Sales", ["1,000", "1,100", "1,210", "1,331", "1,400"]),
                                       ("OPM %", ["20", "21", "22", "23", "24"]),
                                       ("Net Profit", ["100", "110", "120", "130", "150"])])
        + table("balance-sheet", YEARS[:4], [("Equity Capital", ["10", "10", "10", "10"]),
                                              ("Reserves", ["90", "190", "290", "390"]), ("Borrowings", ["50", "50", "60", "80"])])
        + table("cash-flow", YEARS[:4], [("Cash from Operating Activity", ["90", "120", "130", "140"])])
        + table("ratios", YEARS[:4], [("Working Capital Days", ["30", "31", "32", "33"])])
        + table("quarters", ["Sep 2025", "Dec 2025", "Mar 2026", "Jun 2026", "Sep 2026"],
                [("Sales", ["300", "310", "320", "330", "345"]), ("OPM %", ["22", "22", "23", "23", "24"]),
                 ("Net Profit", ["30", "31", "32", "33", "36"])]))


def test_snapshot_from_tables_without_llm():
    s = snapshot.build_snapshot(PAGE)
    assert s.latest_period == "FY26" and s.series.years == ["FY23", "FY24", "FY25", "FY26"]
    assert s.series.revenue == [1000.0, 1100.0, 1210.0, 1331.0] and s.series.borrowings == [50.0, 50.0, 60.0, 80.0]
    rev = next(h for h in s.headline if h.name == "Revenue (FY26)")
    assert (rev.value, rev.yoy_pct) == (1331.0, 10.0)
    assert s.ratios.roce == 40.0 and s.ratios.roe == 31.9 and s.ratios.working_capital_days == 33.0
    assert s.ratios.debt_equity == 0.2                                    # 80 / (10 + 390)
    assert s.ratios.cash_conversion == pytest.approx(480 / 460, abs=0.01)  # sum CFO / sum PAT over the series
    assert snapshot.build_snapshot("<html></html>") is None


def test_snapshot_lender_has_no_cash_conversion():
    lender = PAGE.replace("Sales", "Revenue").replace("OPM %", "Financing Margin %").replace(
        '<tr><td>Net Profit', '<tr><td>Financing Profit&nbsp;+</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td></tr><tr><td>Net Profit')
    s = snapshot.build_snapshot(lender)
    assert s.ratios.cash_conversion is None and s.ratios.working_capital_days is None


# ───────── quote verification (the grounding rule) ─────────
PAGES = ["Operator: welcome.\nOur revenue growth guidance for the financial year 2027 is 1.5% to 3.5% growth year-on-year in "
         "constant cur-\nrency terms.", "Our operating margin guidance for financial year '27 is 20% to 22%.\nThank you."]


def test_verify_exact_fuzzy_hyphenation_and_adjacent_page():
    q = "Our revenue growth guidance for the financial year 2027 is 1.5% to 3.5% growth year-on-year in constant currency terms."
    assert verify_quote(q, PAGES, 1) == 1                               # hyphenated line break handled
    assert verify_quote("our operating margin guidance for financial year 27 is 20% to 22%", PAGES, 2) == 2   # quotes/case
    assert verify_quote("Our operating margin guidance for financial year '27 is 20% to 22%.", PAGES, 1) == 2  # off-by-one page


def test_verify_rejects_fabricated_paraphrased_or_too_short_quotes():
    assert verify_quote("Management expects revenue growth of about five percent next year", PAGES, 1) is None
    assert verify_quote("Our operating margin guidance for financial year '27 is 25% to 28%.", PAGES, 2) is None or \
           verify_quote("Our operating margin guidance for financial year '27 is 25% to 28%.", PAGES, 2) == 2  # near-miss: see below
    assert verify_quote("revenue", PAGES, 1) is None and verify_quote("", PAGES, 1) is None
    assert verify_quote("anything long enough to count as a quote", PAGES, 9) is None   # page out of range
    assert norm("It’s “good” – really") == "its good - really"


def test_numeric_change_in_a_quote_is_caught():
    """Found by measurement: a quote with the right words but changed figures scored 97-98.5 on fuzzy match and was
    'verified'. Numbers must now appear on the cited page."""
    from rapidfuzz import fuzz
    real = "Our operating margin guidance for financial year '27 is 20% to 22%."
    for fake in ("Our operating margin guidance for financial year '27 is 25% to 28%.",
                 "Our operating margin guidance for financial year '27 is 20% to 25%.",
                 "Our operating margin guidance for financial year '28 is 20% to 22%."):
        assert fuzz.partial_ratio(norm(fake), norm(PAGES[1])) >= 90       # the fuzzy match alone WOULD accept it
        assert verify_quote(fake, PAGES, 2) is None                       # the number check rejects it
    assert verify_quote(real, PAGES, 2) == 2


# ───────── retrieval ─────────
LATER = ["Opening remarks. We had a good quarter with broad based demand across geographies.\n\n"
         "Overall, with our Q1 results we are changing our revenue growth guidance to 1.5% to 3% in constant currency.\n\n"
         "Our cafeteria has new menus and the campus is lovely."]


def G(gid="X:concall_Q4FY26#1", period="Q4 FY26", metric="Revenue growth guidance (constant currency)", target="1.5% to 3.5%",
      horizon="FY27", doc="X:concall_Q4FY26", page=4):
    return Guidance(gid, doc, period, metric, target, horizon, "quote", page)


def test_top_passages_finds_the_revision_not_the_noise():
    p = pvd.top_passages(G(), LATER, k=1)
    assert "changing our revenue growth guidance" in p[0]["text"] and p[0]["page"] == 1
    assert pvd.top_passages(G(metric="", target="", horizon=None), LATER) == []


def test_select_items_prefers_measurable_and_recent():
    a = G("a", "Q1 FY26", "Revenue growth")
    b = G("b", "Q4 FY26", "Office space plans")
    c = G("c", "Q4 FY26", "Operating margin")
    assert [g.gid for g in pvd.select_items([b, a, c], max_n=2)] == ["c", "a"]


ACT = [{"actual_ref": "screener.quarters.revenue.Sep2026", "metric": "revenue", "period": "Sep 2026", "value": 345.0, "unit": "INR_CR"}]


def test_actuals_have_code_computed_growth():
    a = pvd.actuals_from_screener(PAGE)
    q = next(x for x in a if x["actual_ref"] == "screener.quarters.revenue.Sep2026")
    assert q["value"] == 345.0 and q["yoy_growth_pct"] == 15.0            # (345-300)/300, 4 columns back
    y = next(x for x in a if x["actual_ref"] == "screener.profit-loss.net_profit.Mar2026")
    assert y["yoy_growth_pct"] == pytest.approx(8.3, abs=0.1)
    assert not any("yoy_growth_pct" in x for x in a if x["unit"] == "pct")


# ───────── verdict handling (model output is never trusted) ─────────
def run_reduce(monkeypatch, verdicts: list[PvDVerdictEntry], pages=None, metric="Revenue growth guidance (constant currency)"):
    monkeypatch.setattr(pvd, "run_task", lambda *a, **k: PvDVerdicts(verdicts=verdicts, unresolved=[PvDUnresolved(guidance_id="z", missing="m")]))
    g = G(metric=metric)
    docs = {"X:concall_Q4FY26": ["promise text " * 5], "X:concall_Q1FY27": pages or LATER}
    return pvd.reduce_batch("X", [g], "{}", docs, {g.gid: g}, {a["actual_ref"]: a for a in ACT})


def entry(verdict, reason="r", sources=()):
    return PvDVerdictEntry(guidance_id="X:concall_Q4FY26#1", verdict=verdict, reason=reason, sources=list(sources), calls_checked=[])


def test_verified_revision_becomes_a_cited_item(monkeypatch):
    good = PvDSource(doc_id="X:concall_Q1FY27", page=1, quote="we are changing our revenue growth guidance to 1.5% to 3% in constant currency")
    items, dropped = run_reduce(monkeypatch, [entry("cut", "Top of FY27 band cut 3.5% -> 3% (Q1 FY27)", [good])])
    assert dropped == 0 and len(items) == 1
    it = items[0]
    assert it.verdict == "cut" and it.promised.verified and it.outcome.sources[0].page == 1 and len(it.reason) <= 120


def test_fabricated_evidence_is_dropped_and_judgment_with_no_evidence_is_removed(monkeypatch):
    fake = PvDSource(doc_id="X:concall_Q1FY27", page=1, quote="management confirmed record deal wins and a strong beat this year")
    items, dropped = run_reduce(monkeypatch, [entry("met", "beat", [fake])])
    assert items == [] and dropped >= 1                                    # nothing verifiable supports 'met'
    items, _ = run_reduce(monkeypatch, [entry("pending", "still open", [])])
    assert [i.verdict for i in items] == ["pending"] and items[0].outcome is None   # pending needs no outcome quote


def test_table_actuals_are_accepted_by_reference_only(monkeypatch):
    ok = PvDSource(doc_id="screener", actual_ref="screener.quarters.revenue.Sep2026")
    items, _ = run_reduce(monkeypatch, [entry("met", "Rev 345 vs guide", [ok])], metric="Revenue growth")
    assert items[0].actual.value == 345.0 and items[0].actual.source == "screener.quarters.revenue.Sep2026"
    invented = PvDSource(doc_id="screener", actual_ref="screener.quarters.revenue.Dec2099")
    items, dropped = run_reduce(monkeypatch, [entry("met", "made up cell", [invented])], metric="Revenue growth")
    assert items == [] and dropped >= 1                                    # a table cell the model made up is rejected


def test_guidance_extraction_drops_unverifiable_quotes(monkeypatch, tmp_path):
    from app.llm.schemas import GuidanceItem, GuidanceItems
    ref = loader.DocRef("X:concall_Q4FY26", "X", "concall", "Q4 FY26", "u")
    loader.store(ref, PAGES)
    items = GuidanceItems(items=[
        GuidanceItem(metric="Revenue growth", target="1.5% to 3.5%", horizon="FY27", page=1,
                     quote="Our revenue growth guidance for the financial year 2027 is 1.5% to 3.5% growth year-on-year"),
        GuidanceItem(metric="Revenue growth", target="1.5% to 3.5%", horizon="FY27", page=1,
                     quote="Our revenue growth guidance for the financial year 2027 is 1.5% to 3.5% growth year-on-year"),  # repeat
        GuidanceItem(metric="Invented", target="50%", horizon="FY27", page=2, quote="We will grow fifty percent next year no matter what")])
    monkeypatch.setattr(guidance, "run_task", lambda *a, **k: items)
    got, st = guidance.extract_for_doc(ref.doc_id, "Q4 FY26", "X")
    assert st == {"raw": 3, "verified": 1, "dropped": 1} and got[0].gid == "X:concall_Q4FY26#1" and got[0].page == 1


# ───────── guards added after reading the first real Infosys report ─────────
def fact(metric, unit="INR_CR", ref="screener.profit-loss.revenue.Mar2026", value=178650.0):
    return {"actual_ref": ref, "metric": metric, "period": "Mar 2026", "value": value, "unit": unit}


def test_reported_inr_cannot_settle_constant_currency_guidance():
    """Infosys FY26: guided 3-3.5% constant-currency growth; screener's +9.6% is reported INR. Not comparable."""
    cc = G(metric="Revenue growth (constant currency)", target="3% to 3.5%", horizon="FY26")
    assert pvd.actual_is_comparable(cc, fact("revenue")) is False
    plain = G(metric="Revenue growth", target="15% to 18%", horizon="FY26")
    assert pvd.actual_is_comparable(plain, fact("revenue")) is True


def test_operating_margin_guidance_needs_an_ebitda_basis_to_use_screener_opm():
    """Infosys guides an EBIT-type 'operating margin' (20-22%); screener's OPM% is EBITDA-like (24%). Not comparable."""
    opm = fact("operating_margin_pct", "pct", "screener.profit-loss.operating_margin_pct.Mar2026", 24.0)
    assert pvd.actual_is_comparable(G(metric="Operating margin", target="20% to 22%"), opm) is False
    assert pvd.actual_is_comparable(G(metric="EBITDA margin", target="11% to 13%"), opm) is True
    assert pvd.actual_is_comparable(G(metric="Capex", target="Rs 1,200 crore"), opm) is False   # not a margin at all


def test_incomparable_table_fact_removes_an_otherwise_unsupported_verdict(monkeypatch):
    cc = G(metric="Revenue growth (constant currency)", target="3% to 3.5%", horizon="FY26")
    monkeypatch.setattr(pvd, "run_task", lambda *a, **k: PvDVerdicts(verdicts=[PvDVerdictEntry(
        guidance_id=cc.gid, verdict="met", reason="actual 9.6%", calls_checked=[],
        sources=[PvDSource(doc_id="screener", actual_ref="screener.profit-loss.revenue.Mar2026")])], unresolved=[]))
    index = {"screener.profit-loss.revenue.Mar2026": fact("revenue")}
    items, dropped = pvd.reduce_batch("X", [cc], "{}", {"X:concall_Q4FY26": ["promise text " * 5]}, {cc.gid: cc}, index)
    assert items == [] and dropped >= 1                   # the false 'met' never reaches the report


def test_evidence_carries_definitions_and_comparison_rules():
    import json
    a = pvd.actuals_from_screener(PAGE)
    assert all("definition" in x for x in a) and "EBITDA-type" in next(x for x in a if x["metric"] == "operating_margin_pct")["definition"]
    ev = json.loads(pvd.build_evidence([G()], {"Q4 FY26": [("X:concall_Q1FY27", LATER)]}, a, [], "Q1 FY27 call"))
    assert any("constant currency" in r for r in ev["comparison_rules"])
    assert ev["guidance"][0]["subsequent_calls_in_order"] == ["X:concall_Q1FY27"]


def test_reported_facts_are_not_guidance_and_quotes_are_cleaned(monkeypatch):
    from app.llm.schemas import GuidanceItem, GuidanceItems
    ref = loader.DocRef("X:concall_Q1FY27", "X", "concall", "Q1 FY27", "u")
    loader.store(ref, ["Our AI services revenue was 8.2% of overall revenue.\nWe expect effective tax rate for the year to be in the range of 29% to 30%."])
    items = GuidanceItems(items=[
        GuidanceItem(metric="AI services revenue", target="8.2% of overall revenue", horizon="FY27", page=1,
                     quote="Our AI services revenue was 8.2% of overall revenue."),                    # past tense = fact
        GuidanceItem(metric="Effective tax rate", target="29% to 30%", horizon="FY27", page=1,
                     quote='"We expect effective tax rate for the year to be in the range of 29% to 30%."')])
    monkeypatch.setattr(guidance, "run_task", lambda *a, **k: items)
    got, _st = guidance.extract_for_doc(ref.doc_id, "Q1 FY27", "X")
    assert [g.metric for g in got] == ["Effective tax rate"] and not got[0].quote.startswith('"')
    assert guidance.clean_quote('“Hello there.” ') == "Hello there."
