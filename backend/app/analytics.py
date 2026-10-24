"""Pure domain logic and analytics for wind procurement.

No I/O or network operations. All time handling uses UTC-aware datetimes,
with explicit zoneinfo("Europe/London") for the D-1 decision cutoff.
"""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

import numpy as np
import pandas as pd

LONDON_TZ = ZoneInfo("Europe/London")

# Horizon bucket boundaries (in hours)
HORIZON_BUCKETS = [
    ("0–6h", 0.0, 6.0),
    ("6–12h", 6.0, 12.0),
    ("12–24h", 12.0, 24.0),
    ("24–36h", 24.0, 36.0),
    ("36–48h", 36.0, 48.0),
    ("48h+", 48.0, None),
]


def parse_date(d: date | str) -> date:
    """Coerce string or date to datetime.date."""
    if isinstance(d, str):
        return date.fromisoformat(d)
    return d


def get_decision_cutoff_utc(
    delivery_date: date | str,
    cutoff_time_local: str = "09:00",
) -> datetime:
    """Calculate the exact UTC timestamp for the D-1 decision cutoff.

    Parameters
    ----------
    delivery_date:
        The target delivery day D (e.g. 2026-01-15).
    cutoff_time_local:
        Cutoff time in Europe/London local time on D-1 (e.g. "09:00").

    Returns
    -------
    datetime
        UTC-aware datetime of the cutoff on D-1.
    """
    d = parse_date(delivery_date)
    d_minus_1 = d - timedelta(days=1)
    parts = cutoff_time_local.split(":")
    hh, mm = int(parts[0]), int(parts[1])

    cutoff_local = datetime(
        d_minus_1.year,
        d_minus_1.month,
        d_minus_1.day,
        hh,
        mm,
        0,
        tzinfo=LONDON_TZ,
    )
    return cutoff_local.astimezone(UTC)


def filter_decision_forecasts(
    forecasts_df: pd.DataFrame,
    delivery_date: date | str,
    cutoff_time_local: str = "09:00",
) -> pd.DataFrame:
    """Extract the latest forecast available at decision cutoff for each target startTime.

    STRICT INVARIANTS:
    1. publish_time <= cutoff_utc (forecast published exactly at cutoff is included).
    2. publish_time > cutoff_utc is strictly excluded (NO LOOK-AHEAD LEAKAGE).
    3. For each startTime, the vintage with max(publish_time) <= cutoff is selected.
    4. If no vintage exists before cutoff, no row is created (handled as missing).

    Parameters
    ----------
    forecasts_df:
        DataFrame containing columns: ``publish_time``, ``start_time``, ``generation``.
    delivery_date:
        Target delivery date D.
    cutoff_time_local:
        Local cutoff time on D-1 (default "09:00").

    Returns
    -------
    pd.DataFrame
        Columns: ``start_time``, ``publish_time``, ``generation``, ``horizon_hours``.
    """
    if forecasts_df.empty:
        return pd.DataFrame(columns=["start_time", "publish_time", "generation", "horizon_hours"])

    d = parse_date(delivery_date)
    start_of_day = datetime(d.year, d.month, d.day, 0, 0, 0, tzinfo=UTC)
    end_of_day = start_of_day + timedelta(days=1)
    cutoff_utc = get_decision_cutoff_utc(d, cutoff_time_local)

    # Filter by target delivery day
    mask_day = (forecasts_df["start_time"] >= start_of_day) & (
        forecasts_df["start_time"] < end_of_day
    )
    day_forecasts = forecasts_df[mask_day]

    # STRICT NO-LEAKAGE: publish_time <= cutoff_utc
    mask_cutoff = day_forecasts["publish_time"] <= cutoff_utc
    valid_vintages = day_forecasts[mask_cutoff]

    if valid_vintages.empty:
        return pd.DataFrame(columns=["start_time", "publish_time", "generation", "horizon_hours"])

    # For each start_time, keep the one with latest publish_time
    # Sort descending by publish_time, drop duplicates on start_time keeping first
    latest = (
        valid_vintages.sort_values("publish_time", ascending=False)
        .drop_duplicates(
            subset=["start_time"],
            keep="first",
        )
        .copy()
    )

    # Calculate horizon in hours: (startTime - publishTime)
    delta_s = (latest["start_time"] - latest["publish_time"]).dt.total_seconds()
    latest["horizon_hours"] = delta_s / 3600.0

    return latest.sort_values("start_time").reset_index(drop=True)


