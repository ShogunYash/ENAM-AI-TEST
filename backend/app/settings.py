"""Runtime settings from environment / .env (never commit .env)."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_DIR.parent


class AppSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(REPO_ROOT / ".env"), str(BACKEND_DIR / ".env")), extra="ignore"
    )

    gemini_api_key: str | None = None
    groq_api_key: str | None = None
    openrouter_api_key: str | None = None

    finn_data_dir: Path = Field(default=BACKEND_DIR / "data")
    finn_llm_config: Path = Field(default=BACKEND_DIR / "config" / "models.yaml")

    def api_key(self, provider_key: str) -> str | None:
        return getattr(self, f"{provider_key}_api_key", None) or None

    @property
    def llm_db_path(self) -> Path:
        p = self.finn_data_dir / "cache" / "llm.sqlite"
        p.parent.mkdir(parents=True, exist_ok=True)
        return p


@lru_cache
def get_settings() -> AppSettings:
    return AppSettings()
