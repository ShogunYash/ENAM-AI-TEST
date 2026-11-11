"""B1 tests: BSE client (paging, retries, parsing, incremental ingest) and EOD snapshot maths. No network."""
from datetime import date, timedelta

import httpx
import pytest

from app import db
from app.ingest import bse, prices
from app.signals.eod import Bar, compute_snapshot


@pytest.fixture(autouse=True)
def tmp_db(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "db_path", lambda: tmp_path / "finn.sqlite")


def row(i, **kw):
    base = {"NEWSID": f"id-{i}", "SCRIP_CD": 500325, "SLONGNAME": "Reliance Industries Ltd",
            "CATEGORYNAME": "Company Update", "SUBCATNAME": "Credit Rating",
            "HEADLINE": "  Rating\n  reaffirmed  ", "NEWSSUB": None, "ATTACHMENTNAME": f"f{i}.pdf",
            "DissemDT": f"2026-11-0{i}T19:17:12.89", "QUARTER_ID": None}
    return {**base, **kw}


def bse_client(handler) -> tuple[bse.BseClient, list[httpx.Request]]:
    seen: list[httpx.Request] = []

    def wrapped(req):
        seen.append(req)
        return handler(req)

    http = httpx.Client(headers=bse.HEADERS, transport=httpx.MockTransport(wrapped))
    return bse.BseClient(http, min_interval=0), seen


def page_handler(pages: list[list[dict]], total: int):
    def h(req: httpx.Request):
        n = int(req.url.params["pageno"])
        tbl = pages[n - 1] if n <= len(pages) else []
        return httpx.Response(200, json={"Table": tbl, "Table1": [{"ROWCNT": total}]})
    return h


def test_to_record_handles_nulls_and_ist_time():
    r = bse.to_record(row(1), "RELIANCE", "500325")
    assert r["headline"] == "Rating reaffirmed" and r["newssub"] == "" and r["quarter_id"] == ""
    assert r["filed_at"] == "2026-11-01T19:17:12.890000+05:30"


def test_to_record_drops_rows_without_id_or_time():
    assert bse.to_record(row(1, NEWSID=None), "X", "1") is None
    assert bse.to_record(row(1, DissemDT=None, NEWS_DT=None, DT_TM=None), "X", "1") is None


def test_fetch_follows_pagination_and_sends_browser_headers():
    client, seen = bse_client(page_handler([[row(1), row(2), row(3)], [row(4), row(5)]], total=5))
    rows = client.fetch("500325", date(2026, 10, 1), date(2026, 11, 11))
    assert [r["NEWSID"] for r in rows] == [f"id-{i}" for i in range(1, 6)]
    assert len(seen) == 2
    p = seen[0].url.params
    assert (p["strScrip"], p["strPrevDate"], p["strToDate"]) == ("500325", "20261001", "20261111")
    assert seen[0].headers["referer"] == "https://www.bseindia.com/"


def test_fetch_stops_on_empty_page_even_if_rowcnt_lies():
    client, seen = bse_client(page_handler([[row(1)]], total=99))
    assert len(client.fetch("1", date(2026, 11, 1), date(2026, 11, 2))) == 1
    assert len(seen) == 2


def test_fetch_retries_html_blocks_then_succeeds():
    calls = {"n": 0}

    def h(req):
        calls["n"] += 1
        if calls["n"] < 3:
            return httpx.Response(200, text="<html>blocked</html>", headers={"content-type": "text/html"})
        return httpx.Response(200, json={"Table": [row(1)], "Table1": [{"ROWCNT": 1}]})

    client, _ = bse_client(h)
    assert len(client.fetch("1", date(2026, 11, 1), date(2026, 11, 2))) == 1 and calls["n"] == 3


def test_fetch_raises_after_retries():
    client, _ = bse_client(lambda r: httpx.Response(403))
    with pytest.raises(bse.BseError, match="403"):
        client.fetch("1", date(2026, 11, 1), date(2026, 11, 2))


