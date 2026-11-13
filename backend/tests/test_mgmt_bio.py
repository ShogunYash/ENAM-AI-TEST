"""B4 tests: bio extraction guards (name must be in the filing, numbers must be in the filing, no event-restating lines),
deterministic one-liner, schema, digest attachment. No network, no LLM."""
import json

import pytest
from pydantic import ValidationError

from app import db
from app import models as m
from app.llm.schemas import MgmtBio
from app.pipeline import mgmt_bio as B
from app.pipeline import results as R

TEXT = ("[page 1]\nThe Board approved the appointment of Mr. Prashant Verma as Chief Information Security Officer effective "
        "1 February 2027. He has around 21 years of full-time experience on Security Domain and previously headed the "
        "Cyber Risk Unit.\n[page 2]\nSigned: Company Secretary")


@pytest.fixture(autouse=True)
def tmp_db(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "db_path", lambda: tmp_path / "finn.sqlite")


def bio(**kw):
    base = {"person": "Prashant Verma", "role": "Chief Information Security Officer", "change": "appointed",
            "effective": "2027-02-01", "background": ["Around 21 years of security experience"],
            "background_source": "filing", "links": []}
    return MgmtBio.model_validate({**base, **kw})


def test_good_bio_passes_through():
    c = B.check_bio(bio(), TEXT)
    assert (c.person, c.change, c.effective, c.background_source) == ("Prashant Verma", "appointed", "2027-02-01", "filing")
    assert c.background == ["Around 21 years of security experience"] and c.links == []
    m.BioCard.model_validate(c.model_dump(mode="json"))                          # honours the API contract


def test_a_name_that_is_not_in_the_filing_is_rejected():
    assert B.check_bio(bio(person="Sundar Pichai"), TEXT) is None              # hallucinated person
    assert B.check_bio(bio(person="Mr. Prashant Verma"), TEXT) is not None     # titles are ignored when matching
    assert B.name_in_text("K. K. Maheshwari", "resignation of Mr. K. K. Maheshwari as Vice Chairman")


def test_invented_numbers_in_background_are_dropped():
    c = B.check_bio(bio(background=["Around 21 years of security experience", "Over 30 years at a global bank"]), TEXT)
    assert c.background == ["Around 21 years of security experience"]          # "30 years" is not in the filing


@pytest.mark.parametrize("line", [
    "due to his current engagements and other personal commitments", "Retires from office of Vice-Chairman",
    "Mr. Anup Bagchi has assumed charge as MD & CEO effective today", "Annexure A attached", "Effective 1st January 2027",
    "RBI approved appointment for 3 years", "Provided valuable guidance and strategic direction"])
def test_event_restating_and_departure_reason_lines_are_not_background(line):
    c = B.check_bio(bio(background=[line]), TEXT + " " + line)
    assert c.background == [] and c.background_source == "none"                # abstains instead of padding


def test_web_background_requires_links_and_filing_text_rules_still_hold():
    web = bio(background=["Previously CISO at a listed bank"], background_source="web", links=["https://example.com/p"])
    assert B.check_bio(web, TEXT).background == []                             # web claims are not accepted without context


def test_background_lines_are_capped_and_length_checked():
    long = "x" * 91
    assert B.check_bio(bio(background=[long]), TEXT + long).background == []
    with pytest.raises(ValidationError):
        bio(background=["a", "b", "c", "d"])                                   # >3 lines fails validation -> router retries
    with pytest.raises(ValidationError):
        bio(effective="1st February 2027")                                     # dates must be YYYY-MM-DD


@pytest.mark.parametrize("kw,want", [
    ({}, "Prashant Verma appointed as Chief Information Security Officer"),                 # with the date: 74 chars
    ({"person": "Anup Bagchi", "role": "Managing Director and Chief Executive Officer", "effective": "2026-10-27"},
     "Anup Bagchi appointed as MD and CEO from 27 Oct"),
    ({"change": "resigned", "person": "K. K. Maheshwari", "role": "Non-Executive Vice Chairman", "effective": None},
     "K. K. Maheshwari resigns as Non-Executive Vice Chairman"),
])
def test_so_what_is_short_and_never_says_joins(kw, want):
    c = B.check_bio(bio(background=[], **kw), TEXT + " Anup Bagchi K. K. Maheshwari")
    line = B.so_what(c)
    assert line == want and len(line) <= 70 and "joins" not in line


