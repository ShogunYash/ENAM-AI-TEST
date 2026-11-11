"""FINN API. Currently MOCK MODE: every route serves docs/examples/*.json.

Real implementations replace the bodies route by route (plan tasks A4–C6); signatures and
response models are the contract and must not change shape (see docs/CONTRACT.md).
Run from backend/:  uv run uvicorn app.main:app --reload
"""
from __future__ import annotations

import json
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app import models as m

EXAMPLES = Path(__file__).resolve().parents[2] / "docs" / "examples"

app = FastAPI(title="FINN API", version="0.1.0",
              description="Mobile-first financial investment agent. Contract: docs/CONTRACT.md")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET", "POST"], allow_headers=["*"])


@lru_cache
def example(name: str) -> Any:
    path = EXAMPLES / f"{name}.json"
    if not path.exists():
        raise HTTPException(404, f"no example {name}")
    return json.loads(path.read_text("utf-8"))


@app.get("/health", response_model=m.Health)
def health() -> Any:
    return example("health")


@app.get("/companies", response_model=list[m.Company])
def companies() -> Any:
    return example("companies")


@app.get("/prices", response_model=list[m.PriceSnapshot])
def prices() -> Any:
    return example("prices")


@app.get("/digest", response_model=m.Digest)
def digest(
    window: m.WindowLabel = "24h",
    start: datetime | None = Query(None, description="Required when window=custom"),
    end: datetime | None = Query(None, description="Required when window=custom"),
    volume_multiple: float = 2.0,
    price_move_pct: float = 5.0,
    interests: str | None = Query(None, description="Comma-separated Category values to boost"),
    muted: str | None = Query(None, description="Comma-separated Category values to hide"),
) -> Any:
    if window == "custom" and (start is None or end is None):
        raise HTTPException(422, "start and end are required for window=custom")
    return example("digest-3d" if window in ("3d", "7d", "custom") else "digest-24h")


@app.get("/filings/{filing_id}", response_model=m.Filing)
def filing(filing_id: str) -> Any:
    for name in ("filing-results", "filing-management", "filing-oneliner"):
        if example(name)["id"] == filing_id:
            return example(name)
    raise HTTPException(404, "filing not found")


@app.get("/alerts", response_model=list[m.Alert])
def alerts(volume_multiple: float = 2.0, price_move_pct: float = 5.0) -> Any:
    return example("alerts")


@app.get("/research/{symbol}", response_model=m.Research)
def research(symbol: str) -> Any:
    return example("research-INFY") if symbol.upper() == "INFY" else {**example("research-building"),
                                                                    "symbol": symbol.upper()}


@app.get("/stats/llm", response_model=m.LlmStats)
def stats() -> Any:
    return example("stats")


@app.get("/debug/sources", response_model=m.SourcesReport)
def debug_sources() -> Any:
    return example("debug-sources")


@app.post("/ask", response_model=m.AskResponse)
def ask(req: m.AskRequest) -> Any:
    return example("ask")