def test_ingest_is_idempotent_and_incremental():
    client, seen = bse_client(page_handler([[row(1), row(2), row(3)]], total=3))
    today = date(2026, 11, 11)
    assert bse.ingest_symbol(client, "RELIANCE", "500325", days=60, today=today) == (3, 3)
    assert seen[0].url.params["strPrevDate"] == "20260912"          # first run: full 60-day window
    assert bse.ingest_symbol(client, "RELIANCE", "500325", days=60, today=today) == (3, 0)  # no duplicates
    assert seen[1].url.params["strPrevDate"] == "20261102"          # incremental: newest filing (3 Nov) - 1 day
    with db.connect() as con:
        assert con.execute("SELECT COUNT(*) FROM filings").fetchone()[0] == 3


def test_ingest_updates_existing_rows():
    today = date(2026, 11, 11)
    c1, _ = bse_client(page_handler([[row(1, HEADLINE="old")]], total=1))
    bse.ingest_symbol(c1, "RELIANCE", "500325", today=today)
    c2, _ = bse_client(page_handler([[row(1, HEADLINE="corrected")]], total=1))
    bse.ingest_symbol(c2, "RELIANCE", "500325", today=today)
    with db.connect() as con:
        assert con.execute("SELECT headline FROM filings WHERE id='id-1'").fetchone()[0] == "corrected"


def test_resolve_pdf_url_falls_back_to_attachhis():
    def h(req):
        if "AttachLive" in str(req.url):
            return httpx.Response(404)
        return httpx.Response(206, content=b"%PDF-1.7 ...")

    http = httpx.Client(transport=httpx.MockTransport(h))
    assert bse.resolve_pdf_url("a.pdf", http) == bse.pdf_url("a.pdf", "AttachHis")
    assert bse.resolve_pdf_url("", http) is None
    http404 = httpx.Client(transport=httpx.MockTransport(lambda r: httpx.Response(404)))
    assert bse.resolve_pdf_url("a.pdf", http404) is None


# ───────── EOD snapshot maths ─────────
def bars(n=25, vol=100, close=100.0):
    d0 = date(2026, 10, 1)
    return [Bar((d0 + timedelta(days=i)).isoformat(), close, vol) for i in range(n)]


def test_snapshot_volume_ratio_excludes_today():
    b = bars(25)
    b[-1] = Bar(b[-1].day, 110.0, 300)       # today: +10%, 3x volume
    s = compute_snapshot("X", b)
    assert s.vol_avg_20d == 100.0 and s.vol_ratio == 3.0 and s.pct_1d == 10.0 and s.close == 110.0
    assert s.as_of.isoformat() == "2026-10-25T15:30:00+05:30" and len(s.spark_30d) == 25


def test_snapshot_uses_only_last_20_prior_sessions():
    b = bars(40, vol=100)
    for i in range(10):                     # old, huge volumes outside the lookback must be ignored
        b[i] = Bar(b[i].day, 100.0, 10_000)
    assert compute_snapshot("X", b).vol_avg_20d == 100.0


def test_snapshot_needs_history_and_skips_zero_volume_days():
    assert compute_snapshot("X", bars(4)) is None
    b = bars(25)
    for i in range(10, 20):
        b[i] = Bar(b[i].day, 100.0, 0)      # trading-halt / bad data days don't drag the average down
    assert compute_snapshot("X", b).vol_avg_20d == 100.0


def test_snapshot_sorts_input_and_caps_spark():
    b = list(reversed(bars(40)))
    s = compute_snapshot("X", b)
    assert len(s.spark_30d) == 30 and s.as_of.date().isoformat() == "2026-11-09"


def test_bars_roundtrip_and_snapshots():
    b = bars(25)
    assert prices.store_bars({"X": b}) == 25
    assert prices.store_bars({"X": b}) == 25                         # idempotent
    assert prices.load_bars("X") == b
    assert [s.symbol for s in prices.snapshots(["X", "NOPE"])] == ["X"]
