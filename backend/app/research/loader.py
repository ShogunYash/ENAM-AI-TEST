"""C1: any NSE symbol -> its primary-source documents (last N earnings-call transcripts + latest annual report), as
per-page text in SQLite. Primary sources only (finn-grounding): documents come from screener.in's links to the
exchange / company IR site; nothing else is read.

Cache-first: PDFs are stored once on disk (immutable) and page text once in the DB; re-running costs no network.
"""
from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from datetime import datetime

import httpx

from app import db
from app.ingest import bse, screener
from app.pipeline.results import fy_label
from app.settings import get_settings
from app.signals.eod import IST

MAX_PDF_BYTES = 80 * 1024 * 1024
UA = bse.HEADERS["User-Agent"]


class LoaderError(RuntimeError):
    pass


@dataclass(frozen=True)
class DocRef:
    doc_id: str          # 'INFY:concall_Q2FY27'
    symbol: str
    kind: str            # concall | annual_report
    period: str          # 'Q2 FY27' / 'FY26'
    url: str


def _quarter_token(period: str) -> str:
    return period.replace(" ", "")          # 'Q2 FY27' -> 'Q2FY27'


def pick_documents(docs: dict, symbol: str, n_concalls: int = 5, with_annual_report: bool = True) -> list[DocRef]:
    """Latest `n_concalls` distinct quarters (earliest call per quarter = the earnings call), plus the latest annual
    report. 5 transcripts are needed for 4 quarters of promised-vs-delivered (guidance at Q-4..Q-1 + the latest call)."""
    by_q: dict[str, dict] = {}
    for c in docs["concalls"]:                       # newest first
        q = c.get("quarter_end")
        if not q:
            continue
        if q not in by_q or datetime.strptime(c["label"], "%b %Y") < datetime.strptime(by_q[q]["label"], "%b %Y"):
            by_q[q] = c
    quarters = sorted(by_q, reverse=True)[:n_concalls]
    out = [DocRef(f"{symbol}:concall_{_quarter_token(fy_label(q))}", symbol, "concall", fy_label(q), by_q[q]["transcript"])
           for q in quarters]
    if with_annual_report and docs["annual_reports"]:
        ar = docs["annual_reports"][0]
        out.append(DocRef(f"{symbol}:ar_FY{ar['year'] % 100:02d}", symbol, "annual_report", f"FY{ar['year'] % 100:02d}",
                          ar["url"]))
    return out


def _pdf_path(url: str):
    p = get_settings().finn_data_dir / "raw" / "docs"
    p.mkdir(parents=True, exist_ok=True)
    return p / f"{hashlib.sha256(url.encode()).hexdigest()[:24]}.pdf"


def download(url: str, client: httpx.Client | None = None) -> bytes:
    path = _pdf_path(url)
    if path.exists():
        return path.read_bytes()
    own = client is None
    client = client or httpx.Client(headers={"User-Agent": UA, "Referer": "https://www.bseindia.com/"}, timeout=90,
                                    follow_redirects=True)
    try:
        r = client.get(url)
    except httpx.TransportError as e:
        raise LoaderError(f"{url[:80]}: {type(e).__name__}") from e
    finally:
        if own:
            client.close()
    if r.status_code != 200:
        raise LoaderError(f"{url[:80]}: HTTP {r.status_code}")
    if r.content[:4] != b"%PDF":
        raise LoaderError(f"{url[:80]}: not a PDF ({r.headers.get('content-type')})")
    if len(r.content) > MAX_PDF_BYTES:
        raise LoaderError(f"{url[:80]}: {len(r.content) / 1e6:.0f} MB too large")
    path.write_bytes(r.content)
    return r.content


_HYPHEN_BREAK = re.compile(r"(\w)-\n(\w)")


def clean_page_text(text: str) -> str:
    """Join hyphenated line breaks; keep paragraph structure. (Exact page text is also what quotes are verified against.)"""
    return _HYPHEN_BREAK.sub(r"\1\2", text).strip()


def extract_pages(pdf: bytes) -> list[str]:
    import pymupdf

    return [clean_page_text(p.get_text()) for p in pymupdf.open(stream=pdf, filetype="pdf")]


def store(ref: DocRef, pages: list[str]) -> None:
    with db.connect() as con:
        con.execute("INSERT OR REPLACE INTO documents (doc_id,symbol,kind,period,url,pages,fetched_at) VALUES (?,?,?,?,?,?,?)",
                    (ref.doc_id, ref.symbol, ref.kind, ref.period, ref.url, len(pages), datetime.now(IST).isoformat()))
        con.execute("DELETE FROM doc_pages WHERE doc_id=?", (ref.doc_id,))
        con.executemany("INSERT INTO doc_pages (doc_id,page,text) VALUES (?,?,?)",
                        [(ref.doc_id, i + 1, t) for i, t in enumerate(pages)])


def load_pages(doc_id: str) -> list[str]:
    with db.connect() as con:
        return [r["text"] for r in con.execute("SELECT text FROM doc_pages WHERE doc_id=? ORDER BY page", (doc_id,))]


def stored_docs(symbol: str) -> list[dict]:
    with db.connect() as con:
        return [dict(r) for r in con.execute("SELECT * FROM documents WHERE symbol=? ORDER BY period DESC", (symbol,))]


def load_company(symbol: str, n_concalls: int = 5, with_annual_report: bool = False,
                 client: httpx.Client | None = None) -> tuple[list[DocRef], list[str]]:
    """Resolve + download + store the primary documents for a symbol.
    Returns (documents now available, gaps). `gaps` are human-readable notes for missing material, never filled in."""
    symbol = symbol.strip().upper()
    html, _cons = screener.fetch_page(symbol)
    refs = pick_documents(screener.parse_documents(html), symbol, n_concalls, with_annual_report)
    gaps: list[str] = []
    if sum(r.kind == "concall" for r in refs) < n_concalls:
        gaps.append(f"Only {sum(r.kind == 'concall' for r in refs)} earnings-call transcripts found (wanted {n_concalls})")
    have = {d["doc_id"] for d in stored_docs(symbol)}
    ok: list[DocRef] = []
    for ref in refs:
        if ref.doc_id in have and load_pages(ref.doc_id):
            ok.append(ref)
            continue
        try:
            pages = extract_pages(download(ref.url, client))
        except LoaderError as e:
            gaps.append(f"{ref.period} {ref.kind.replace('_', ' ')} could not be downloaded ({e})")
            continue
        if sum(len(p) for p in pages) < 500:
            gaps.append(f"{ref.period} {ref.kind.replace('_', ' ')} has no extractable text (scanned PDF?)")
            continue
        store(ref, pages)
        ok.append(ref)
    return ok, gaps
