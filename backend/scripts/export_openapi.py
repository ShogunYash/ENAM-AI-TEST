"""Write docs/openapi.json from the FastAPI app (frontend generates TS types from it).

Run from backend/:  uv run python -m scripts.export_openapi
Frontend:           npx openapi-typescript ../docs/openapi.json -o src/api/schema.d.ts
"""
import json
from pathlib import Path

from app.main import app

OUT = Path(__file__).resolve().parents[2] / "docs" / "openapi.json"

if __name__ == "__main__":
    OUT.write_text(json.dumps(app.openapi(), indent=2, ensure_ascii=False) + "\n", "utf-8")
    print(f"wrote {OUT}")
