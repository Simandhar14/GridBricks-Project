"""Tests for backend/scripts/fetch_data.py.

All network calls are mocked with respx – no real HTTP requests are made.
"""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

import httpx
import pandas as pd
import pytest
import respx
from backend.scripts.fetch_data import (
    FUELHH_ENDPOINT,
    WINDFOR_ENDPOINT,
    ActualRecord,
    ForecastRecord,
    _expected_half_hours,
    _fetch_with_retry,
    build_quality_report,
    fetch_actuals,
    fetch_forecasts,
    save_snapshot,
    snapshot_exists,
)

# ── ActualRecord validation ───────────────────────────────────────────────────


class TestActualRecordValidation:
    def test_valid_row(self) -> None:
        row = {
            "publishTime": "2026-01-02T10:00:00Z",
            "startTime": "2026-01-01T00:00:00Z",
            "settlementDate": "2026-01-01",
            "settlementPeriod": 1,
            "fuelType": "WIND",
            "generation": 4200.0,
        }
        rec = ActualRecord.model_validate(row)
        assert rec.generation == 4200.0
        assert rec.publishTime.tzinfo is not None

    def test_rejects_null_generation(self) -> None:
        from pydantic import ValidationError

        row = {
            "publishTime": "2026-01-02T10:00:00Z",
            "startTime": "2026-01-01T00:00:00Z",
            "settlementDate": "2026-01-01",
            "settlementPeriod": 1,
            "fuelType": "WIND",
            "generation": None,
        }
        with pytest.raises(ValidationError):
            ActualRecord.model_validate(row)

    def test_rejects_missing_fields(self) -> None:
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            ActualRecord.model_validate({"publishTime": "2026-01-02T10:00:00Z"})

    def test_naive_datetime_gets_utc(self) -> None:
        row = {
            "publishTime": "2026-01-02T10:00:00",
            "startTime": "2026-01-01T00:00:00",
            "settlementDate": "2026-01-01",
            "settlementPeriod": 1,
            "fuelType": "WIND",
            "generation": 100.0,
        }
        rec = ActualRecord.model_validate(row)
        assert rec.publishTime.tzinfo is not None
        assert rec.startTime.tzinfo is not None


# ── ForecastRecord validation ─────────────────────────────────────────────────


class TestForecastRecordValidation:
    def test_valid_row(self) -> None:
        row = {
            "publishTime": "2025-12-31T06:00:00Z",
            "startTime": "2026-01-01T00:00:00Z",
            "generation": 4100.0,
        }
        rec = ForecastRecord.model_validate(row)
        assert rec.generation == 4100.0

    def test_rejects_inf(self) -> None:
        import math

        from pydantic import ValidationError

        row = {
            "publishTime": "2025-12-31T06:00:00Z",
            "startTime": "2026-01-01T00:00:00Z",
            "generation": math.inf,
        }
        with pytest.raises(ValidationError):
            ForecastRecord.model_validate(row)


# ── fetch_actuals (mocked) ────────────────────────────────────────────────────


