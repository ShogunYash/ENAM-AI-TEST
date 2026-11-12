"""Server-side quote verification: the rule that makes FINN's research trustworthy.

Every claim shown to the user carries a verbatim quote from a primary document. The model is asked to copy it; we do not
believe it. A quote is VERIFIED only if it fuzzy-matches the text of the cited page (or an adjacent page, since models
sometimes cite page N for text that sits on N+1) AND every number in it appears on that page. Anything else is dropped and counted (`grounding_dropped` in the ledger).
"""
from __future__ import annotations

import re

from rapidfuzz import fuzz

THRESHOLD = 90   # partial_ratio on normalised text; paraphrases and invented quotes score far lower
_NUM = re.compile(r"\d[\d,]*(?:\.\d+)?%?")


def norm(s: str) -> str:
    s = (s or "").lower()
    s = re.sub(r"(\w)-\s*\n\s*(\w)", r"\1\2", s)                       # hyphenation across line breaks
    s = s.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    s = s.replace("–", "-").replace("—", "-").replace(" ", " ")
    s = re.sub(r"[\"'`]", "", s)                                         # quote-mark differences never matter
    return re.sub(r"\s+", " ", s).strip()


def numbers(s: str) -> set[str]:
    return {n.rstrip(",") for n in _NUM.findall(s)}


def verify_quote(quote: str, pages: list[str], page: int, threshold: int = THRESHOLD) -> int | None:
    """-> the 1-based page the quote was found on (cited page first, then +-1), or None if it can't be verified."""
    q = norm(quote)
    if len(q) < 12:                                  # too short to be evidence
        return None
    for p in (page, page + 1, page - 1):
        if 1 <= p <= len(pages):
            text = norm(pages[p - 1])
            # Wording may differ slightly (fuzzy), NUMBERS may not: a quote with the right words but a changed figure
            # ("20% to 22%" -> "25% to 28%") still scores ~97 on fuzzy match, so every figure must appear on the page.
            if (q in text or fuzz.partial_ratio(q, text) >= threshold) and numbers(q) <= numbers(text):
                return p
    return None
