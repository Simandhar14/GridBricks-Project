"""API integration tests using FastAPI TestClient and in-memory fixture datasets.

Zero network calls. Tests all endpoints, response models, and input validation errors.
"""

from __future__ import annotations

import pytest
from backend.app.data_loader import data_loader
from backend.app.main import app
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def setup_test_data(actuals_df, forecasts_df) -> None:
    """Inject test fixtures into data_loader before each test."""
    meta = {
        "fetch_time_utc": "2026-01-31T20:00:00Z",
        "row_counts": {"actuals": len(actuals_df), "forecasts": len(forecasts_df)},
    }
    data_loader.set_data(actuals_df, forecasts_df, meta)


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


# ── Health & Meta ─────────────────────────────────────────────────────────────


def test_health_endpoint(client: TestClient) -> None:
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "version" in data


def test_meta_endpoint(client: TestClient) -> None:
    res = client.get("/api/meta")
    assert res.status_code == 200
    data = res.json()
    assert len(data["available_dates"]) == 31
    assert data["available_dates"][0] == "2026-01-01"
    assert data["available_dates"][-1] == "2026-01-31"
    assert data["default_cutoff"] == "09:00"
    assert "09:00" in data["cutoff_options"]
    assert "data_quality" in data
    assert "actuals_coverage" in data


# ── Forecast Decision ─────────────────────────────────────────────────────────


def test_forecast_decision_endpoint(client: TestClient) -> None:
    res = client.get("/api/forecast/decision?date=2026-01-01&cutoff=09:00")
    assert res.status_code == 200
    data = res.json()
    assert data["date"] == "2026-01-01"
    assert data["cutoff_local"] == "09:00"
    assert len(data["half_hours"]) == 48
    assert "summary" in data
    assert data["summary"]["matched_half_hours"] >= 0


def test_forecast_decision_validation_out_of_bounds_date(client: TestClient) -> None:
    # February 2026 is outside allowed scope
    res = client.get("/api/forecast/decision?date=2026-02-01&cutoff=09:00")
    assert res.status_code == 400
    assert "out of bounds" in res.json()["detail"].lower()


def test_forecast_decision_validation_malformed_cutoff(client: TestClient) -> None:
    res = client.get("/api/forecast/decision?date=2026-01-05&cutoff=25:00")
    assert res.status_code == 400
    assert "out of 24-hour range" in res.json()["detail"].lower()


# ── Forecast Revisions ────────────────────────────────────────────────────────


def test_forecast_revisions_endpoint(client: TestClient) -> None:
    res = client.get("/api/forecast/revisions?date=2026-01-01&cutoff=09:00")
    assert res.status_code == 200
    data = res.json()
    assert data["date"] == "2026-01-01"
    assert isinstance(data["vintages"], list)
    assert isinstance(data["actuals"], list)


# ── What-If Scenario Calculation ──────────────────────────────────────────────


def test_what_if_endpoint(client: TestClient) -> None:
    payload = {
        "expected_demand_mw": 25000.0,
        "forecast_wind_mw": 12000.0,
        "lower_wind_bound_mw": 10000.0,
    }
    res = client.post("/api/forecast/what-if", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["procurement_baseline_mw"] == 13000.0
    assert data["procurement_conservative_mw"] == 15000.0
    assert data["recommended_buffer_mw"] == 2000.0
    assert "user input" in data["disclaimer"].lower()


def test_what_if_validation_negative_demand(client: TestClient) -> None:
    payload = {
        "expected_demand_mw": -500.0,
        "forecast_wind_mw": 12000.0,
        "lower_wind_bound_mw": 10000.0,
    }
    res = client.post("/api/forecast/what-if", json=payload)
    assert res.status_code == 422


# ── Accuracy Endpoints ────────────────────────────────────────────────────────


def test_accuracy_summary_endpoint(client: TestClient) -> None:
    res = client.get("/api/accuracy/summary?start=2026-01-01&end=2026-01-31&cutoff=09:00")
    assert res.status_code == 200
    data = res.json()
    assert data["period"]["start"] == "2026-01-01"
    assert data["period"]["end"] == "2026-01-31"
    assert "mae_mw" in data
    assert "error_quantiles" in data


def test_accuracy_summary_invalid_range(client: TestClient) -> None:
    # start after end
    res = client.get("/api/accuracy/summary?start=2026-01-20&end=2026-01-10")
    assert res.status_code == 400
    assert "cannot be after" in res.json()["detail"].lower()


def test_accuracy_daily_endpoint(client: TestClient) -> None:
    res = client.get("/api/accuracy/daily?start=2026-01-01&end=2026-01-05&cutoff=09:00")
    assert res.status_code == 200
    data = res.json()
    assert len(data["days"]) == 5
    assert data["days"][0]["date"] == "2026-01-01"


def test_accuracy_by_hour_endpoint(client: TestClient) -> None:
    res = client.get("/api/accuracy/by-hour?start=2026-01-01&end=2026-01-31&cutoff=09:00")
    assert res.status_code == 200
    data = res.json()
    assert len(data["hours"]) == 24
    assert data["hours"][0]["hour_utc"] == 0
    assert data["hours"][23]["hour_utc"] == 23


def test_accuracy_by_horizon_endpoint(client: TestClient) -> None:
    res = client.get("/api/accuracy/by-horizon?start=2026-01-01&end=2026-01-31")
    assert res.status_code == 200
    data = res.json()
    assert len(data["buckets"]) == 6
    assert data["buckets"][0]["label"] == "0–6h"


def test_accuracy_error_distribution_endpoint(client: TestClient) -> None:
    res = client.get(
        "/api/accuracy/error-distribution?start=2026-01-01&end=2026-01-31&cutoff=09:00&bins=10"
    )
    assert res.status_code == 200
    data = res.json()
    assert "histogram" in data
    assert "quantiles" in data