def calculate_metrics(
    errors: pd.Series | np.ndarray,
    actuals: pd.Series | np.ndarray | None = None,
) -> dict[str, Any]:
    """Compute core accuracy metrics from signed error series (forecast - actual).

    Sign convention: error = forecast - actual.
    Positive error = over-forecast.
    Negative error = under-forecast.
    """
    if len(errors) == 0:
        return {
            "n_points": 0,
            "mae_mw": None,
            "rmse_mw": None,
            "bias_mw": None,
            "wape_pct": None,
            "p50_abs_error_mw": None,
            "p90_abs_error_mw": None,
            "p95_abs_error_mw": None,
            "max_over_forecast_mw": None,
            "max_under_forecast_mw": None,
            "error_quantiles": {
                "p5": None,
                "p10": None,
                "p25": None,
                "p50": None,
                "p75": None,
                "p90": None,
                "p95": None,
            },
        }

    err_arr = np.asarray(errors, dtype=float)
    abs_err = np.abs(err_arr)

    mae = float(np.mean(abs_err))
    rmse = float(np.sqrt(np.mean(err_arr**2)))
    bias = float(np.mean(err_arr))

    # WAPE = sum(|error|) / sum(actual) * 100%
    wape = None
    if actuals is not None and len(actuals) == len(err_arr):
        act_arr = np.asarray(actuals, dtype=float)
        act_sum = float(np.sum(act_arr))
        if act_sum > 0:
            wape = round(float(np.sum(abs_err) / act_sum * 100.0), 2)

    p50_abs = float(np.percentile(abs_err, 50))
    p90_abs = float(np.percentile(abs_err, 90))
    p95_abs = float(np.percentile(abs_err, 95))

    max_over = float(np.max(err_arr))
    max_under = float(np.min(err_arr))

    quantiles = {
        "p5": round(float(np.percentile(err_arr, 5)), 2),
        "p10": round(float(np.percentile(err_arr, 10)), 2),
        "p25": round(float(np.percentile(err_arr, 25)), 2),
        "p50": round(float(np.percentile(err_arr, 50)), 2),
        "p75": round(float(np.percentile(err_arr, 75)), 2),
        "p90": round(float(np.percentile(err_arr, 90)), 2),
        "p95": round(float(np.percentile(err_arr, 95)), 2),
    }

    return {
        "n_points": int(len(err_arr)),
        "mae_mw": round(mae, 2),
        "rmse_mw": round(rmse, 2),
        "bias_mw": round(bias, 2),
        "wape_pct": wape,
        "p50_abs_error_mw": round(p50_abs, 2),
        "p90_abs_error_mw": round(p90_abs, 2),
        "p95_abs_error_mw": round(p95_abs, 2),
        "max_over_forecast_mw": round(max_over, 2),
        "max_under_forecast_mw": round(max_under, 2),
        "error_quantiles": quantiles,
    }


def compute_empirical_error_quantiles(
    actuals_df: pd.DataFrame,
    forecasts_df: pd.DataFrame,
    cutoff_time_local: str = "09:00",
) -> dict[str, float]:
    """Compute empirical error quantiles across the entire Jan 2026 dataset for the decision cutoff."""
    if actuals_df.empty or forecasts_df.empty:
        return {"p10": -500.0, "p50": 0.0, "p90": 500.0}

    # Gather decision-time forecast vs actual for all days
    aligned = align_decision_and_actuals(
        actuals_df, forecasts_df, cutoff_time_local=cutoff_time_local
    )
    valid = aligned.dropna(subset=["forecast_mw", "actual_mw"])
    if valid.empty:
        return {"p10": -500.0, "p50": 0.0, "p90": 500.0}

    err = valid["forecast_mw"] - valid["actual_mw"]
    return {
        "p10": round(float(err.quantile(0.10)), 2),
        "p50": round(float(err.quantile(0.50)), 2),
        "p90": round(float(err.quantile(0.90)), 2),
    }


