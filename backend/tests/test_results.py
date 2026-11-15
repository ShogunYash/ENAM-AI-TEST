"""B3 tests: amount/unit parsing, EBITDA derivation, QoQ/YoY, FY label, screener parsing + cross-check, card building,
native-PDF routing. No network."""
import base64
import json

import httpx
import pytest

from app import db
from app import models as m
from app.ingest import screener
from app.llm import LLMUnavailable, run_task
from app.llm.schemas import ResultCell, ResultsExtraction, ResultSource
from app.pipeline import results as R
from app.settings import BACKEND_DIR, AppSettings


@pytest.fixture(autouse=True)
def tmp_db(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "db_path", lambda: tmp_path / "finn.sqlite")


# ───────── amounts and units ─────────
@pytest.mark.parametrize("printed,want", [
    ("73,188", 73188.0), ("1,45,463", 145463.0), ("(1,234.5)", -1234.5), ("-4,321", -4321.0), ("−12", -12.0),
    ("₹ 1,000", 1000.0), ("Rs. 250.75", 250.75), ("-", None), ("–", None), ("", None), (None, None), ("n.a.", None),
])
def test_parse_amount(printed, want):
    assert R.parse_amount(printed) == want


@pytest.mark.parametrize("unit,want", [
    ("₹ crore", 1.0), ("Rs. in Crores", 1.0), ("(` crore)", 1.0), ("₹ in lakhs", 0.01), ("Rs. in Lacs", 0.01),
    ("₹ million", 0.1), ("INR mn", 0.1), ("₹ billion", 100.0),
    ("US$ million", None), ("USD crore", None), ("percent", None), ("", None), (None, None),
])
def test_scale_to_crore(unit, want):
    assert R.scale_to_crore(unit) == want


def src(printed, unit="₹ crore", label="x", page=8):
    return ResultSource(label=label, printed=printed, unit=unit, page=page)


def reported(printed, unit="₹ crore", model_value=None):
    return ResultCell(value_inr_cr=model_value, status="reported", source=src(printed, unit))


def test_cell_value_converts_scale_and_ignores_model_value():
    assert R.cell_value(reported("73,188")) == (73188.0, "reported")
    assert R.cell_value(reported("7,31,880", "₹ lakhs", model_value=7318800.0)) == (7318.8, "reported")  # model wrong
    assert R.cell_value(reported("1,000", "₹ million")) == (100.0, "reported")
    assert R.cell_value(reported("(250)")) == (-250.0, "reported")


def test_cell_value_missing_cases():
    assert R.cell_value(ResultCell()) == (None, "missing")
    assert R.cell_value(reported("-")) == (None, "missing")                       # a dash is never zero
    assert R.cell_value(reported("100", "US$ million")) == (None, "missing")      # not INR
    assert R.cell_value(reported("100", "")) == (None, "missing")                 # unit unknown


def components(pbt="18,638", fin="252", da="1,262", oi="1,337", unit="₹ crore"):
    return {"pbt": src(pbt, unit), "finance_cost": src(fin, unit), "depreciation_amortisation": src(da, unit),
            "other_income": src(oi, unit)}


def test_derived_ebitda_matches_screener_operating_profit():
    cell = ResultCell(status="derived", components=components())
    assert R.cell_value(cell) == (18815.0, "derived")          # = screener.in Operating Profit for TCS Q2 FY27


def test_derived_ebitda_normalises_expense_signs_and_units():
    # expenses printed as negatives in some formats; other income negative reduces PBT contribution correctly
    assert R.cell_value(ResultCell(status="derived", components=components(fin="(252)", da="(1,262)")))[0] == 18815.0
    lakhs = components("18,63,800", "25,200", "1,26,200", "1,33,700", unit="₹ lakhs")   # 1 crore = 100 lakhs
    assert R.cell_value(ResultCell(status="derived", components=lakhs))[0] == pytest.approx(18815.0)
    assert R.cell_value(ResultCell(status="derived", components=components(oi="-")))[0] is None   # missing input
    partial = components()
    del partial["other_income"]
    assert R.cell_value(ResultCell(status="derived", components=partial)) == (None, "missing")