class TestFetchActuals:
    @respx.mock
    def test_basic_fetch_and_dedup(self, fuelhh_raw: list[dict]) -> None:
        """fetch_actuals should deduplicate on startTime (keep latest publishTime)
        and filter out non-WIND rows."""
        respx.get(FUELHH_ENDPOINT).mock(return_value=httpx.Response(200, json=fuelhh_raw))
        with httpx.Client() as client:
            df = fetch_actuals(client)

        # Should have WIND rows only
        assert (df["fuel_type"] == "WIND").all()

        # Row with startTime 2026-01-01T00:00:00Z had two publishTimes;
        # the later one (10:00) should be kept with generation=4200
        sp1 = df[df["start_time"] == pd.Timestamp("2026-01-01T00:00:00Z", tz="UTC")]
        assert len(sp1) == 1
        assert sp1.iloc[0]["generation"] == 4200.0

    @respx.mock
    def test_null_generation_rejected(self, fuelhh_raw: list[dict]) -> None:
        """Rows with null generation are rejected by Pydantic and not included."""
        respx.get(FUELHH_ENDPOINT).mock(return_value=httpx.Response(200, json=fuelhh_raw))
        with httpx.Client() as client:
            df = fetch_actuals(client)

        # The null row (startTime 02:00) should be absent
        assert pd.Timestamp("2026-01-01T02:00:00Z", tz="UTC") not in df["start_time"].values

    @respx.mock
    def test_non_wind_rows_excluded(self, fuelhh_raw: list[dict]) -> None:
        """COAL rows in the fixture must be excluded."""
        respx.get(FUELHH_ENDPOINT).mock(return_value=httpx.Response(200, json=fuelhh_raw))
        with httpx.Client() as client:
            df = fetch_actuals(client)

        assert "COAL" not in df["fuel_type"].values

    @respx.mock
    def test_timestamps_are_utc_aware(self, fuelhh_raw: list[dict]) -> None:
        respx.get(FUELHH_ENDPOINT).mock(return_value=httpx.Response(200, json=fuelhh_raw))
        with httpx.Client() as client:
            df = fetch_actuals(client)

        assert df["publish_time"].dt.tz is not None
        assert df["start_time"].dt.tz is not None


# ── fetch_forecasts (mocked) ──────────────────────────────────────────────────


class TestFetchForecasts:
    @respx.mock
    def test_post_filters_to_jan_2026(self, windfor_raw: list[dict]) -> None:
        """startTimes outside Jan 2026 must be excluded after download."""
        respx.get(WINDFOR_ENDPOINT).mock(return_value=httpx.Response(200, json=windfor_raw))
        with httpx.Client() as client:
            df = fetch_forecasts(client)

        # The Dec 2025 startTime row must be absent
        assert (df["start_time"] >= pd.Timestamp("2026-01-01", tz="UTC")).all()
        assert (df["start_time"] < pd.Timestamp("2026-02-01", tz="UTC")).all()

    @respx.mock
    def test_dedup_exact_pairs_only(self, windfor_raw: list[dict]) -> None:
        """Only exact (publishTime, startTime) duplicates are dropped."""
        respx.get(WINDFOR_ENDPOINT).mock(return_value=httpx.Response(200, json=windfor_raw))
        with httpx.Client() as client:
            df = fetch_forecasts(client)

        # The fixture has an exact duplicate for (2025-12-31T06, 00:30);
        # after dedup that pair should appear exactly once
        dup_pub = pd.Timestamp("2025-12-31T06:00:00Z", tz="UTC")
        dup_start = pd.Timestamp("2026-01-01T00:30:00Z", tz="UTC")
        mask = (df["publish_time"] == dup_pub) & (df["start_time"] == dup_start)
        assert mask.sum() == 1

    @respx.mock
    def test_multiple_vintages_kept(self, windfor_raw: list[dict]) -> None:
        """Different publishTimes for the same startTime are all retained."""
        respx.get(WINDFOR_ENDPOINT).mock(return_value=httpx.Response(200, json=windfor_raw))
        with httpx.Client() as client:
            df = fetch_forecasts(client)

        # startTime 00:00 has 4 vintages in the fixture (after dedup, still 4)
        count = (df["start_time"] == pd.Timestamp("2026-01-01T00:00:00Z", tz="UTC")).sum()
        assert count == 5  # the fixture has 5 unique (publishTime, startTime) for 00:00

    @respx.mock
    def test_timestamps_are_utc_aware(self, windfor_raw: list[dict]) -> None:
        respx.get(WINDFOR_ENDPOINT).mock(return_value=httpx.Response(200, json=windfor_raw))
        with httpx.Client() as client:
            df = fetch_forecasts(client)

        assert df["publish_time"].dt.tz is not None
        assert df["start_time"].dt.tz is not None


# ── retry logic ───────────────────────────────────────────────────────────────


