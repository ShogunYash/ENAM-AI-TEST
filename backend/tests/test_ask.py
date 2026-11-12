"""POST /ask: answers only from the evidence on screen; every quote verified, every figure already present. No LLM/network."""
import pytest

from app import models as m
from app.llm import LLMUnavailable
from app.llm.schemas import AskAnswer, AskCitation
from app.pipeline import ask

PAGE = ("The Board approved the floor price for the Issue, being ₹ 992.25 per Equity Share, and the issue size of "
        "up to ₹ 5,000 crore.")
FACTS = {"type": "results", "period": "Q2 FY27", "unit": "INR crore",
         "metrics": {"pat": {"value": 3699.6, "yoy_pct": 16.2, "year_ago": 3183.1}}, "ebitda_margin_pct": 16.8}


def evidence(pages=(PAGE,), facts=None):
    return {"title": "Bajaj Finance: QIP", "symbol": "BAJFINANCE", "doc": "BAJFINANCE:filing_9865b7f5", "pages": list(pages),
            "facts": facts, "headline": "Outcome of QIP 2026", "category": "fund_raise"}


def req(q="What floor price?", **ctx):
    return m.AskRequest(question=q, context=m.AskContext(screen="filing", filing_id="f1", **ctx))


def stub(monkeypatch, ev, out=None, exc=None):
    monkeypatch.setattr(ask, "filing_evidence", lambda fid: ev)

    def fake(*a, **k):
        if exc:
            raise exc
        return out

    monkeypatch.setattr(ask, "run_task", fake)


@pytest.mark.parametrize("answer,ok", [
    ("The floor price was ₹ 992.25 per share.", True),
    ("The floor price was ₹ 1,010 per share.", False),                    # figure not in the evidence
    ("Issue size is up to ₹5,000 crore.", True),
    ("PAT was INR 3,699.59 crore, up 16.2%.", True),                       # card rounding 3699.6 vs 3,699.59
    ("PAT grew 17%.", False),                                              # a figure the model computed/rounded itself
    ("The board approved it.", True),                                      # no figures
])
def test_numbers_supported(answer, ok):
    assert ask.numbers_supported(answer, PAGE + str(FACTS)) is ok


def test_numbers_in_the_question_count_as_supported():
    assert ask.numbers_supported("Yes, the 16.2% figure is right.", "x", "Is the 16.2% growth right?")


def test_cited_answer_is_returned_with_a_verified_claim(monkeypatch):
    stub(monkeypatch, evidence(), AskAnswer(answerable=True, answer="The floor price was ₹ 992.25 per Equity Share.",
                                            citations=[AskCitation(source=1, quote="the floor price for the Issue, being ₹ 992.25 per Equity Share")]))
    r = ask.answer(req())
    assert r.answerable and r.claims[0].verified and r.claims[0].sources[0].page == 1
    assert r.claims[0].sources[0].doc_id == "BAJFINANCE:filing_9865b7f5"
    m.AskResponse.model_validate(r.model_dump(mode="json"))


def test_fabricated_quote_or_figure_is_refused(monkeypatch):
    fake_quote = AskCitation(source=1, quote="the Board approved a floor price of ₹ 1,100 per Equity Share")
    stub(monkeypatch, evidence(), AskAnswer(answerable=True, answer="The floor price was ₹ 1,100.", citations=[fake_quote]))
    r = ask.answer(req())
    assert not r.answerable and r.claims == [] and "won't guess" in r.answer          # figure and quote both unsupported
    good = AskCitation(source=1, quote="the floor price for the Issue, being ₹ 992.25 per Equity Share")
    stub(monkeypatch, evidence(), AskAnswer(answerable=True, answer="The floor price was ₹ 1,100.", citations=[good]))
    assert not ask.answer(req()).answerable                                           # right quote, wrong figure in the answer


def test_uncited_text_answer_is_refused_but_card_only_answer_is_allowed(monkeypatch):
    stub(monkeypatch, evidence(), AskAnswer(answerable=True, answer="The company is raising money.", citations=[]))
    assert not ask.answer(req()).answerable                                            # uncited claim about filing text
    stub(monkeypatch, evidence(pages=(), facts=FACTS),
         AskAnswer(answerable=True, answer="PAT was INR 3,699.6 crore, up 16.2% year on year.", citations=[]))
    r = ask.answer(req("How did PAT change?"))
    assert r.answerable and r.claims == []                                             # figures all come from the card


def test_unanswerable_outage_and_missing_document(monkeypatch):
    stub(monkeypatch, evidence(), AskAnswer(answerable=False, answer="", citations=[]))
    r = ask.answer(req("What is the CEO's favourite food?"))
    assert not r.answerable and r.answer == ask.NOT_IN_EVIDENCE and r.claims == []
    stub(monkeypatch, evidence(), exc=LLMUnavailable("quota"))
    r = ask.answer(req())
    assert not r.answerable and r.answer == ask.NO_MODEL
    stub(monkeypatch, None)
    assert not ask.answer(req()).answerable and "no document open" in ask.answer(req()).answer


def test_research_blocks_map_back_to_doc_and_page(monkeypatch):
    ev = {"title": "KPIL research", "symbol": "KPIL", "doc": "KPIL", "pages": ["We expect revenue growth approx 25% for the full year."],
          "block_meta": [("KPIL:concall_Q3FY26", 5, "We expect revenue growth approx 25% for the full year.")],
          "facts": {"type": "research", "verdicts": [{"reason": "Guided ~25%; filed 21.6%"}]}, "headline": "KPIL", "category": None}
    monkeypatch.setattr(ask, "research_evidence", lambda s: ev)
    monkeypatch.setattr(ask, "run_task", lambda *a, **k: AskAnswer(
        answerable=True, answer="KPIL guided about 25% revenue growth for FY26.",
        citations=[AskCitation(source=1, quote="We expect revenue growth approx 25% for the full year")]))
    r = ask.answer(m.AskRequest(question="What did KPIL guide?", context=m.AskContext(screen="research", symbol="KPIL")))
    assert r.answerable and (r.claims[0].sources[0].doc_id, r.claims[0].sources[0].page) == ("KPIL:concall_Q3FY26", 5)


def test_schema_rejects_over_long_answers():
    with pytest.raises(ValueError):
        AskAnswer(answerable=True, answer="x" * 301, citations=[])


def test_route_uses_fixture_without_a_database_and_the_pipeline_with_one(monkeypatch):
    from fastapi.testclient import TestClient

    from app import main
    c = TestClient(main.app)
    body = {"question": "What happened?", "context": {"screen": "today"}}
    assert c.post("/ask", json=body).json()["answer"].startswith("Results beat on margins")      # fixture (mock mode)
    monkeypatch.setattr(main, "_has_real_data", lambda: True)
    monkeypatch.setattr(main.ask_pipeline, "answer", lambda r: m.AskResponse(answer="from pipeline", claims=[], answerable=False))
    got = c.post("/ask", json=body).json()
    assert got["answer"] == "from pipeline" and got["answerable"] is False
    assert c.post("/ask", json={"question": "x" * 501, "context": {"screen": "today"}}).status_code == 422


@pytest.mark.parametrize("answer", ["Guidance for FY26 was 25%.", "In Q3 FY27 and H1 FY'26 it said 25%."])
def test_period_labels_are_not_figures(answer):
    assert ask.numbers_supported(answer, "revenue growth approx 25%")


def test_a_real_figure_next_to_a_label_is_still_checked():
    assert not ask.numbers_supported("In Q3 it said 30%.", "revenue growth approx 25%")
