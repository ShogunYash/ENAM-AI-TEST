"""B2 tests: rule classifier, LLM-batch fallback, scoring, alerts, digest buckets. No network."""
import json
from datetime import datetime, timedelta

import pytest

from app import db
from app import models as m
from app.ingest import bse
from app.llm import LLMUnavailable
from app.llm.schemas import ClassificationBatch
from app.models import Category as C
from app.pipeline import classify, digest, score
from app.signals import alerts
from app.signals.eod import IST


@pytest.fixture(autouse=True)
def tmp_db(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "db_path", lambda: tmp_path / "finn.sqlite")


# ───────── rule classifier (cases are real BSE rows from the 12 Nov ingest) ─────────
@pytest.mark.parametrize("sub,head,want", [
    ("Financial Results", "As enclosed", C.results),
    ("Credit Rating", "Disclosure under Regulation 30 ...", C.credit_rating),
    ("Earnings Call Transcript", "Earnings call Transcripts", C.earnings_call),
    ("General", "Press Release - TCS BaNCS for Treasury marks its entry into Sri Lanka", C.press_release),
    ("General", "Enclosed", C.unclassified),
    ("General", "Intimation under Regulation 30 - Receipt of GST Order", C.litigation),
    ("General", "An update on Voluntary Public Takeover Offer made by the Company", C.m_and_a),
    ("General", "L&T bags (Significant*) order from Noida Metro for Aqua Line Extension", C.press_release),
    ("General", "Grant of stock options under Employee Stock Option Scheme", C.unclassified),
    ("Allotment of Equity Shares", "Allotment of 18,97,180 equity shares pursuant to exercise of ESOP/RSU", C.unclassified),
    ("Allotment of Equity Shares", "Allotment of Non-convertible securities (NCDs) on Private Placement basis", C.fund_raise),
    ("Analyst / Investor Meet", "Audio recording of the discussion on the unaudited Financial Results", C.earnings_call),
    ("Analyst / Investor Meet", "Executives will be participating in the Institutional Investors meeting - CLSA", C.investor_meetings),
    ("Board Meeting", "Astral Ltd has informed BSE that the meeting of the Board is scheduled to consider financial results", C.results),
    ("Board Meeting", "has informed BSE that the meeting of the Board of Directors of the Company is scheduled", C.unclassified),
    ("Newspaper Publication", "As enclosed", C.unclassified),
    ("Investor Presentation", "As enclosed", C.results),
    ("Press Release / Media Release", "As enclosed", C.press_release),
    ("Disclosures under Reg. 31(1) and 31(2) of SEBI (SAST) Regulations, 2011", "...", C.pledging),
    ("Change in Directorate", "Appointment of Mr. Anup Bagchi as an Additional Director", C.management_change),
    ("Meeting Updates", "Outcome of QIP 2026 - Special Committee Meeting", C.fund_raise),
    ("Others", "Clarification regarding news report relating to the Company's Assam facility", C.press_release),
])
def test_rules(sub, head, want):
    assert classify.classify_rule(sub, head) == want


@pytest.mark.parametrize("sub,head", [
    ("Outcome of Board Meeting", "Outcome of Board Meeting - Tata Steel Limited"),   # could be anything -> LLM
    ("General", "Proposed Initial Public Offer of Jio Platforms Limited"),
    ("Outcome without intimation", "Outcome of the Meeting of the Investment Committee, as empowered by the Board"),
])
def test_rules_defer_ambiguous_to_llm(sub, head):
    assert classify.classify_rule(sub, head) is None


def test_every_subcategory_mapping_is_a_valid_category():
    assert all(isinstance(c, C) for c in classify.SUBCAT.values())


# ───────── persistence + LLM batch fallback ─────────
def seed(rows: list[dict]) -> None:
    with db.connect() as con:
        con.executemany(
            "INSERT INTO filings (id,symbol,scrip_code,company_name,filed_at,category_name,subcategory,headline,pdf_name)"
            " VALUES (:id,:symbol,'1',:company_name,:filed_at,'',:subcategory,:headline,:pdf_name)",
            [{"company_name": r["symbol"] + " Ltd", "pdf_name": "x.pdf", **r} for r in rows])


