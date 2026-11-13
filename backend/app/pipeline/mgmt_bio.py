"""B4: management-change filing -> BioCard (who joined/left, role, effective date, up to 3 background lines).

Source order (primary first, per the brief's "push-side enrichment is fine" allowance):
  1. the filing's own text (first 2 pages of the PDF)  -> background_source "filing"
  2. optional `web_context` (search snippets, supplied by the caller)  -> "web" (not used unless the caller provides it)
  3. nothing  -> background [], "none"   (we never fill biography from model memory)

Two deterministic checks on top of the model (it is never trusted):
  - the person's name must appear in the filing text (a hallucinated name is rejected)
  - every NUMBER in a background line must appear in the filing text ("21 years" cannot be invented)
"""
from __future__ import annotations

import re
from datetime import datetime, timedelta

import httpx

from app import db
from app import models as m
from app.ingest import bse, docs
from app.llm import run_task
from app.pipeline.results import save_enrichment
from app.research.verify import norm, numbers
from app.signals.eod import IST

PAGES = 2
# A background line must describe the PERSON's career. These are the model's usual lapses: restating the event, giving the
# departure reason, process words. (ChatGPT's prompt forbids all of them; the local model still does it ~1 in 3.)
_NOT_BACKGROUND = re.compile(
    r"\b(retir\w*|resign\w*|relinquish\w*|appointed|re-?appointment|assumed charge|assumes charge|takes? over|"
    r"effective|annexure|attached|enclosed|commitments?|engagements?|personal reasons?|reason|cease[ds]?|"
    r"tenure|approved|valuable|guidance|withdraw\w*|nominat\w*|continues?|\bterm\b|starting|cessation)\b", re.IGNORECASE)
_TITLES = re.compile(r"\b(mr|ms|mrs|dr|shri|smt|prof|ca|cs|justice|lt|gen|col)\b\.?", re.IGNORECASE)


def filing_text(pdf: bytes, pages: int = PAGES) -> str:
    import pymupdf

    doc = pymupdf.open(stream=pdf, filetype="pdf")
    return "\n\n".join(f"[page {i + 1}]\n{doc[i].get_text().strip()}" for i in range(min(pages, len(doc))))


def build_input(headline: str, subcategory: str, text: str, web_context: str = "") -> str:
    out = f"headline: {headline}\nsubcategory: {subcategory}\n\nfiling pages:\n{text}"
    return out + (f"\n\nweb_context:\n{web_context}" if web_context else "\n\nweb_context: (none)")


def name_in_text(person: str, text: str) -> bool:
    """Every name part of 2+ letters (after stripping titles/initials) must appear in the filing text."""
    parts = [p for p in re.split(r"[\s.,]+", _TITLES.sub(" ", person)) if len(p) > 1]
    hay = norm(text)
    return bool(parts) and all(norm(p) in hay for p in parts)


def check_bio(bio, text: str) -> m.BioCard | None:
    """Validate the model output against the filing text. None = reject (nothing is shown rather than a wrong bio)."""
    if not name_in_text(bio.person, text):
        return None
    background = []
    for line in bio.background:
        if (bio.background_source == "filing" and numbers(line) <= numbers(text) and len(line) <= 90
                and not _NOT_BACKGROUND.search(line)):
            background.append(line)
    source = bio.background_source if background else "none"
    return m.BioCard(person=bio.person.strip(), role=bio.role.strip(), change=bio.change, effective=bio.effective,
                     background=background[:3], background_source=source,
                     links=[] if source != "web" else bio.links)


def so_what(card: m.BioCard) -> str | None:
    """Deterministic one-liner <= 70 chars (never truncated mid-word): 'Anup Bagchi appointed as MD and CEO from 27 Oct'.
    'appointed' covers re-appointments too, so it never says 'joins'."""
    verb = {"appointed": "appointed as", "resigned": "resigns as", "retired": "retires as"}[card.change]
    role = card.role
    when = f" from {datetime.fromisoformat(card.effective):%d %b}" if card.effective else ""
    short_role = re.sub(r"\bManaging Director\b", "MD", re.sub(r"\bChief Executive Officer\b", "CEO", role))
    short_role = re.sub(r"\bChief Financial Officer\b", "CFO", short_role)
    for w in (when, ""):                 # the date is worth more than the full title: try 'MD and CEO from 27 Oct' first
        for r in (role, short_role):
            line = f"{card.person} {verb} {r}{w}"
            if len(line) <= 70:
                return line
    return None


def enrich_management(filing_id: str, symbol: str, pdf_name: str, headline: str, subcategory: str,
                      web_context: str = "", client: httpx.Client | None = None, force: bool = False,
                      cache_only: bool = False) -> m.BioCard | None:
    from app.pipeline.results import load_enrichments

    have = load_enrichments([filing_id]).get(filing_id)
    if have is not None and not force:
        return have if isinstance(have, m.BioCard) else None
    text = filing_text(docs.get_pdf(pdf_name, client))
    bio = run_task("mgmt_bio", {"filing": build_input(headline, subcategory, text, web_context)},
                   feature="push.mgmt_bio", unit=symbol, cache_key_extra=filing_id, cache_only=cache_only)
    card = check_bio(bio, text)
    if card:
        save_enrichment(filing_id, card)
    return card


def age_of(filing_id: str) -> timedelta:
    with db.connect() as con:
        row = con.execute("SELECT filed_at FROM filings WHERE id=?", (filing_id,)).fetchone()
    return datetime.now(IST) - datetime.fromisoformat(row["filed_at"]) if row else timedelta(days=30)


_UNUSED = bse    # (bse is re-exported for callers that build source links)
