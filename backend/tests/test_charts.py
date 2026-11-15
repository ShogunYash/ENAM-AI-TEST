"""Price charts: ranges are cut from stored data; the day change is read against the previous close; gaps are stated."""
import pytest
from fastapi.testclient import TestClient

from app import charts, db
from app.main import app

SYM = "TCS"      # a tracked symbol


def _session(day: str, start: float, n: int = 4):
    return [(f"{day}T{9 + i // 4:02d}:{15 * (i % 4):02d}:00+05:30", start + i) for i in range(n)]


@pytest.fixture
def seeded():
    intr = _session("2026-11-05", 100) + _session("2026-11-06", 110) + _session("2026-11-09", 120) + _session("2026-11-12", 130)
    bars = [("2026-10-20", 90.0), ("2026-11-05", 103.0), ("2026-11-12", 133.0)]
    with db.connect() as con:
        con.executemany("INSERT OR REPLACE INTO intraday (symbol,ts,close) VALUES (?,?,?)", [(SYM, t, c) for t, c in intr])
        con.executemany("INSERT OR REPLACE INTO bars (symbol,day,close,volume) VALUES (?,?,?,0)", [(SYM, d, c) for d, c in bars])
    yield
    with db.connect() as con:
        con.execute("DELETE FROM intraday WHERE symbol=?", (SYM,))
        con.execute("DELETE FROM bars WHERE symbol=?", (SYM,))


def test_one_day_is_the_last_session_and_change_is_against_the_previous_close(seeded):
    c = charts.chart(SYM, "1d")
    assert c.source == "intraday" and len(c.points) == 4 and c.points[0].t.startswith("2026-11-12")
    assert c.change_pct == round((133 - 123) / 123 * 100, 2)             # last 133 vs previous session's last close 123
    assert (c.high, c.low) == (133.0, 130.0)


def test_three_days_is_three_sessions_and_seven_days_is_the_calendar_week(seeded):
    assert {p.t[:10] for p in charts.chart(SYM, "3d").points} == {"2026-11-06", "2026-11-09", "2026-11-12"}
    assert {p.t[:10] for p in charts.chart(SYM, "7d").points} == {"2026-11-06", "2026-11-09", "2026-11-12"}   # 6 Nov is within 6 days of 12 Nov


def test_thirty_days_uses_daily_closes(seeded):
    c = charts.chart(SYM, "30d")
    assert c.source == "eod" and [p.t for p in c.points] == ["2026-10-20", "2026-11-05", "2026-11-12"]


def test_missing_intraday_falls_back_to_daily_and_says_so():
    with db.connect() as con:
        con.executemany("INSERT OR REPLACE INTO bars (symbol,day,close,volume) VALUES (?,?,?,0)",
                        [(SYM, "2026-11-11", 100.0), (SYM, "2026-11-12", 105.0)])
    try:
        c = charts.chart(SYM, "1d")
    finally:
        with db.connect() as con:
            con.execute("DELETE FROM bars WHERE symbol=?", (SYM,))
    assert c.source == "eod" and len(c.points) == 2 and c.change_pct == 5.0 and "Daily closes only" in (c.note or "")


def test_no_data_at_all_is_an_empty_chart_with_a_note():
    c = charts.chart(SYM, "7d")
    assert c.points == [] and c.change_pct is None and c.note


def test_endpoint_rejects_untracked_symbols_and_bad_ranges():
    client = TestClient(app)
    assert client.get("/prices/NOSUCH/chart?range=1d").status_code == 404
    assert client.get(f"/prices/{SYM}/chart?range=1y").status_code == 422
    assert client.get(f"/prices/{SYM}/chart?range=30d").status_code == 200