NOW = datetime(2026, 11, 12, 9, 0, tzinfo=IST)


def F(i, symbol="AAA", hours=3, sub="General", head="Proposed Initial Public Offer of X", **kw):
    return {"id": f"f{i}", "symbol": symbol, "filed_at": (NOW - timedelta(hours=hours)).isoformat(),
            "subcategory": sub, "headline": head, **kw}


def test_classify_pending_rules_then_batched_llm(monkeypatch):
    seed([F(i) for i in range(65)] + [F(100, sub="Financial Results", head="As enclosed")])
    calls = []

    def fake_run_task(task, inputs, **kw):
        ids = [x["id"] for x in json.loads(inputs["filings"])]
        calls.append(len(ids))
        items = [{"id": i, "category": "m_and_a", "confidence": 0.9} for i in ids] + \
                [{"id": "not-ours", "category": "results", "confidence": 1}]
        return ClassificationBatch.model_validate({"items": items})

    monkeypatch.setattr(classify, "run_task", fake_run_task)
    stats = classify.classify_pending()
    assert calls == [30, 30, 5] and stats["rule"] == 1 and stats["llm"] == 65 and stats["unclassified_left"] == 0
    assert classify.classify_pending()["todo"] == 0         # idempotent: nothing left to do
    with db.connect() as con:
        assert con.execute("SELECT COUNT(*) FROM classifications WHERE id='not-ours'").fetchone()[0] == 0
        assert con.execute("SELECT source FROM classifications WHERE id='f100'").fetchone()[0] == "rule"


def test_llm_outage_leaves_rows_unclassified_without_crashing(monkeypatch):
    seed([F(1), F(2)])

    def boom(*a, **k):
        raise LLMUnavailable("all models failed")

    monkeypatch.setattr(classify, "run_task", boom)
    s = classify.classify_pending()
    assert s["llm_failed"] == 2 and s["llm"] == 0
    assert classify.classify_pending(use_llm=False)["todo"] == 2   # still pending for the next run


# ───────── scoring ─────────
@pytest.mark.parametrize("cat,sub,head,want", [
    (C.results, "Financial Results", "As enclosed", 9),
    (C.results, "Investor Presentation", "Results deck", 2),            # echo of results already shown
    (C.management_change, "Change in Management", "Appointment of CFO", 8),
    (C.management_change, "Resignation of Director", "Resignation of an independent director", 5),
    (C.credit_rating, "Credit Rating", "Rating downgraded to AA-", 8),
    (C.credit_rating, "Credit Rating", "Rating reaffirmed", 3),
    (C.fund_raise, "Allotment of Equity Shares", "Allotment of NCDs on private placement", 4),
    (C.fund_raise, "Intimation of Repayment of Commercial Paper (CP)", "Redemption of Commercial Paper", 2),
    (C.fund_raise, "Qualified Institutional Placement", "Capital Raise through QIP", 7),
    (C.unclassified, "General", "Enclosed", 0.1),
])
def test_weight(cat, sub, head, want):
    assert score.weight(cat, sub, head) == want


def test_priority_buckets():
    assert [score.priority_for(w).value for w in (9, 7, 5, 4, 3, 1, 0.1)] == \
           ["high", "high", "medium", "medium", "low", "low", "hidden"]


def test_score_ordering_effects():
    kw = {"interests": set(), "muted": set(), "reaction": None}
    base = score.score(9, C.results, filed_at=NOW - timedelta(hours=1), now=NOW, **kw)
    older = score.score(9, C.results, filed_at=NOW - timedelta(hours=73), now=NOW, **kw)
    assert older == pytest.approx(base / 2, rel=0.05)                      # 72 h half-life
    liked = score.score(9, C.results, filed_at=NOW, now=NOW, **{**kw, "interests": {"results"}})
    assert liked > score.score(9, C.results, filed_at=NOW, now=NOW, **kw)
    assert score.score(9, C.results, filed_at=NOW, now=NOW, **{**kw, "muted": {"results"}}) == 0
    moved = score.score(9, C.results, filed_at=NOW, now=NOW, interests=set(), muted=set(),
                        reaction=m.PriceReaction(pct_1d=8, vol_ratio=4))
    assert moved > score.score(9, C.results, filed_at=NOW, now=NOW, **kw) * 1.5