def test_pct_change_and_fy_label():
    assert R.pct_change(110, 100) == 10.0 and R.pct_change(90, 100) == -10.0
    assert R.pct_change(-50, -100) == 50.0                      # loss narrowing is an improvement (base abs)
    assert R.pct_change(5, 0) is None and R.pct_change(None, 5) is None and R.pct_change(5, None) is None
    assert [R.fy_label(d) for d in ("2026-06-30", "2026-09-30", "2026-12-31", "2027-03-31")] == \
           ["Q1 FY27", "Q2 FY27", "Q3 FY27", "Q4 FY27"]
    assert R.fy_label(None) == "Latest quarter"


# ───────── screener table ─────────
HTML = """<section id="quarters"><table class="data-table"><thead><tr><th></th><th>Jun 2026</th><th>Sep 2026</th></tr></thead>
<tbody><tr><td class="text">Sales&nbsp;+</td><td>72,275</td><td>73,188</td></tr>
<tr><td class="text">Operating Profit</td><td>18,556</td><td>18,815</td></tr>
<tr><td class="text">OPM %</td><td>26%</td><td>26%</td></tr>
<tr><td class="text">Profit before tax</td><td>17,944</td><td>18,638</td></tr>
<tr><td class="text">Net Profit&nbsp;+</td><td>13,420</td><td>13,934</td></tr></tbody></table></section>"""


def test_parse_quarters():
    q = screener.parse_quarters(HTML)
    assert q["2026-09"] == {"sales": 73188.0, "operating_profit": 18815.0, "pbt": 18638.0, "net_profit": 13934.0}
    assert q["2026-06"]["net_profit"] == 13420.0 and "opm" not in q["2026-06"]
    with pytest.raises(screener.ScreenerError):
        screener.parse_quarters("<html></html>")


Q = screener.parse_quarters(HTML)


PER = {"current": "2026-09-30", "previous": "2026-06-30", "year_ago": "2025-09-30"}
CUR = {"revenue": 73188.0, "pbt": 18638.0, "pat": 13934.0}
PREV = {"revenue": 72275.0, "pbt": 17944.0, "pat": 13420.0}


def test_cross_check_match_mismatch_unavailable():
    allp = {"current": CUR, "previous": PREV}                       # year-ago quarter is not in the HTML fixture
    assert R.cross_check(allp, PER, "TCS", "consolidated", Q).status == "match"
    off = R.cross_check({"current": {**CUR, "pat": 13000.0}}, PER, "TCS", "consolidated", Q)
    assert off.status == "mismatch" and "PAT Q2 FY27" in off.note and "-6.7%" in off.note
    assert R.cross_check({"current": {**CUR, "pat": 13934 * 1.015}}, PER, "TCS", "consolidated", Q).status == "match"  # <2%
    assert R.cross_check(allp, {**PER, "current": "2030-09-30"}, "TCS", "consolidated", Q).status == "match"  # prev still checked
    assert R.cross_check({"current": CUR}, {"current": "2030-09-30"}, "TCS", "consolidated", Q).status == "unavailable"
    assert R.cross_check(allp, {}, "TCS", "consolidated", Q).status == "unavailable"
    assert R.cross_check({}, PER, "TCS", "consolidated", Q).status == "unavailable"


def test_cross_check_catches_swapped_previous_and_year_ago_columns():
    """The failure Codex saw on an Infosys fact sheet: prior-year quarter printed BEFORE the previous quarter."""
    swapped = {"current": CUR, "previous": {"revenue": 65799.0, "pbt": 16068.0, "pat": 12131.0}}   # year-ago values
    bad = R.cross_check(swapped, PER, "TCS", "consolidated", Q)
    assert bad.status == "mismatch" and "Q1 FY27" in bad.note and "Revenue" in bad.note


