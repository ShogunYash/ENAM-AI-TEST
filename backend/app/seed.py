"""Boot-time seeding: if the data dir has no database (fresh container on Render's ephemeral disk), restore the committed
demo seed (backend/seed/*.sqlite, produced by scripts/export_seed.py). Never overwrites existing data."""
from __future__ import annotations

import shutil

from app.settings import BACKEND_DIR, get_settings

SEED = BACKEND_DIR / "seed"


def ensure_seed() -> list[str]:
    s = get_settings()
    restored: list[str] = []
    if not s.finn_seed:
        return restored
    for name, dest in (("finn.sqlite", s.finn_data_dir / "finn.sqlite"), ("llm.sqlite", s.llm_db_path)):
        src = SEED / name
        if src.exists() and not dest.exists():
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dest)
            restored.append(name)
    return restored