# ───────── alerts ─────────
def snap(symbol, pct, ratio):
    return m.PriceSnapshot(symbol=symbol, as_of=NOW, close=100, pct_1d=pct, volume=1000, vol_avg_20d=1000 / ratio,
                           vol_ratio=ratio, spark_30d=[100])


def test_price_alerts_follow_user_thresholds():
    snaps = [snap("A", 6.2, 1.0), snap("B", 0.5, 3.1), snap("C", -5.0, 2.0), snap("D", 1, 1)]
    got = {(a.symbol, a.kind) for a in alerts.price_alerts(snaps, m.Settings())}
    assert got == {("A", "price_move"), ("B", "volume_spike"), ("C", "price_move"), ("C", "volume_spike")}
    loose = {(a.symbol, a.kind) for a in alerts.price_alerts(snaps, m.Settings(volume_multiple=1.0, price_move_pct=0.4))}
    assert ("D", "volume_spike") in loose and ("B", "price_move") in loose        # thresholds are configurable
    neg = next(a for a in alerts.price_alerts([snap("C", -5.0, 1)], m.Settings()) if a.kind == "price_move")
    assert neg.message.startswith("−5.0%")


# ───────── digest ─────────
def classify_all(cat_by_id: dict[str, C]) -> None:
    with db.connect() as con:
        con.executemany("INSERT INTO classifications (id,category,source,confidence) VALUES (?,?,?,?)",
                        [(i, c.value, "rule", 1.0) for i, c in cat_by_id.items()])


def test_digest_buckets_dedup_and_window():
    seed([
        F(1, "AAA", 2, "Financial Results", "Q2 results"),
        F(2, "BBB", 3, "Qualified Institutional Placement", "QIP outcome"),
        F(3, "BBB", 4, "Meeting Updates", "QIP committee meeting"),       # same event as 2 -> not a 2nd card
        F(4, "CCC", 5, "Dividend", "Interim dividend"),
        F(5, "CCC", 6, "Earnings Call Transcript", "Transcript"),
        F(6, "DDD", 7, "Newspaper Publication", "As enclosed"),
        F(7, "EEE", 100, "Financial Results", "Old results"),               # outside 24h
    ])
    classify_all({"f1": C.results, "f2": C.fund_raise, "f3": C.fund_raise, "f4": C.dividend,
                  "f5": C.earnings_call, "f6": C.unclassified, "f7": C.results})
    d = digest.build_digest("24h", now=NOW)
    assert d.counts.total == 6 and d.window.label == "24h"
    assert {f.id for f in d.needs_you} == {"f1", "f2"}
    assert "f3" in [f.id for f in d.also_material]                          # sibling demoted, not lost
    assert {f.id for f in d.routine.items} == {"f4", "f5", "f6"} and d.routine.count == 3
    assert d.routine.by_category["dividend"] == 1
    assert "f7" not in {f.id for f in d.needs_you + d.also_material + d.routine.items}
    assert "f7" in {f.id for f in digest.build_digest("7d", now=NOW).needs_you}


def test_digest_needs_you_capped_at_five_and_muted_go_to_routine():
    seed([F(i, f"S{i}", 2, "Financial Results", "results") for i in range(8)])
    classify_all({f"f{i}": C.results for i in range(8)})
    d = digest.build_digest("24h", now=NOW)
    assert len(d.needs_you) == 5 and len(d.also_material) == 3
    muted = digest.build_digest("24h", settings=m.Settings(muted_categories=[C.results]), now=NOW)
    assert muted.needs_you == [] and muted.routine.count == 8


def test_digest_price_reaction_promotes_a_medium_filing():
    seed([F(1, "AAA", 2, "Credit Rating", "Rating action by agency")])     # weight 5 -> medium
    classify_all({"f1": C.credit_rating})
    calm = digest.build_digest("24h", now=NOW, snaps=[snap("AAA", 0.5, 1.0)])
    hot = digest.build_digest("24h", now=NOW, snaps=[snap("AAA", 6.0, 3.0)])
    assert calm.needs_you == [] and [f.id for f in calm.also_material] == ["f1"]
    assert [f.id for f in hot.needs_you] == ["f1"] and hot.needs_you[0].price_reaction.pct_1d == 6.0