def align_decision_and_actuals(
    actuals_df: pd.DataFrame,
    forecasts_df: pd.DataFrame,
    start_date: date | str = "2026-01-01",
    end_date: date | str = "2026-01-31",
    cutoff_time_local: str = "09:00",
) -> pd.DataFrame:
    """Align decision forecasts with actuals across a date range.

    Applies the decision cutoff day-by-day to strictly prevent look-ahead leakage.
    """
    s_date = parse_date(start_date)
    e_date = parse_date(end_date)

    decision_frames = []
    curr = s_date
    while curr <= e_date:
        dec = filter_decision_forecasts(forecasts_df, curr, cutoff_time_local=cutoff_time_local)
        if not dec.empty:
            decision_frames.append(dec)
        curr += timedelta(days=1)

    if not decision_frames:
        all_dec = pd.DataFrame(
            columns=["start_time", "publish_time", "generation", "horizon_hours"]
        )
    else:
        all_dec = pd.concat(decision_frames, ignore_index=True)

    all_dec = all_dec.rename(
        columns={
            "generation": "forecast_mw",
            "publish_time": "forecast_publish_time",
        }
    )

    # Filter actuals to date range
    start_utc = datetime(s_date.year, s_date.month, s_date.day, 0, 0, tzinfo=UTC)
    end_utc = datetime(e_date.year, e_date.month, e_date.day, 0, 0, tzinfo=UTC) + timedelta(days=1)

    act = actuals_df[
        (actuals_df["start_time"] >= start_utc) & (actuals_df["start_time"] < end_utc)
    ].copy()
    act = act.rename(columns={"generation": "actual_mw"})

    # Merge on start_time (outer merge so missing half-hours can be surfaced)
    merged = (
        pd.merge(
            act[["start_time", "actual_mw", "settlement_period"]],
            all_dec[["start_time", "forecast_mw", "forecast_publish_time", "horizon_hours"]],
            on="start_time",
            how="outer",
        )
        .sort_values("start_time")
        .reset_index(drop=True)
    )

    return merged


