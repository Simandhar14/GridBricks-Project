"""Unit tests for pure domain logic in backend/app/analytics.py.

Includes explicit tests for no look-ahead leakage, cutoff boundaries,
and exact metric calculations against hand-computed values.
"""

from __future__ import annotations

from datetime import UTC, date, datetime
from zoneinfo import ZoneInfo

import numpy as np
import pandas as pd
import pytest
from backend.app.analytics import (
    build_daily_decision_view,
    calculate_metrics,
    compute_horizon_accuracy,
    compute_what_if_procurement,
    filter_decision_forecasts,
    get_decision_cutoff_utc,
    get_forecast_revisions,
)

LONDON_TZ = ZoneInfo("Europe/London")


# ── Decision Cutoff & Timezone Tests ──────────────────────────────────────────


class TestDecisionCutoff:
    def test_cutoff_is_d_minus_1(self) -> None:
        """Cutoff for 2026-01-15 09:00 London must be 2026-01-14 09:00 UTC."""
        cutoff = get_decision_cutoff_utc("2026-01-15", "09:00")
        assert cutoff == datetime(2026, 1, 14, 9, 0, 0, tzinfo=UTC)

    def test_custom_cutoff_hour(self) -> None:
        cutoff_06 = get_decision_cutoff_utc(date(2026, 1, 10), "06:00")
        assert cutoff_06 == datetime(2026, 1, 9, 6, 0, 0, tzinfo=UTC)

        cutoff_12 = get_decision_cutoff_utc("2026-01-10", "12:00")
        assert cutoff_12 == datetime(2026, 1, 9, 12, 0, 0, tzinfo=UTC)

    def test_january_gmt_equals_utc(self) -> None:
        """Verify Europe/London in January has offset UTC+0."""
        dt_london = datetime(2026, 1, 14, 9, 0, tzinfo=LONDON_TZ)
        assert dt_london.utcoffset().total_seconds() == 0


# ── Strict Look-Ahead Leakage & Boundary Tests (L1 - L4) ──────────────────────


