"""Contract tests: examples validate against models; mock API serves valid shapes; OpenAPI is current."""
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from pydantic import TypeAdapter

from app import models as m
from app.main import app

ROOT = Path(__file__).resolve().parents[2]
EX = ROOT / "docs" / "examples"

SCHEMAS = {
    "companies": list[m.Company],
    "prices": list[m.PriceSnapshot],
    "digest-24h": m.Digest,
    "digest-3d": m.Digest,
    "filing-results": m.Filing,
    "filing-management": m.Filing,
    "filing-oneliner": m.Filing,
    "alerts": list[m.Alert],
    "settings": m.Settings,
    "research-INFY": m.Research,
    "research-building": m.Research,
    "stats": m.LlmStats,
    "health": m.Health,
    "debug-sources": m.SourcesReport,
    "meta": m.SnapshotMeta,
    "ask": m.AskResponse,
}


def test_every_example_has_a_schema():
    assert {p.stem for p in EX.glob("*.json")} == set(SCHEMAS)


@pytest.mark.parametrize("name", sorted(SCHEMAS))
def test_example_validates(name):
    TypeAdapter(SCHEMAS[name]).validate_json((EX / f"{name}.json").read_text("utf-8"))


def test_category_enum_has_17_members():
    assert len(m.Category) == 17


def test_enrichment_discriminator():
    types = {json.loads((EX / f"filing-{k}.json").read_text("utf-8"))["enrichment"]["type"]
             for k in ("results", "management", "oneliner")}
    assert types == {"results", "management", "oneliner"}


client = TestClient(app)


@pytest.mark.parametrize("path", ["/health", "/companies", "/prices", "/digest", "/digest?window=3d",
                                  "/filings/ex-0001", "/alerts", "/research/INFY", "/research/dixon",
                                  "/stats/llm", "/debug/sources"])
def test_mock_routes(path):
    assert client.get(path).status_code == 200


def test_custom_window_requires_bounds():
    assert client.get("/digest?window=custom").status_code == 422


def test_openapi_is_current():
    committed = json.loads((ROOT / "docs" / "openapi.json").read_text("utf-8"))
    assert committed == json.loads(json.dumps(app.openapi())), "run: uv run python -m scripts.export_openapi"


def test_health_reports_mock_mode_when_database_is_empty():
    """Hermetic env has an empty DB -> the API must admit it is serving fixtures (UI must not say LIVE)."""
    body = client.get("/health").json()
    assert body["mode"] == "mock"
    assert m.Health.model_validate(body).mode == "mock"