# ───────── card building ─────────
def ext(basis="consolidated", rev=("73,188", "72,275", "65,799"), pat=("13,934", "13,420", "12,131"),
        pbt=("18,638", "17,944", "16,068"), ebitda=None, unit="₹ crore"):
    def trio(vals):
        return {"current": reported(vals[0], unit), "previous": reported(vals[1], unit),
                "year_ago": reported(vals[2], unit)} if vals else {k: ResultCell() for k in ("current", "previous", "year_ago")}
    eb = ebitda or {"current": ResultCell(status="derived", components=components()),
                    "previous": ResultCell(), "year_ago": ResultCell()}
    return ResultsExtraction.model_validate({
        "basis": basis, "periods": {"current": "2026-09-30", "previous": "2026-06-30", "year_ago": "2025-09-30"},
        "metrics": {"revenue": trio(rev), "ebitda": eb, "pbt": trio(pbt), "pat": trio(pat)}})


def test_build_card_values_growth_margin_and_contract():
    card = R.build_card(ext(), "http://x/doc.pdf", "TCS", "IT services", Q)
    assert (card.period, card.basis, card.cross_check.status, card.source.page) == ("Q2 FY27", "consolidated", "match", 8)
    by = {x.name: x for x in card.metrics}
    assert [x.name for x in card.metrics] == ["revenue", "ebitda", "pbt", "pat"]
    assert by["revenue"].yoy_pct == 11.2 and by["revenue"].qoq_pct == 1.3 and by["pat"].yoy_pct == 14.9
    assert by["ebitda"].value == 18815.0 and by["ebitda"].qoq_pct is None      # prior EBITDA not derivable -> null
    assert card.margin_ebitda_pct == 25.7
    m.ResultsCard.model_validate(card.model_dump(mode="json"))                  # honours the API contract


def test_build_card_returns_none_when_nothing_readable_or_basis_unknown():
    empty = {k: ResultCell() for k in ("current", "previous", "year_ago")}
    blank = ResultsExtraction.model_validate({"basis": "consolidated", "periods": {}, "metrics": {
        n: empty for n in ("revenue", "ebitda", "pbt", "pat")}})
    assert R.build_card(blank, "u", "X") is None
    assert R.build_card(ext(basis=None), "u", "X") is None


def test_banks_and_lenders_get_no_ebitda():
    card = R.build_card(ext(), "u", "HDFCBANK", "Private-sector banking", Q)
    assert next(x for x in card.metrics if x.name == "ebitda").value is None and card.margin_ebitda_pct is None
    assert next(x for x in card.metrics if x.name == "revenue").value == 73188.0


def test_so_what_is_short_signed_and_deterministic():
    card = R.build_card(ext(), "u", "TCS", "IT services", Q)
    line = R.so_what(card)
    assert line == "Q2 FY27: PAT +15%, Rev +11% YoY · EBITDA margin 25.7%" and len(line) <= 70
    down = R.build_card(ext(pat=("10,000", "13,420", "12,131")), "u", "TCS", "IT services", Q)
    assert "PAT −18%" in R.so_what(down)


def test_enrichment_roundtrip():
    card = R.build_card(ext(), "u", "TCS", "IT services", Q)
    R.save_enrichment("f1", card)
    got = R.load_enrichments(["f1", "nope"])
    assert set(got) == {"f1"} and got["f1"] == card and R.load_enrichments([]) == {}


# ───────── router: native PDF path ─────────
def settings(tmp_path, **keys):
    return AppSettings(_env_file=None, finn_data_dir=tmp_path, finn_llm_config=BACKEND_DIR / "config" / "models.yaml", **keys)


def gemini_reply(text='{"ok": true, "echo": "pdf"}'):
    return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": text}]}}],
                                     "usageMetadata": {"promptTokenCount": 900, "candidatesTokenCount": 20}})