class TestNoLeakageInvariants:
    def test_l1_exact_cutoff_is_included(self) -> None:
        """L1: A forecast published EXACTLY at the cutoff is selected (<= is inclusive)."""
        target_start = pd.Timestamp("2026-01-02 00:00:00", tz="UTC")
        exact_cutoff = pd.Timestamp("2026-01-01 09:00:00", tz="UTC")

        df = pd.DataFrame(
            [
                {
                    "publish_time": pd.Timestamp("2026-01-01 06:00:00", tz="UTC"),
                    "start_time": target_start,
                    "generation": 3000.0,
                },
                {
                    "publish_time": exact_cutoff,  # exactly at cutoff
                    "start_time": target_start,
                    "generation": 3500.0,
                },
            ]
        )

        res = filter_decision_forecasts(df, "2026-01-02", "09:00")
        assert len(res) == 1
        assert res.iloc[0]["publish_time"] == exact_cutoff
        assert res.iloc[0]["generation"] == 3500.0

    def test_l2_one_second_after_cutoff_is_excluded(self) -> None:
        """L2: A forecast published 1 second after the cutoff MUST NEVER be selected."""
        target_start = pd.Timestamp("2026-01-02 00:00:00", tz="UTC")
        prior_pub = pd.Timestamp("2026-01-01 08:59:59", tz="UTC")
        leak_pub = pd.Timestamp("2026-01-01 09:00:01", tz="UTC")  # 1s after cutoff!

        df = pd.DataFrame(
            [
                {
                    "publish_time": prior_pub,
                    "start_time": target_start,
                    "generation": 4000.0,
                },
                {
                    "publish_time": leak_pub,
                    "start_time": target_start,
                    "generation": 4500.0,  # Look-ahead leakage!
                },
            ]
        )

        res = filter_decision_forecasts(df, "2026-01-02", "09:00")
        assert len(res) == 1
        assert res.iloc[0]["publish_time"] == prior_pub
        assert res.iloc[0]["generation"] == 4000.0  # Must select the prior one

    def test_l3_latest_before_cutoff_selected(self) -> None:
        """L3: When multiple vintages exist before cutoff, select the one with latest publishTime."""
        target_start = pd.Timestamp("2026-01-02 00:00:00", tz="UTC")
        df = pd.DataFrame(
            [
                {
                    "publish_time": pd.Timestamp("2026-01-01 02:00:00", tz="UTC"),
                    "start_time": target_start,
                    "generation": 1000.0,
                },
                {
                    "publish_time": pd.Timestamp("2026-01-01 05:00:00", tz="UTC"),
                    "start_time": target_start,
                    "generation": 1200.0,
                },
                {
                    "publish_time": pd.Timestamp("2026-01-01 08:30:00", tz="UTC"),
                    "start_time": target_start,
                    "generation": 1500.0,
                },
            ]
        )

        res = filter_decision_forecasts(df, "2026-01-02", "09:00")
        assert len(res) == 1
        assert res.iloc[0]["publish_time"] == pd.Timestamp("2026-01-01 08:30:00", tz="UTC")
        assert res.iloc[0]["generation"] == 1500.0

    def test_l4_no_forecast_before_cutoff_is_missing(self) -> None:
        """L4: When only forecasts after cutoff exist, no row returned (never fill or impute)."""
        target_start = pd.Timestamp("2026-01-02 00:00:00", tz="UTC")
        df = pd.DataFrame(
            [
                {
                    "publish_time": pd.Timestamp("2026-01-01 10:00:00", tz="UTC"),
                    "start_time": target_start,
                    "generation": 2000.0,
                },
                {
                    "publish_time": pd.Timestamp("2026-01-01 14:00:00", tz="UTC"),
                    "start_time": target_start,
                    "generation": 2100.0,
                },
            ]
        )

        res = filter_decision_forecasts(df, "2026-01-02", "09:00")
        assert res.empty

    def test_l6_horizon_hours_calculation(self) -> None:
        """L6: horizon_hours = (startTime - publishTime) in hours."""
        target_start = pd.Timestamp("2026-01-02 12:00:00", tz="UTC")
        pub = pd.Timestamp("2026-01-01 06:00:00", tz="UTC")  # 30 hours prior
        df = pd.DataFrame([{"publish_time": pub, "start_time": target_start, "generation": 5000.0}])

        res = filter_decision_forecasts(df, "2026-01-02", "09:00")
        assert len(res) == 1
        assert res.iloc[0]["horizon_hours"] == 30.0


# ── Metrics Calculations Against Hand-Computed Fixtures (L7 - L8) ─────────────