class TestRetryLogic:
    @respx.mock
    def test_retries_on_500(self) -> None:
        """_fetch_with_retry should retry on 500 and succeed on the third attempt."""
        route = respx.get(FUELHH_ENDPOINT)
        route.side_effect = [
            httpx.Response(500, json={"error": "server error"}),
            httpx.Response(500, json={"error": "server error"}),
            httpx.Response(200, json=[]),
        ]
        with httpx.Client() as client:
            result = _fetch_with_retry(client, FUELHH_ENDPOINT, {}, max_retries=3, timeout=5.0)
        assert result == []

    @respx.mock
    def test_raises_on_400(self) -> None:
        """A 400 response is not retried – it's raised immediately."""
        respx.get(FUELHH_ENDPOINT).mock(
            return_value=httpx.Response(400, json={"error": "bad request"})
        )
        with httpx.Client() as client:
            with pytest.raises(httpx.HTTPStatusError):
                _fetch_with_retry(client, FUELHH_ENDPOINT, {}, max_retries=3, timeout=5.0)

    @respx.mock
    def test_raises_json_array_error(self) -> None:
        """A response that is not a JSON array raises RuntimeError."""
        respx.get(FUELHH_ENDPOINT).mock(return_value=httpx.Response(200, json={"data": []}))
        with httpx.Client() as client:
            with pytest.raises(RuntimeError, match="Expected a JSON array"):
                _fetch_with_retry(client, FUELHH_ENDPOINT, {}, max_retries=1, timeout=5.0)


# ── Quality report ────────────────────────────────────────────────────────────


class TestQualityReport:
    def test_expected_half_hours_count(self) -> None:
        expected = _expected_half_hours()
        assert len(expected) == 48 * 31  # 1488

    def test_report_detects_missing_half_hours(
        self, actuals_df: pd.DataFrame, forecasts_df: pd.DataFrame
    ) -> None:
        """Quality report should flag missing half-hours (fixture only has 3 of 1488)."""
        report = build_quality_report(actuals_df, forecasts_df)
        assert report["actuals"]["missing_half_hours_count"] == 1488 - 3

    def test_report_detects_negative_actuals(self) -> None:
        """Negative generation values are counted correctly."""
        rows = [
            {
                "publish_time": pd.Timestamp("2026-01-02T10:00:00Z", tz="UTC"),
                "start_time": pd.Timestamp("2026-01-01T00:00:00Z", tz="UTC"),
                "settlement_date": "2026-01-01",
                "settlement_period": 1,
                "fuel_type": "WIND",
                "generation": -50.0,
            }
        ]
        df = pd.DataFrame(rows)
        df["publish_time"] = pd.to_datetime(df["publish_time"], utc=True)
        df["start_time"] = pd.to_datetime(df["start_time"], utc=True)
        report = build_quality_report(df, pd.DataFrame())
        assert report["actuals"]["negative_generation_rows"] == 1


# ── Snapshot helpers ──────────────────────────────────────────────────────────


class TestSnapshotHelpers:
    def test_save_and_exists(self, actuals_df: pd.DataFrame, forecasts_df: pd.DataFrame) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            data_dir = Path(tmp)
            assert not snapshot_exists(data_dir)

            report = build_quality_report(actuals_df, forecasts_df)
            save_snapshot(actuals_df, forecasts_df, report, data_dir)

            assert snapshot_exists(data_dir)
            # Check Parquet is readable
            loaded = pd.read_parquet(data_dir / "actuals_wind_2026-01.parquet")
            assert len(loaded) == len(actuals_df)

    def test_meta_json_structure(
        self, actuals_df: pd.DataFrame, forecasts_df: pd.DataFrame
    ) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            data_dir = Path(tmp)
            report = build_quality_report(actuals_df, forecasts_df)
            save_snapshot(actuals_df, forecasts_df, report, data_dir)

            with (data_dir / "snapshot_meta.json").open() as f:
                meta = json.load(f)

            assert "fetch_time_utc" in meta
            assert meta["row_counts"]["actuals"] == len(actuals_df)
            assert meta["row_counts"]["forecasts"] == len(forecasts_df)
            assert "endpoints" in meta
            assert "quality" in meta
