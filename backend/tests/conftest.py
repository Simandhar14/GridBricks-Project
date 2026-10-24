"""Shared pytest fixtures for the GridBricks backend test suite.

All fixtures use tiny in-memory DataFrames or JSON files – NO network calls.
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

import pandas as pd
import pytest

FIXTURES_DIR = Path(__file__).parent / "fixtures"


# ── Raw JSON fixtures ──────────────────────────────────────────────────────────


@pytest.fixture()
def fuelhh_raw() -> list[dict]:
    """Raw JSON records shaped like the FUELHH API response."""
    with (FIXTURES_DIR / "fuelhh_sample.json").open() as f:
        return json.load(f)


@pytest.fixture()
def windfor_raw() -> list[dict]:
    """Raw JSON records shaped like the WINDFOR API response."""
    with (FIXTURES_DIR / "windfor_sample.json").open() as f:
        return json.load(f)


# ── Clean DataFrame fixtures ───────────────────────────────────────────────────


def _utc(iso: str) -> datetime:
    return datetime.fromisoformat(iso.replace("Z", "+00:00"))


@pytest.fixture()
def actuals_df() -> pd.DataFrame:
    """Small clean actuals DataFrame (post-deduplication, WIND-only).

    Represents a partial day: settlement periods 1 & 2 on 2026-01-01.
    """
    rows = [
        {
            "publish_time": pd.Timestamp("2026-01-02T10:00:00Z", tz="UTC"),
            "start_time": pd.Timestamp("2026-01-01T00:00:00Z", tz="UTC"),
            "settlement_date": "2026-01-01",
            "settlement_period": 1,
            "fuel_type": "WIND",
            "generation": 4200.0,
        },
        {
            "publish_time": pd.Timestamp("2026-01-02T10:00:00Z", tz="UTC"),
            "start_time": pd.Timestamp("2026-01-01T00:30:00Z", tz="UTC"),
            "settlement_date": "2026-01-01",
            "settlement_period": 2,
            "fuel_type": "WIND",
            "generation": 4350.0,
        },
        {
            "publish_time": pd.Timestamp("2026-01-02T10:00:00Z", tz="UTC"),
            "start_time": pd.Timestamp("2026-01-01T01:00:00Z", tz="UTC"),
            "settlement_date": "2026-01-01",
            "settlement_period": 3,
            "fuel_type": "WIND",
            "generation": 4100.0,
        },
    ]
    df = pd.DataFrame(rows)
    df["publish_time"] = pd.to_datetime(df["publish_time"], utc=True)
    df["start_time"] = pd.to_datetime(df["start_time"], utc=True)
    return df


@pytest.fixture()
def forecasts_df() -> pd.DataFrame:
    """Small multi-vintage forecast DataFrame for 2026-01-01 00:00 UTC.

    Vintages:
      - 2025-12-31T06:00Z  → generation 4100 (published 18h before cutoff)
      - 2025-12-31T12:00Z  → generation 4150 (published 21h before cutoff, latest before cutoff)
      - 2026-01-01T09:00Z  → generation 4200 (published exactly at cutoff)
      - 2026-01-01T09:00:01Z → generation 4210 (published 1 second AFTER cutoff – must be excluded)
    """
    rows = [
        {
            "publish_time": pd.Timestamp("2025-12-31T06:00:00Z", tz="UTC"),
            "start_time": pd.Timestamp("2026-01-01T00:00:00Z", tz="UTC"),
            "generation": 4100.0,
        },
        {
            "publish_time": pd.Timestamp("2025-12-31T12:00:00Z", tz="UTC"),
            "start_time": pd.Timestamp("2026-01-01T00:00:00Z", tz="UTC"),
            "generation": 4150.0,
        },
        {
            "publish_time": pd.Timestamp("2026-01-01T09:00:00Z", tz="UTC"),
            "start_time": pd.Timestamp("2026-01-01T00:00:00Z", tz="UTC"),
            "generation": 4200.0,
        },
        {
            "publish_time": pd.Timestamp("2026-01-01T09:00:01Z", tz="UTC"),
            "start_time": pd.Timestamp("2026-01-01T00:00:00Z", tz="UTC"),
            "generation": 4210.0,
        },
        # second half-hour
        {
            "publish_time": pd.Timestamp("2025-12-31T06:00:00Z", tz="UTC"),
            "start_time": pd.Timestamp("2026-01-01T00:30:00Z", tz="UTC"),
            "generation": 4250.0,
        },
        {
            "publish_time": pd.Timestamp("2026-01-01T09:00:00Z", tz="UTC"),
            "start_time": pd.Timestamp("2026-01-01T00:30:00Z", tz="UTC"),
            "generation": 4300.0,
        },
        # third half-hour – NO forecast before cutoff (first publish is after cutoff)
        {
            "publish_time": pd.Timestamp("2026-01-01T10:00:00Z", tz="UTC"),
            "start_time": pd.Timestamp("2026-01-01T01:00:00Z", tz="UTC"),
            "generation": 4050.0,
        },
    ]
    df = pd.DataFrame(rows)
    df["publish_time"] = pd.to_datetime(df["publish_time"], utc=True)
    df["start_time"] = pd.to_datetime(df["start_time"], utc=True)
    return df
