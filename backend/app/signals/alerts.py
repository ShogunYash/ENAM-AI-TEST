"""Triggered alerts from user thresholds. Pure functions.

Price/volume alerts use the latest EOD snapshot per stock. The frontend duplicates the two comparisons for offline
use (docs/CONTRACT.md: the one deliberate duplication) — keep them identical.
"""
from __future__ import annotations

from app import models as m
from app.models import AlertKind as K
from app.models import Category as C
from app.models import Priority as P


def _signed(x: float, suffix: str = "%") -> str:
    return f"{x:+.1f}{suffix}".replace("-", "−")


def price_alerts(snaps: list[m.PriceSnapshot], settings: m.Settings) -> list[m.Alert]:
    out: list[m.Alert] = []
    for s in snaps:
        day = s.as_of.date().isoformat()
        if s.vol_ratio >= settings.volume_multiple:
            out.append(m.Alert(id=f"vol-{s.symbol}-{day}", symbol=s.symbol, kind=K.volume_spike, triggered_at=s.as_of,
                               value=s.vol_ratio, threshold=settings.volume_multiple,
                               message=f"Volume {s.vol_ratio:.1f}× its {settings.volume_lookback_days}-day average",
                               filing_id=None))
        if abs(s.pct_1d) >= settings.price_move_pct:
            out.append(m.Alert(id=f"px-{s.symbol}-{day}", symbol=s.symbol, kind=K.price_move, triggered_at=s.as_of,
                               value=s.pct_1d, threshold=settings.price_move_pct,
                               message=f"{_signed(s.pct_1d)} on the day", filing_id=None))
    return out


def filing_alerts(filings: list[m.Filing], settings: m.Settings) -> list[m.Alert]:
    """A high-priority filing in a category the user cares about."""
    wanted = {C(c).value for c in settings.categories_of_interest}
    muted = {C(c).value for c in settings.muted_categories}
    out = []
    for f in filings:
        cat = C(f.category).value
        if f.priority == P.high.value and cat in wanted and cat not in muted:
            out.append(m.Alert(id=f"fl-{f.id}", symbol=f.symbol, kind=K.material_filing, triggered_at=f.filed_at,
                               value=f.score, threshold=7.0,
                               message=(f.so_what or f.headline)[:90], filing_id=f.id))
    return out