class TestMetricsCalculations:
    def test_hand_computed_metrics(self) -> None:
        """Validate MAE, RMSE, Bias, WAPE, Quantiles on exact numbers.

        Hand values:
        Forecasts: [100, 200, 300, 400]
        Actuals:   [110, 180, 280, 420]
        Errors (f - a):
        e1 = 100 - 110 = -10
        e2 = 200 - 180 = +20
        e3 = 300 - 280 = +20
        e4 = 400 - 420 = -20
        Errors: [-10, +20, +20, -20]
        Abs errors: [10, 20, 20, 20]

        MAE = (10 + 20 + 20 + 20) / 4 = 17.5
        MSE = (100 + 400 + 400 + 400) / 4 = 325.0
        RMSE = sqrt(325.0) ≈ 18.0277... -> 18.03
        Bias = (-10 + 20 + 20 - 20) / 4 = 10 / 4 = 2.5
        Sum(actual) = 110 + 180 + 280 + 420 = 990
        Sum(|err|) = 70
        WAPE = 70 / 990 * 100% ≈ 7.07%
        Max over = 20.0, Max under = -20.0
        """
        f = np.array([100.0, 200.0, 300.0, 400.0])
        a = np.array([110.0, 180.0, 280.0, 420.0])
        err = f - a

        m = calculate_metrics(err, a)
        assert m["n_points"] == 4
        assert m["mae_mw"] == 17.5
        assert m["rmse_mw"] == pytest.approx(18.03, abs=0.01)
        assert m["bias_mw"] == 2.5
        assert m["wape_pct"] == pytest.approx(7.07, abs=0.01)
        assert m["max_over_forecast_mw"] == 20.0
        assert m["max_under_forecast_mw"] == -20.0

    def test_l7_empty_or_zero_actuals_guard(self) -> None:
        """Guard against empty error array or actuals sum <= 0."""
        empty_m = calculate_metrics(np.array([]))
        assert empty_m["n_points"] == 0
        assert empty_m["mae_mw"] is None

        # Actuals sum to 0
        err = np.array([10.0, -10.0])
        act = np.array([0.0, 0.0])
        m = calculate_metrics(err, act)
        assert m["wape_pct"] is None  # Handled safely, no ZeroDivisionError

    def test_l8_wape_preferred_over_mape(self) -> None:
        """Demonstrate that WAPE succeeds when actual is near zero, whereas MAPE explodes."""
        f = np.array([50.0, 200.0])
        a = np.array([0.1, 200.0])  # Near zero actual
        err = f - a
        m = calculate_metrics(err, a)
        # MAPE would be ( (50 - 0.1)/0.1 + (200-200)/200 ) / 2 = 249.5 / 2 = 12475%!
        # WAPE is (49.9 + 0) / (0.1 + 200) * 100% ≈ 49.9 / 200.1 * 100% = 24.9%
        assert m["wape_pct"] == pytest.approx(24.94, abs=0.1)


# ── Daily Decision View & Missing Forecast Logic (L4, L5, L9) ─────────────────


class TestDailyDecisionView:
    def test_48_half_hours_generated(
        self, actuals_df: pd.DataFrame, forecasts_df: pd.DataFrame
    ) -> None:
        """Every day must produce 48 half-hourly rows with SP 1 to 48."""
        view = build_daily_decision_view(actuals_df, forecasts_df, "2026-01-01", "09:00")
        assert len(view["half_hours"]) == 48
        assert view["half_hours"][0]["settlement_period"] == 1
        assert view["half_hours"][-1]["settlement_period"] == 48

    def test_missing_forecast_flagged_not_filled(
        self, actuals_df: pd.DataFrame, forecasts_df: pd.DataFrame
    ) -> None:
        """SP 3 in fixture has no forecast before cutoff: forecast_missing must be True."""
        view = build_daily_decision_view(actuals_df, forecasts_df, "2026-01-01", "09:00")
        sp3 = view["half_hours"][2]  # 01:00 UTC
        assert sp3["forecast_missing"] is True
        assert sp3["forecast_mw"] is None
        assert sp3["error_mw"] is None

    def test_no_leakage_in_decision_view(self, forecasts_df: pd.DataFrame) -> None:
        """Forecast published at 09:00:01 (leakage row) must NOT be selected for SP 1."""
        empty_act = pd.DataFrame(columns=["start_time", "generation", "settlement_period"])
        view = build_daily_decision_view(empty_act, forecasts_df, "2026-01-01", "09:00")
        sp1 = view["half_hours"][0]
        # In fixture, SP1 has 09:00:00 (gen 4200) and 09:00:01 (gen 4210)
        # Cutoff on D-1 for 2026-01-01 delivery is 2025-12-31 09:00 UTC!
        # Looking at fixture:
        # 2025-12-31T06:00:00Z -> 4100
        # 2025-12-31T12:00:00Z -> published after 09:00 cutoff on D-1!
        # So only 06:00:00 should be selected!
        assert sp1["forecast_mw"] == 4100.0


# ── Horizon Analysis Tests ────────────────────────────────────────────────────


