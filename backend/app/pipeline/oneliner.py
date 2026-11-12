"""One-line 'so what' for filings that matter (needs_you / also_material) and have no richer card.

Results and management changes already get a deterministic line from their cards (results.so_what, mgmt_bio.so_what).
Everything else (fund raise, M&A, rating, litigation, ...) goes through the cheap T1 prompt `so_what`: headline + the
filing's first 2 pages -> one line <= 70 chars. Grounding guard: every NUMBER in the line must appear in the filing text or
headline, so a figure can never be invented. Cached per filing; abstains (None) rather than guessing.
"""
from __future__ import annotations

import httpx

from app import models as m
from app.ingest import docs
from app.llm import run_task
from app.pipeline.mgmt_bio import filing_text
from app.pipeline.results import load_enrichments, save_enrichment
from app.research.verify import numbers

MAX_LEN = 70


def build_input(headline: str, subcategory: str, text: str) -> str:
    return f"headline: {headline}\nsubcategory: {subcategory}\n\nfiling pages:\n{text}"


def check_line(line: str, headline: str, text: str) -> str | None:
    """Accept the model's line only if it is non-empty, short enough, and every figure in it appears in the source."""
    line = (line or "").strip()
    if not line or len(line) > MAX_LEN:
        return None
    return line if numbers(line) <= numbers(f"{headline}\n{text}") else None


def enrich_oneliner(filing_id: str, symbol: str, pdf_name: str, headline: str, subcategory: str,
                    client: httpx.Client | None = None, force: bool = False, cache_only: bool = False) -> str | None:
    have = load_enrichments([filing_id]).get(filing_id)
    if have is not None and not force:
        return have.text if isinstance(have, m.OneLiner) else None      # results/management cards keep their own line
    text = filing_text(docs.get_pdf(pdf_name, client))
    out = run_task("so_what", {"filing": build_input(headline, subcategory, text)}, feature="push.oneliner",
                   unit=symbol, cache_key_extra=filing_id, cache_only=cache_only)
    line = check_line(out.so_what, headline, text)
    if line:
        save_enrichment(filing_id, m.OneLiner(text=line))
    return line
