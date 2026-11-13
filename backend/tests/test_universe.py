"""Portfolio vs watchlist: the watchlist is tracked and browsable, but never part of the ranked digest or alerts."""
from datetime import datetime, timedelta

import pytest

from app import db, universe
from app import models as m
from app.models import Category as C
from app.pipeline import digest
from app.signals.eod import IST

NOW = datetime(2026, 11, 12, 9, 0, tzinfo=IST)


@pytest.fixture(autouse=True)
def tmp_db(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "db_path", lambda: tmp_path / "finn.sqlite")


def seed_two_groups():
    with db.connect() as con:
        for i, (sym, hours) in enumerate([("HOLD", 2), ("WATCH", 3)], 1):
            con.execute("INSERT INTO filings (id,symbol,scrip_code,company_name,filed_at,subcategory,headline,pdf_name) "
                        "VALUES (?,?,'1',?,?,'Financial Results','Results','x.pdf')",
                        (f"f{i}", sym, f"{sym} Ltd", (NOW - timedelta(hours=hours)).isoformat()))
            con.execute("INSERT INTO classifications (id,category,source,confidence) VALUES (?,?,'rule',1)",
                        (f"f{i}", C.results.value))


def snap(sym, pct, ratio):
    return m.PriceSnapshot(symbol=sym, as_of=NOW, close=100, pct_1d=pct, volume=1000, vol_avg_20d=1000 / ratio,
                           vol_ratio=ratio, spark_30d=[100])


def test_universe_reads_both_groups_and_never_double_counts():
    u = universe.universe()
    assert u[:len(universe.portfolio())] == universe.portfolio()               # portfolio first
    assert all(c.in_portfolio for c in universe.portfolio()) and not any(c.in_portfolio for c in universe.watchlist())
    assert not (universe.portfolio_symbols() & {c.symbol for c in universe.watchlist()})
    assert len(universe.portfolio()) == 17 and len(universe.watchlist()) >= 2
    assert {"POLYCAB", "KPIL"} <= {c.symbol for c in universe.watchlist()}      # the research names live on the watchlist
    assert universe.as_rows()[0][3] is True and universe.as_rows()[-1][3] is False


def test_ranked_digest_and_alerts_cover_holdings_only():
    seed_two_groups()
    snaps = [snap("HOLD", 7.0, 1.0), snap("WATCH", 9.0, 5.0)]                   # the watchlist stock moved MORE
    d = digest.build_digest("24h", now=NOW, snaps=snaps, symbols={"HOLD"})
    assert {f.symbol for f in d.needs_you + d.also_material + d.routine.items} == {"HOLD"}
    assert d.counts.total == 1
    assert {a.symbol for a in d.alerts} == {"HOLD"}                              # no watchlist price/volume/filing alerts
    everyone = digest.build_digest("24h", now=NOW, snaps=snaps)                  # (no scope = everything, as before)
    assert {f.symbol for f in everyone.needs_you + everyone.also_material} == {"HOLD", "WATCH"}


def test_company_view_lists_both_groups_with_their_flag():
    seed_two_groups()
    rows = [("HOLD", "Hold Ltd", "IT", True), ("WATCH", "Watch Ltd", "FMCG", False), ("QUIET", "Quiet Ltd", None, False)]
    cl = digest.build_company_list(rows, "30d", now=NOW)
    by = {c.symbol: c for c in cl.companies}
    assert by["HOLD"].in_portfolio is True and by["WATCH"].in_portfolio is False and by["QUIET"].in_portfolio is False
    assert by["WATCH"].total == 1 and by["WATCH"].top is not None                 # watchlist stocks get real headlines
    assert [c.symbol for c in digest.build_company_list([("HOLD", "Hold Ltd", "IT")], "30d", now=NOW).companies] == ["HOLD"]
    assert digest.build_company_list([("HOLD", "Hold Ltd", "IT")], "30d", now=NOW).companies[0].in_portfolio is True  # 3-tuples default
    m.CompanyList.model_validate(cl.model_dump(mode="json"))
    wf = digest.build_company_filings("WATCH", "Watch Ltd", "30d", now=NOW)
    assert wf.counts.total == 1 and wf.important[0].symbol == "WATCH"


def test_routes_scope_the_digest_to_the_portfolio(monkeypatch):
    from fastapi.testclient import TestClient

    from app import main
    captured = {}
    monkeypatch.setattr(main, "_has_real_data", lambda: True)
    monkeypatch.setattr(main.prices_mod, "snapshots", lambda syms: [])
    real = digest.build_digest

    def spy(*a, **k):
        captured["symbols"] = k.get("symbols")
        return real(*a, **k)

    monkeypatch.setattr(main.digest_mod, "build_digest", spy)
    c = TestClient(main.app)
    assert c.get("/digest?window=24h").status_code == 200
    assert captured["symbols"] == universe.portfolio_symbols() and "POLYCAB" not in captured["symbols"]
    assert c.get("/alerts").status_code == 200 and captured["symbols"] == universe.portfolio_symbols()
    comp = c.get("/companies").json()
    assert {x["symbol"]: x["in_portfolio"] for x in comp}["POLYCAB"] is False
    assert {x["symbol"]: x["in_portfolio"] for x in comp}["TCS"] is True
    cl = c.get("/digest/companies?window=30d").json()["companies"]
    assert {x["symbol"] for x in cl} == {x["symbol"] for x in comp}               # company view = portfolio + watchlist
