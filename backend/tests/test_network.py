"""Network: matches are rules over listed facts; the agent cannot name anyone who is not in the network."""
from datetime import date, datetime

import pytest

from app import db, network
from app import models as m
from app.signals.eod import IST


@pytest.fixture(autouse=True)
def _no_model(monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("no model in tests")
    monkeypatch.setattr(network, "run_task", boom)


def test_demo_network_is_marked_synthetic_and_valid():
    ps = network.people()
    assert len(ps) >= 10 and all(p.synthetic for p in ps)
    assert all(1 <= p.relationship.strength <= 5 for p in ps)


def test_company_insight_lists_people_who_worked_there_and_says_why():
    ins = network.company_insight("BAJFINANCE")
    assert ins.kind == "company" and "2 contacts worked at Bajaj Finance" == ins.headline
    top = ins.matches[0]
    assert top.link == "worked_at_company" and "Bajaj Finance" in top.why and top.evidence


def test_management_overlap_uses_only_tenure_the_filing_states():
    card = m.BioCard(person="Jane Roe", role="MD", change="appointed", links=[], effective="2026-10-27",
                     background=["22 years association with HDFC Group"], background_source="filing")
    ins = network.management_insight("f1", "HDFCBANK", card, 2026)
    first = ins.matches[0]
    assert first.link == "overlapped_with_person" and "Overlapped" in first.why
    assert ins.headline == "1 contact overlapped with Jane Roe" and ins.note is None
    assert any("filing: Jane Roe tenure since ~2004" in e for e in first.evidence)


def test_no_career_history_falls_back_to_the_employer_and_says_so():
    card = m.BioCard(person="Jane Roe", role="CFO", change="appointed", links=[], effective=None, background=[],
                     background_source="none")
    ins = network.management_insight("f2", "BAJFINANCE", card, 2026)
    assert all(x.link != "overlapped_with_person" for x in ins.matches)
    assert ins.note and "employer only" in ins.note


def test_event_insight_prefers_the_contact_whose_expertise_fits_the_event():
    ins = network.event_insight("f3", "TATASTEEL", "m_and_a")
    assert ins.matches[0].name == "Rohan Kapoor" and "M&A" in ins.matches[0].why
    assert network.event_insight("f4", "NO_SUCH_SYMBOL", "capex") is None


def test_warm_nudge_needs_a_recent_filing_and_a_cold_relationship():
    now = datetime.now(IST).isoformat()
    with db.connect() as con:
        con.execute("INSERT INTO filings (id,symbol,scrip_code,company_name,filed_at,headline) VALUES (?,?,?,?,?,?)",
                    ("w1", "DIXON", "540699", "Dixon Technologies", now, "Quarterly results"))
        con.execute("INSERT INTO classifications (id,category,source,confidence) VALUES ('w1','results','rule',1)")
    try:
        nudges = network.warm_nudges(today=date.fromisoformat(now[:10]))
    finally:                                            # the test database is shared: leave it empty
        with db.connect() as con:
            con.execute("DELETE FROM classifications WHERE id='w1'")
            con.execute("DELETE FROM filings WHERE id='w1'")
    names = {n.name for n in nudges}
    assert "Vikram Desai" in names                      # ex-Dixon, last spoke months ago
    assert "Meera Iyer" not in names                    # spoke recently, and Bajaj Finance has no new filing
    assert all(n.days_since >= network.NUDGE_AFTER_DAYS for n in nudges)


def test_expertise_map_groups_people_and_links_tracked_companies():
    themes = {t.theme: t for t in network.expertise_map()}
    assert "wires and cables" in themes and "POLYCAB" in themes["wires and cables"].companies


def test_ask_falls_back_to_rules_and_only_names_network_people():
    r = network.ask("Who do I know that knows Bajaj Finance?")
    assert r.answerable and r.steps[0].tool == "plan" and r.steps[1].tool == "company_contacts"
    assert {x.person_id for x in r.matches} <= {p.id for p in network.people()}
    assert "Meera Iyer" in r.answer
    miss = network.ask("anyone who knows quantum biology?")
    assert not miss.answerable and miss.matches == []
    warm = network.ask("who should I reconnect with?")
    assert warm.steps[1].tool == "warm_contacts"