def build_daily_decision_view(
    actuals_df: pd.DataFrame,
    forecasts_df: pd.DataFrame,
    delivery_date: date | str,
    cutoff_time_local: str = "09:00",
    empirical_quantiles: dict[str, float] | None = None,
) -> dict[str, Any]:
    """Generate the full payload for GET /api/forecast/decision."""
    d = parse_date(delivery_date)
    cutoff_utc = get_decision_cutoff_utc(d, cutoff_time_local)

    if empirical_quantiles is None:
        empirical_quantiles = compute_empirical_error_quantiles(
            actuals_df,
            forecasts_df,
            cutoff_time_local=cutoff_time_local,
        )

    p10_err = empirical_quantiles.get("p10", -500.0)
    p90_err = empirical_quantiles.get("p90", 500.0)

    # All 48 expected half-hours
    expected_times = []
    base = datetime(d.year, d.month, d.day, 0, 0, tzinfo=UTC)
    for sp in range(1, 49):
        expected_times.append((base + timedelta(minutes=30 * (sp - 1)), sp))

    expected_df = pd.DataFrame(expected_times, columns=["start_time", "settlement_period"])

    # Decision forecasts
    dec_df = filter_decision_forecasts(forecasts_df, d, cutoff_time_local=cutoff_time_local)
    dec_df = dec_df.rename(
        columns={
            "generation": "forecast_mw",
            "publish_time": "forecast_publish_time",
        }
    )

    # Actuals for the day
    start_utc = base
    end_utc = base + timedelta(days=1)
    act_df = actuals_df[
        (actuals_df["start_time"] >= start_utc) & (actuals_df["start_time"] < end_utc)
    ].rename(columns={"generation": "actual_mw"})

    # Merge expected with actuals and forecasts
    merged = pd.merge(expected_df, act_df[["start_time", "actual_mw"]], on="start_time", how="left")
    merged = pd.merge(
        merged,
        dec_df[["start_time", "forecast_mw", "forecast_publish_time", "horizon_hours"]],
        on="start_time",
        how="left",
    )

    half_hours = []
    matched_count = 0
    total_forecast_mwh = 0.0

    for _, row in merged.iterrows():
        f_val = row["forecast_mw"]
        a_val = row["actual_mw"]

        f_missing = pd.isna(f_val)
        a_missing = pd.isna(a_val)

        forecast_mw = None if f_missing else round(float(f_val), 1)
        actual_mw = None if a_missing else round(float(a_val), 1)

        error_mw = None
        pct_error = None
        lower_bound = None
        upper_bound = None

        if not f_missing:
            # Half-hour energy in MWh = MW * 0.5 h
            total_forecast_mwh += forecast_mw * 0.5
            # Implied actual bounds: actual = forecast - error
            # When error is positive (over-forecast), actual is lower: forecast - p90
            # When error is negative (under-forecast), actual is higher: forecast - p10
            lower_bound = max(0.0, round(forecast_mw - p90_err, 1))
            upper_bound = max(0.0, round(forecast_mw - p10_err, 1))

        if not f_missing and not a_missing:
            matched_count += 1
            error_mw = round(forecast_mw - actual_mw, 1)
            if actual_mw > 0:
                pct_error = round((error_mw / actual_mw) * 100.0, 1)

        pub_str = None
        if not pd.isna(row["forecast_publish_time"]):
            pub_ts = pd.to_datetime(row["forecast_publish_time"])
            pub_str = pub_ts.strftime("%Y-%m-%dT%H:%M:%SZ")

        horizon = None if pd.isna(row["horizon_hours"]) else round(float(row["horizon_hours"]), 2)

        half_hours.append(
            {
                "start_time": pd.to_datetime(row["start_time"]).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "settlement_period": int(row["settlement_period"]),
                "forecast_mw": forecast_mw,
                "forecast_publish_time": pub_str,
                "horizon_hours": horizon,
                "actual_mw": actual_mw,
                "error_mw": error_mw,
                "pct_error": pct_error,
                "error_band_p10": p10_err,
                "error_band_p90": p90_err,
                "implied_actual_lower_mw": lower_bound,
                "implied_actual_upper_mw": upper_bound,
                "forecast_missing": f_missing,
                "actual_missing": a_missing,
            }
        )

    valid_f = [h["forecast_mw"] for h in half_hours if h["forecast_mw"] is not None]
    valid_a = [h["actual_mw"] for h in half_hours if h["actual_mw"] is not None]

    peak_mw = round(float(max(valid_f)), 1) if valid_f else None
    avg_mw = round(float(np.mean(valid_f)), 1) if valid_f else None

    # Latest publish time among selected forecasts
    pub_times = [
        h["forecast_publish_time"] for h in half_hours if h["forecast_publish_time"] is not None
    ]
    latest_pub = max(pub_times) if pub_times else None

    # Coverage percentage
    coverage_pct = round((matched_count / 48.0) * 100.0, 1)

    return {
        "date": d.isoformat(),
        "cutoff_local": cutoff_time_local,
        "cutoff_utc": cutoff_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "half_hours": half_hours,
        "summary": {
            "forecast_peak_mw": peak_mw,
            "forecast_avg_mw": avg_mw,
            "forecast_total_mwh": round(total_forecast_mwh, 1),
            "actuals_available": len(valid_a) > 0,
            "matched_coverage_pct": coverage_pct,
            "publish_time_used": latest_pub,
            "matched_half_hours": matched_count,
            "total_half_hours": 48,
        },
    }