class TestHorizonAnalysis:
    def test_buckets_match_expected_labels(self) -> None:
        f_df = pd.DataFrame(
            [
                {
                    "publish_time": pd.Timestamp("2026-01-01 00:00:00", tz="UTC"),
                    "start_time": pd.Timestamp(
                        "2026-01-01 04:00:00", tz="UTC"
                    ),  # 4h horizon -> 0-6h
                    "generation": 2000.0,
                },
                {
                    "publish_time": pd.Timestamp("2026-01-01 00:00:00", tz="UTC"),
                    "start_time": pd.Timestamp(
                        "2026-01-01 10:00:00", tz="UTC"
                    ),  # 10h horizon -> 6-12h
                    "generation": 2500.0,
                },
            ]
        )
        a_df = pd.DataFrame(
            [
                {
                    "start_time": pd.Timestamp("2026-01-01 04:00:00", tz="UTC"),
                    "generation": 1900.0,
                },
                {
                    "start_time": pd.Timestamp("2026-01-01 10:00:00", tz="UTC"),
                    "generation": 2600.0,
                },
            ]
        )

        res = compute_horizon_accuracy(a_df, f_df, "2026-01-01", "2026-01-01")
        assert len(res) == 6
        assert res[0]["label"] == "0–6h"
        assert res[0]["n_points"] == 1
        assert res[0]["mae_mw"] == 100.0

        assert res[1]["label"] == "6–12h"
        assert res[1]["n_points"] == 1
        assert res[1]["mae_mw"] == 100.0


# ── Revisions View Tests ──────────────────────────────────────────────────────


class TestForecastRevisions:
    def test_decision_forecast_is_flagged(self) -> None:
        """Verify the latest vintage before cutoff is marked is_decision_forecast=True."""
        target = pd.Timestamp("2026-01-02 00:00:00", tz="UTC")
        f_df = pd.DataFrame(
            [
                {
                    "publish_time": pd.Timestamp("2026-01-01 06:00:00", tz="UTC"),
                    "start_time": target,
                    "generation": 3000.0,
                },
                {
                    "publish_time": pd.Timestamp("2026-01-01 09:00:00", tz="UTC"),
                    "start_time": target,
                    "generation": 3200.0,
                },
                {
                    "publish_time": pd.Timestamp("2026-01-01 15:00:00", tz="UTC"),
                    "start_time": target,
                    "generation": 3500.0,
                },
            ]
        )
        a_df = pd.DataFrame([{"start_time": target, "generation": 3100.0}])

        revs = get_forecast_revisions(f_df, a_df, "2026-01-02", "09:00")
        assert len(revs["vintages"]) == 3
        v09 = [v for v in revs["vintages"] if "09:00:00" in v["publish_time"]][0]
        assert v09["is_decision_forecast"] is True

        v15 = [v for v in revs["vintages"] if "15:00:00" in v["publish_time"]][0]
        assert v15["is_decision_forecast"] is False


# ── What-If Procurement Helper Tests ──────────────────────────────────────────


class TestWhatIfProcurement:
    def test_procurement_calculation(self) -> None:
        res = compute_what_if_procurement(
            expected_demand_mw=25000.0,
            forecast_wind_mw=10000.0,
            lower_wind_bound_mw=8500.0,
        )
        assert res["procurement_baseline_mw"] == 15000.0
        assert res["procurement_conservative_mw"] == 16500.0
        assert res["recommended_buffer_mw"] == 1500.0

    def test_negative_residual_clamped_to_zero(self) -> None:
        """When wind exceeds demand, procurement must be 0, not negative."""
        res = compute_what_if_procurement(
            expected_demand_mw=5000.0,
            forecast_wind_mw=8000.0,
            lower_wind_bound_mw=6000.0,
        )
        assert res["procurement_baseline_mw"] == 0.0
        assert res["procurement_conservative_mw"] == 0.0
        assert res["recommended_buffer_mw"] == 0.0