def test_so_what_gives_up_rather_than_truncating():
    c = m.BioCard(person="A Very Long Person Name Indeed", role="Non-Executive Non-Independent Additional Director (Finance)",
                  change="appointed", background=[], links=[], effective="2027-01-01")
    assert B.so_what(c) is None                                                # the UI then shows the exchange headline


def test_bio_is_stored_and_attached_to_the_digest_with_its_one_liner(monkeypatch):
    from datetime import datetime, timedelta

    from app.models import Category as C
    from app.pipeline import digest
    from app.signals.eod import IST
    now = datetime(2026, 11, 12, 9, 0, tzinfo=IST)
    with db.connect() as con:
        con.execute("INSERT INTO filings (id,symbol,scrip_code,company_name,filed_at,subcategory,headline,pdf_name) "
                    "VALUES ('f1','HDFCBANK','1','HDFC Bank Ltd',?, 'Change in Management','CFO change','x.pdf')",
                    ((now - timedelta(hours=2)).isoformat(),))
        con.execute("INSERT INTO classifications (id,category,source,confidence) VALUES ('f1',?,'rule',1)", (C.management_change.value,))
    R.save_enrichment("f1", B.check_bio(bio(background=[]), TEXT))
    d = digest.build_digest("24h", now=now)
    f = (d.needs_you + d.also_material + d.routine.items)[0]
    assert f.enrichment.type == "management" and f.so_what == "Prashant Verma appointed as Chief Information Security Officer"


def test_run_task_roundtrip_for_the_prompt(monkeypatch, tmp_path):
    import httpx

    from app.llm import run_task
    from app.settings import BACKEND_DIR, AppSettings
    s = AppSettings(_env_file=None, finn_data_dir=tmp_path, finn_llm_config=BACKEND_DIR / "config" / "models.yaml",
                    gemini_api_key="g")
    reply = json.dumps({"person": "Prashant Verma", "role": "CISO", "change": "appointed", "effective": None,
                        "background": [], "background_source": "none", "links": []})
    client = httpx.Client(transport=httpx.MockTransport(lambda r: httpx.Response(200, json={
        "choices": [{"message": {"content": reply}}], "usage": {"prompt_tokens": 5, "completion_tokens": 5}})))
    out = run_task("mgmt_bio", {"filing": B.build_input("h", "Change in Management", TEXT)}, settings=s, client=client)
    assert out.person == "Prashant Verma" and "web_context: (none)" in B.build_input("h", "s", TEXT)


@pytest.mark.parametrize("line", ["withdrawal of nomination by Suzuki Motor Corporation, Japan",
                                  "continues as Non-executive Director", "Independent Director term 5 years starting 7 Sep 2026"])
def test_status_and_term_lines_are_not_background(line):
    c = B.check_bio(bio(background=[line]), TEXT + " " + line)
    assert c.background == [] and c.background_source == "none"


def test_audited_bio_corrections_apply_by_filing_id():
    from app import models as m
    from app.pipeline.results import apply_bio_review
    card = m.BioCard(person="A B", role="CEO", change="resigned", effective="2027-01-04", links=[],
                     background=["tribute line", "22 years at X"], background_source="filing")
    out = apply_bio_review(card, "abcdef12-0000", {"abcdef12": {"drop_background": ["tribute line"], "effective": None,
                                                                "role": "CEO, Sub"}})
    assert (out.background, out.effective, out.role) == (["22 years at X"], None, "CEO, Sub")
    gone = apply_bio_review(card, "abcdef12-0000", {"abcdef12": {"drop_background": ["tribute line", "22 years at X"]}})
    assert gone.background == [] and gone.background_source == "none"
    assert apply_bio_review(card, "zzzzzzzz", {"abcdef12": {}}) is card


def test_governance_disclosures_are_not_background():
    from app.pipeline.mgmt_bio import _NOT_BACKGROUND
    for line in ("Not related to any other Director or Key Managerial Personnel", "Not debarred by SEBI order"):
        assert _NOT_BACKGROUND.search(line)
    assert not _NOT_BACKGROUND.search("Over 38 years of HR experience")