def test_pdf_goes_to_gemini_native_endpoint_and_is_cached(tmp_path):
    seen = []

    def handler(req):
        seen.append(req)
        return gemini_reply()

    client = httpx.Client(transport=httpx.MockTransport(handler))
    s = settings(tmp_path, gemini_api_key="g", groq_api_key="q")
    out = run_task("ping", {"word": "x"}, pdf=b"%PDF-1.7 fake", feature="push.results", settings=s, client=client)
    assert out.echo == "pdf" and len(seen) == 1
    req = seen[0]
    assert ":generateContent" in str(req.url) and "/openai" not in str(req.url) and req.headers["x-goog-api-key"] == "g"
    body = json.loads(req.content)
    part = body["contents"][0]["parts"][0]["inline_data"]
    assert part["mime_type"] == "application/pdf" and base64.b64decode(part["data"]) == b"%PDF-1.7 fake"
    run_task("ping", {"word": "x"}, pdf=b"%PDF-1.7 fake", settings=s, client=client)     # same PDF -> cache hit
    assert len(seen) == 1
    run_task("ping", {"word": "x"}, pdf=b"%PDF-1.7 other", settings=s, client=client)    # different PDF -> new call
    assert len(seen) == 2


def test_pdf_never_falls_back_to_models_without_pdf_support(tmp_path):
    client = httpx.Client(transport=httpx.MockTransport(lambda r: httpx.Response(503)))
    s = settings(tmp_path, gemini_api_key="g", groq_api_key="q", openrouter_api_key="o")
    with pytest.raises(LLMUnavailable, match="no native PDF input"):
        run_task("ping", {"word": "x"}, pdf=b"%PDF-1.7", settings=s, client=client)


# ───────── revenue shown as sub-lines only (Titan Q2 FY27) + PDF size fitting ─────────
def test_revenue_derived_by_summing_printed_sub_lines():
    cell = ResultCell(status="derived", components={"line_1": src("20,337", label="Sale of products/ services"),
                                                    "line_2": src("277", label="Other operating revenues")})
    assert R.cell_value(cell) == (20614.0, "derived")
    bad = ResultCell(status="derived", components={"line_1": src("20,337"), "line_2": src("-")})
    assert R.cell_value(bad) == (None, "missing")                      # a missing sub-line never yields a partial sum
    odd = ResultCell(status="derived", components={"foo": src("1"), "bar": src("2")})
    assert R.cell_value(odd) == (None, "missing")                      # unknown component shapes are rejected


def test_fit_for_inline_slices_and_keeps_page_numbers(monkeypatch):
    import pymupdf

    from app.ingest import docs
    doc = pymupdf.open()
    for i in range(40):
        doc.new_page().insert_text((72, 72), f"page {i + 1}")
    pdf = doc.tobytes()
    piece, total = docs.fit_for_inline(pdf)
    assert total == 40 and pymupdf.open(stream=piece, filetype="pdf").page_count == 25
    assert "page 25" in pymupdf.open(stream=piece, filetype="pdf")[24].get_text()
    monkeypatch.setattr(docs, "MAX_BYTES", 10)                         # nothing fits -> a clear error, not a crash
    monkeypatch.setattr(docs, "SOFT_BYTES", 5)
    with pytest.raises(docs.DocError, match="even the first 6 pages exceed"):
        docs.fit_for_inline(pdf)


def test_banks_are_cross_checked_on_pbt_and_pat_only():
    """ICICI Bank: 'revenue' 88,161 (total income) vs screener 55,992 flagged a false mismatch; definitions differ for banks."""
    vals = {"current": {"revenue": 88161.0, "pbt": 18638.0, "pat": 13934.0}}
    assert R.cross_check(vals, {"current": "2026-09-30"}, "ICICIBANK", "consolidated", Q).status == "mismatch"   # revenue differs
    ok = R.cross_check(vals, {"current": "2026-09-30"}, "ICICIBANK", "consolidated", Q, skip_revenue=True)
    assert ok.status == "match"
    bank = R.build_card(ext(rev=("88,161", "80,000", "76,000")), "u", "ICICIBANK", "Private-sector banking", Q)
    assert bank.cross_check.status == "match"                                    # build_card applies it for banking/lending sectors
    plain = R.build_card(ext(rev=("88,161", "80,000", "76,000")), "u", "TCS", "IT services", Q)
    assert plain.cross_check.status == "mismatch"                                # everyone else is still checked on revenue