def compute_daily_accuracy(
    actuals_df: pd.DataFrame,
    forecasts_df: pd.DataFrame,
    start_date: date | str = "2026-01-01",
    end_date: date | str = "2026-01-31",
    cutoff_time_local: str = "09:00",
) -> list[dict[str, Any]]:
    """Compute day-by-day accuracy metrics for GET /api/accuracy/daily."""
    s_date = parse_date(start_date)
    e_date = parse_date(end_date)

    daily_results = []
    curr = s_date
    while curr <= e_date:
        dec = filter_decision_forecasts(forecasts_df, curr, cutoff_time_local=cutoff_time_local)
        if not dec.empty:
            start_utc = datetime(curr.year, curr.month, curr.day, 0, 0, tzinfo=UTC)
            end_utc = start_utc + timedelta(days=1)
            act = actuals_df[
                (actuals_df["start_time"] >= start_utc) & (actuals_df["start_time"] < end_utc)
            ]
            merged = pd.merge(
                dec[["start_time", "generation"]].rename(columns={"generation": "forecast_mw"}),
                act[["start_time", "generation"]].rename(columns={"generation": "actual_mw"}),
                on="start_time",
                how="inner",
            )
            if not merged.empty:
                err = merged["forecast_mw"] - merged["actual_mw"]
                metrics = calculate_metrics(err, merged["actual_mw"])
                daily_results.append(
                    {
                        "date": curr.isoformat(),
                        "n_points": metrics["n_points"],
                        "mae_mw": metrics["mae_mw"],
                        "rmse_mw": metrics["rmse_mw"],
                        "bias_mw": metrics["bias_mw"],
                        "wape_pct": metrics["wape_pct"],
                        "p90_abs_error_mw": metrics["p90_abs_error_mw"],
                    }
                )
            else:
                daily_results.append(
                    {
                        "date": curr.isoformat(),
                        "n_points": 0,
                        "mae_mw": None,
                        "rmse_mw": None,
                        "bias_mw": None,
                        "wape_pct": None,
                        "p90_abs_error_mw": None,
                    }
                )
        else:
            daily_results.append(
                {
                    "date": curr.isoformat(),
                    "n_points": 0,
                    "mae_mw": None,
                    "rmse_mw": None,
                    "bias_mw": None,
                    "wape_pct": None,
                    "p90_abs_error_mw": None,
                }
            )
        curr += timedelta(days=1)

    return daily_results


def compute_hourly_accuracy(
    actuals_df: pd.DataFrame,
    forecasts_df: pd.DataFrame,
    start_date: date | str = "2026-01-01",
    end_date: date | str = "2026-01-31",
    cutoff_time_local: str = "09:00",
) -> list[dict[str, Any]]:
    """Compute accuracy grouped by hour of the day (0-23 UTC) for GET /api/accuracy/by-hour."""
    aligned = align_decision_and_actuals(
        actuals_df,
        forecasts_df,
        start_date=start_date,
        end_date=end_date,
        cutoff_time_local=cutoff_time_local,
    )
    valid = aligned.dropna(subset=["forecast_mw", "actual_mw"]).copy()

    if valid.empty:
        return [
            {"hour_utc": h, "n_points": 0, "mae_mw": None, "bias_mw": None, "wape_pct": None}
            for h in range(24)
        ]

    valid["hour"] = valid["start_time"].dt.hour
    results = []

    for h in range(24):
        h_data = valid[valid["hour"] == h]
        if not h_data.empty:
            err = h_data["forecast_mw"] - h_data["actual_mw"]
            m = calculate_metrics(err, h_data["actual_mw"])
            results.append(
                {
                    "hour_utc": h,
                    "n_points": m["n_points"],
                    "mae_mw": m["mae_mw"],
                    "bias_mw": m["bias_mw"],
                    "wape_pct": m["wape_pct"],
                }
            )
        else:
            results.append(
                {
                    "hour_utc": h,
                    "n_points": 0,
                    "mae_mw": None,
                    "bias_mw": None,
                    "wape_pct": None,
                }
            )

    return results


