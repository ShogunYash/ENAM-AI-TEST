"""Download + cache filing PDFs (BSE attachments). Documents are immutable, so the disk cache never expires.

Cache: <data_dir>/raw/pdf/<ATTACHMENTNAME>. A cached file means no network call at all (cache-first rule).
"""
from __future__ import annotations

import httpx

from app.ingest import bse
from app.settings import get_settings

MAX_BYTES = 18 * 1024 * 1024      # Gemini inline-data request limit is ~20 MB incl. base64 overhead (applies to what we SEND)
MAX_DOWNLOAD = 80 * 1024 * 1024   # what we are willing to download and cache


class DocError(RuntimeError):
    pass


def cache_path(name: str):
    p = get_settings().finn_data_dir / "raw" / "pdf"
    p.mkdir(parents=True, exist_ok=True)
    return p / name


def get_pdf(name: str, client: httpx.Client | None = None) -> bytes:
    """Return the PDF bytes for a BSE attachment name (AttachLive, then AttachHis)."""
    if not name:
        raise DocError("filing has no attachment")
    path = cache_path(name)
    if path.exists():
        return path.read_bytes()
    own = client is None
    client = client or httpx.Client(headers=bse.HEADERS, timeout=60, follow_redirects=True)
    try:
        for folder in bse.PDF_FOLDERS:
            r = client.get(bse.pdf_url(name, folder))
            if r.status_code == 200 and r.content[:4] == b"%PDF":
                if len(r.content) > MAX_DOWNLOAD:
                    raise DocError(f"{name}: {len(r.content) / 1e6:.1f} MB is too large to cache")
                path.write_bytes(r.content)
                return r.content
    finally:
        if own:
            client.close()
    raise DocError(f"{name}: not found under {' or '.join(bse.PDF_FOLDERS)}")


def first_pages(pdf: bytes, n: int) -> tuple[bytes, int]:
    """Keep the first `n` pages (page numbers stay valid) and return (pdf_bytes, total_pages).
    Results tables sit near the front; the rest is auditor's report / notes and only costs tokens."""
    import pymupdf

    doc = pymupdf.open(stream=pdf, filetype="pdf")
    total = len(doc)
    if total <= n:
        return pdf, total
    doc.select(list(range(n)))
    return doc.tobytes(garbage=3, deflate=True), total


def fit_for_inline(pdf: bytes, pages: tuple[int, ...] = (25, 15, 10, 6)) -> tuple[bytes, int]:
    """Largest leading slice of the PDF that fits the inline limit -> (bytes, total_pages). Results tables are near the
    front, so a slice of the first pages is enough; page numbers are unchanged."""
    total = 0
    for n in pages:
        piece, total = first_pages(pdf, n)
        if len(piece) <= MAX_BYTES:
            return piece, total
    raise DocError(f"even the first {pages[-1]} pages exceed {MAX_BYTES / 1e6:.0f} MB")