def test_digest_alerts_combine_filings_and_prices():
    seed([F(1, "AAA", 2, "Financial Results", "results")])
    classify_all({"f1": C.results})
    d = digest.build_digest("24h", now=NOW, snaps=[snap("BBB", 7.0, 1.0)])
    assert {(a.symbol, a.kind) for a in d.alerts} == {("AAA", "material_filing"), ("BBB", "price_move")}


def test_custom_window_and_pdf_folder_choice():
    with pytest.raises(ValueError):
        digest.build_digest("custom", now=NOW)
    seed([F(1, "AAA", 2, "Financial Results", "fresh"), F(2, "AAA", 24 * 6, "Financial Results", "old")])
    classify_all({"f1": C.results, "f2": C.results})
    d = digest.build_digest("custom", start=NOW - timedelta(days=10), end=NOW, now=NOW)
    pdfs = {f.id: f.pdf_url for f in d.needs_you + d.also_material}
    assert "AttachLive" in pdfs["f1"] and "AttachHis" in pdfs["f2"]
    assert pdfs["f1"] == bse.pdf_url("x.pdf", "AttachLive")


def test_digest_validates_against_contract():
    seed([F(1, "AAA", 2, "Financial Results", "results")])
    classify_all({"f1": C.results})
    m.Digest.model_validate(digest.build_digest("24h", now=NOW).model_dump(mode="json"))


def test_commercial_paper_repayment_is_routine_and_never_a_funding_alert():
    """ChatGPT review (G3/C5 #3): repaying CP is not raising money -> unclassified, hidden, no alert. Even if some path
    still labelled it fund_raise, its weight is low enough to stay out of Needs-you and alerts."""
    sub, head = "Intimation of Repayment of Commercial Paper (CP)", "Redemption of Commercial Paper"
    assert classify.classify_rule(sub, head) == C.unclassified
    for cat in (C.unclassified, C.fund_raise):
        db_file = db.db_path()
        if db_file.exists():
            db_file.unlink()
        seed([F(1, "AAA", 2, sub, head)])
        classify_all({"f1": cat})
        d = digest.build_digest("24h", now=NOW)
        assert d.needs_you == [] and d.also_material == [] and [f.id for f in d.routine.items] == ["f1"]
        assert not [a for a in d.alerts if a.kind == "material_filing"]


def test_majority_stake_in_a_generic_press_release_is_m_and_a():
    """Found by the LLM-vs-rules evaluation: 'Persistent Secures Strong Majority Stake' sat in Press Release."""
    assert classify.classify_rule("Press Release / Media Release",
                                  "The Press Release titled Persistent Secures Strong Majority Stake is as enclosed") == C.m_and_a


def test_research_sample_flag_in_contract():
    assert m.Research.model_fields["is_sample"].default is False


def test_seed_restores_only_missing_databases(tmp_path, monkeypatch):
    from app import seed
    from app.settings import AppSettings

    seed_dir = tmp_path / "seed"
    seed_dir.mkdir()
    (seed_dir / "finn.sqlite").write_bytes(b"SEED-DB")
    (seed_dir / "llm.sqlite").write_bytes(b"SEED-LLM")
    data = tmp_path / "data"
    monkeypatch.setattr(seed, "SEED", seed_dir)
    monkeypatch.setattr(seed, "get_settings", lambda: AppSettings(_env_file=None, finn_data_dir=data, finn_seed=True))
    assert seed.ensure_seed() == ["finn.sqlite", "llm.sqlite"]
    assert (data / "finn.sqlite").read_bytes() == b"SEED-DB" and (data / "cache" / "llm.sqlite").read_bytes() == b"SEED-LLM"
    (data / "finn.sqlite").write_bytes(b"LIVE")                       # existing data is never overwritten
    assert seed.ensure_seed() == [] and (data / "finn.sqlite").read_bytes() == b"LIVE"


def test_seed_is_off_in_the_test_environment():
    from app.seed import ensure_seed
    from app.settings import get_settings
    assert get_settings().finn_seed is False and ensure_seed() == []