def compute_horizon_accuracy(
    actuals_df: pd.DataFrame,
    forecasts_df: pd.DataFrame,
    start_date: date | str = "2026-01-01",
    end_date: date | str = "2026-01-31",
) -> list[dict[str, Any]]:
    """Compute error metrics by forecast horizon bucket across all forecast vintages.

    Uses all vintages published for target dates within [start_date, end_date]
    to analyze how forecast accuracy degrades as lead time (horizon) increases.
    """
    s_date = parse_date(start_date)
    e_date = parse_date(end_date)
    start_utc = datetime(s_date.year, s_date.month, s_date.day, 0, 0, tzinfo=UTC)
    end_utc = datetime(e_date.year, e_date.month, e_date.day, 0, 0, tzinfo=UTC) + timedelta(days=1)

    f_sub = forecasts_df[
        (forecasts_df["start_time"] >= start_utc) & (forecasts_df["start_time"] < end_utc)
    ].rename(columns={"generation": "forecast_mw"})

    a_sub = actuals_df[
        (actuals_df["start_time"] >= start_utc) & (actuals_df["start_time"] < end_utc)
    ].rename(columns={"generation": "actual_mw"})

    if f_sub.empty or a_sub.empty:
        return [
            {
                "label": label,
                "horizon_min_h": h_min,
                "horizon_max_h": h_max,
                "n_points": 0,
                "mae_mw": None,
                "bias_mw": None,
            }
            for label, h_min, h_max in HORIZON_BUCKETS
        ]

    merged = pd.merge(f_sub, a_sub[["start_time", "actual_mw"]], on="start_time", how="inner")
    delta_s = (merged["start_time"] - merged["publish_time"]).dt.total_seconds()
    merged["horizon_hours"] = delta_s / 3600.0

    # Filter out non-positive horizon (should not happen in valid data)
    merged = merged[merged["horizon_hours"] >= 0].copy()

    results = []
    for label, h_min, h_max in HORIZON_BUCKETS:
        if h_max is None:
            bucket_df = merged[merged["horizon_hours"] >= h_min]
        else:
            bucket_df = merged[
                (merged["horizon_hours"] >= h_min) & (merged["horizon_hours"] < h_max)
            ]

        if not bucket_df.empty:
            err = bucket_df["forecast_mw"] - bucket_df["actual_mw"]
            m = calculate_metrics(err, bucket_df["actual_mw"])
            results.append(
                {
                    "label": label,
                    "horizon_min_h": h_min,
                    "horizon_max_h": h_max,
                    "n_points": m["n_points"],
                    "mae_mw": m["mae_mw"],
                    "bias_mw": m["bias_mw"],
                }
            )
        else:
            results.append(
                {
                    "label": label,
                    "horizon_min_h": h_min,
                    "horizon_max_h": h_max,
                    "n_points": 0,
                    "mae_mw": None,
                    "bias_mw": None,
                }
            )

    return results


def compute_error_distribution(
    actuals_df: pd.DataFrame,
    forecasts_df: pd.DataFrame,
    start_date: date | str = "2026-01-01",
    end_date: date | str = "2026-01-31",
    cutoff_time_local: str = "09:00",
    n_bins: int = 15,
) -> dict[str, Any]:
    """Calculate error histogram and distribution quantiles for GET /api/accuracy/error-distribution."""
    aligned = align_decision_and_actuals(
        actuals_df,
        forecasts_df,
        start_date=start_date,
        end_date=end_date,
        cutoff_time_local=cutoff_time_local,
    )
    valid = aligned.dropna(subset=["forecast_mw", "actual_mw"])

    if valid.empty:
        return {
            "histogram": [],
            "quantiles": {
                "p5": None,
                "p10": None,
                "p25": None,
                "p50": None,
                "p75": None,
                "p90": None,
                "p95": None,
            },
        }

    err = (valid["forecast_mw"] - valid["actual_mw"]).to_numpy()
    counts, bin_edges = np.histogram(err, bins=n_bins)

    histogram = []
    for i in range(len(counts)):
        histogram.append(
            {
                "bin_left_mw": round(float(bin_edges[i]), 1),
                "bin_right_mw": round(float(bin_edges[i + 1]), 1),
                "count": int(counts[i]),
            }
        )

    quantiles = {
        "p5": round(float(np.percentile(err, 5)), 2),
        "p10": round(float(np.percentile(err, 10)), 2),
        "p25": round(float(np.percentile(err, 25)), 2),
        "p50": round(float(np.percentile(err, 50)), 2),
        "p75": round(float(np.percentile(err, 75)), 2),
        "p90": round(float(np.percentile(err, 90)), 2),
        "p95": round(float(np.percentile(err, 95)), 2),
    }

    return {
        "histogram": histogram,
        "quantiles": quantiles,
    }


