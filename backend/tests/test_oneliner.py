"""One-liner pipeline: numbers must come from the source, length is enforced, digest shows the line. No LLM/network."""
from datetime import datetime, timedelta

import pytest

from app import db
from app import models as m
from app.llm.schemas import SoWhat
from app.models import Category as C
from app.pipeline import digest, oneliner
from app.pipeline import results as R
from app.signals.eod import IST

TEXT = "The Board approved the allotment of 5,74,25,740 warrants at Rs. 1,010 each to the promoter group."


@pytest.fixture(autouse=True)
def tmp_db(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "db_path", lambda: tmp_path / "finn.sqlite")


@pytest.mark.parametrize("line,ok", [
    ("Approved allotment of 5,74,25,740 warrants at Rs. 1,010 each.", True),
    ("Approved allotment of 5,74,25,740 warrants at Rs. 1,100 each.", False),     # one figure changed
    ("Approved warrant allotment to the promoter group.", True),                    # no numbers: fine
    ("", False), ("x" * 71, False),
])
def test_check_line_requires_source_numbers_and_length(line, ok):
    assert (oneliner.check_line(line, "Allotment of warrants", TEXT) is not None) is ok


def test_headline_numbers_also_count_as_source():
    assert oneliner.check_line("Board meets on 10 Nov 2026 to price the issue", "Board meeting on 10 November 2026", "x")


def test_enrich_stores_a_verified_line_and_digest_shows_it(monkeypatch):
    monkeypatch.setattr(oneliner.docs, "get_pdf", lambda *a, **k: b"%PDF")
    monkeypatch.setattr(oneliner, "filing_text", lambda pdf: TEXT)
    seen = {}

    def fake(task, inputs, **kw):
        seen.update(task=task, inputs=inputs, kw=kw)
        return SoWhat(so_what="Approved allotment of 5,74,25,740 warrants at Rs. 1,010 each.")

    monkeypatch.setattr(oneliner, "run_task", fake)
    now = datetime(2026, 11, 12, 9, 0, tzinfo=IST)
    with db.connect() as con:
        con.execute("INSERT INTO filings (id,symbol,scrip_code,company_name,filed_at,subcategory,headline,pdf_name) "
                    "VALUES ('f1','BAJFINANCE','1','Bajaj Finance Ltd',?, 'Issue of Securities','Allotment of warrants','x.pdf')",
                    ((now - timedelta(hours=2)).isoformat(),))
        con.execute("INSERT INTO classifications (id,category,source,confidence) VALUES ('f1',?,'rule',1)", (C.fund_raise.value,))
    line = oneliner.enrich_oneliner("f1", "BAJFINANCE", "x.pdf", "Allotment of warrants", "Issue of Securities")
    assert line.startswith("Approved allotment") and seen["task"] == "so_what" and seen["kw"]["feature"] == "push.oneliner"
    assert "filing pages:" in seen["inputs"]["filing"] and "Issue of Securities" in seen["inputs"]["filing"]
    d = digest.build_digest("24h", now=now)
    f = (d.needs_you + d.also_material + d.routine.items)[0]
    assert f.so_what == line and f.enrichment.type == "oneliner"
    assert oneliner.enrich_oneliner("f1", "BAJFINANCE", "x.pdf", "h", "s") == line         # second call: stored, no LLM


def test_hallucinated_figure_is_not_stored(monkeypatch):
    monkeypatch.setattr(oneliner.docs, "get_pdf", lambda *a, **k: b"%PDF")
    monkeypatch.setattr(oneliner, "filing_text", lambda pdf: TEXT)
    monkeypatch.setattr(oneliner, "run_task", lambda *a, **k: SoWhat(so_what="Approved 9,99,999 warrants at Rs. 1,010."))
    assert oneliner.enrich_oneliner("f2", "X", "x.pdf", "Allotment", "s") is None
    assert R.load_enrichments(["f2"]) == {}


def test_results_and_management_cards_keep_their_own_line(monkeypatch):
    R.save_enrichment("f3", m.OneLiner(text="stored line"))
    monkeypatch.setattr(oneliner, "run_task", lambda *a, **k: pytest.fail("must not call the model for an existing card"))
    assert oneliner.enrich_oneliner("f3", "X", "x.pdf", "h", "s") == "stored line"
