"""Download + cache filing PDFs (BSE attachments). Documents are immutable, so the disk cache never expires.

Cache: <data_dir>/raw/pdf/<ATTACHMENTNAME>. A cached file means no network call at all (cache-first rule).
"""
from __future__ import annotations

import httpx

from app.ingest import bse
from app.settings import get_settings

MAX_BYTES = 14 * 1024 * 1024      # Gemini's inline request limit is ~20 MB AFTER base64 (x4/3), so ~14 MB of raw PDF
SOFT_BYTES = 8 * 1024 * 1024      # prefer slices at most this big (faster, cheaper uploads)
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


def first_pages(pdf: bytes, n: int, downscale: bool = False) -> tuple[bytes, int]:
    """Keep the first `n` pages (page numbers stay valid) and return (pdf_bytes, total_pages).
    Results tables sit near the front; the rest is auditor's report / notes and only costs tokens.
    downscale=True first re-compresses embedded images (120 dpi, JPEG q65): enough to read printed tables, and it turns
    a 19 MB image-heavy results pack into ~7 MB."""
    import pymupdf

    src = pymupdf.open(stream=pdf, filetype="pdf")
    total = len(src)
    if total <= n and not downscale:
        return pdf, total
    # Copy into a FRESH document: Document.select() keeps document-level baggage (a 195-page Infosys pack stayed at
    # 29.7 MB for any single page; the fresh copy of its first 10 pages is 3 MB).
    out = pymupdf.open()
    out.insert_pdf(src, from_page=0, to_page=min(n, total) - 1)
    if downscale:
        out.rewrite_images(dpi_threshold=150, dpi_target=120, quality=65)
    return out.tobytes(garbage=4, deflate=True), total


def fit_for_inline(pdf: bytes, pages: tuple[int, ...] = (25, 15, 10, 6)) -> tuple[bytes, int]:
    """Best leading slice of the PDF that fits the inline limit -> (bytes, total_pages). Prefers 25 plain pages (exact
    pixels) when they are small; otherwise image-downscaled slices, fewer pages if needed. Page numbers never change."""
    piece, total = first_pages(pdf, pages[0])
    if len(piece) <= SOFT_BYTES:
        return piece, total
    for n in pages:
        piece, total = first_pages(pdf, n, downscale=True)
        if len(piece) <= MAX_BYTES:
            return piece, total
    raise DocError(f"even the first {pages[-1]} pages exceed {MAX_BYTES / 1e6:.0f} MB after image downscaling")