def get_forecast_revisions(
    forecasts_df: pd.DataFrame,
    actuals_df: pd.DataFrame,
    delivery_date: date | str,
    cutoff_time_local: str = "09:00",
) -> dict[str, Any]:
    """Retrieve all vintages for a delivery day and mark the decision vintage."""
    d = parse_date(delivery_date)
    start_utc = datetime(d.year, d.month, d.day, 0, 0, tzinfo=UTC)
    end_utc = start_utc + timedelta(days=1)
    cutoff_utc = get_decision_cutoff_utc(d, cutoff_time_local)

    # Filter forecasts for day D
    f_day = forecasts_df[
        (forecasts_df["start_time"] >= start_utc) & (forecasts_df["start_time"] < end_utc)
    ]

    # Actuals for day D
    a_day = actuals_df[
        (actuals_df["start_time"] >= start_utc) & (actuals_df["start_time"] < end_utc)
    ]

    actuals_series = [
        {
            "start_time": pd.to_datetime(row["start_time"]).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "actual_mw": round(float(row["generation"]), 1),
        }
        for _, row in a_day.sort_values("start_time").iterrows()
    ]

    if f_day.empty:
        return {
            "date": d.isoformat(),
            "decision_cutoff_utc": cutoff_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "vintages": [],
            "actuals": actuals_series,
        }

    # Find the decision publish time: max publish_time <= cutoff_utc
    valid_pub = f_day[f_day["publish_time"] <= cutoff_utc]["publish_time"]
    decision_pub_ts = valid_pub.max() if not valid_pub.empty else None

    # Group by publish_time
    vintages = []
    grouped = f_day.groupby("publish_time")
    for pub_time, group in sorted(grouped, key=lambda x: x[0]):
        pub_utc = pd.to_datetime(pub_time).tz_convert(UTC)
        is_decision = (decision_pub_ts is not None) and (pub_utc == decision_pub_ts)

        points = [
            {
                "start_time": pd.to_datetime(row["start_time"]).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "forecast_mw": round(float(row["generation"]), 1),
            }
            for _, row in group.sort_values("start_time").iterrows()
        ]

        vintages.append(
            {
                "publish_time": pub_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "is_decision_forecast": bool(is_decision),
                "points_count": len(points),
                "half_hours": points,
            }
        )

    return {
        "date": d.isoformat(),
        "decision_cutoff_utc": cutoff_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "vintages": vintages,
        "actuals": actuals_series,
    }


def compute_what_if_procurement(
    expected_demand_mw: float,
    forecast_wind_mw: float,
    lower_wind_bound_mw: float,
) -> dict[str, float]:
    """Calculate procurement requirements based on user-supplied expected demand."""
    residual_base = max(0.0, round(expected_demand_mw - forecast_wind_mw, 1))
    conservative_residual = max(0.0, round(expected_demand_mw - lower_wind_bound_mw, 1))
    buffer_mw = max(0.0, round(conservative_residual - residual_base, 1))

    return {
        "expected_demand_mw": round(expected_demand_mw, 1),
        "forecast_wind_mw": round(forecast_wind_mw, 1),
        "lower_wind_bound_mw": round(lower_wind_bound_mw, 1),
        "procurement_baseline_mw": residual_base,
        "procurement_conservative_mw": conservative_residual,
        "recommended_buffer_mw": buffer_mw,
    }
