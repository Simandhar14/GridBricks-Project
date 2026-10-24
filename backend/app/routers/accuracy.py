"""Accuracy metrics routers."""

from __future__ import annotations

from datetime import date

from backend.app.analytics import (
    align_decision_and_actuals,
    calculate_metrics,
    compute_daily_accuracy,
    compute_error_distribution,
    compute_horizon_accuracy,
    compute_hourly_accuracy,
)
from backend.app.config import settings
from backend.app.data_loader import data_loader
from backend.app.routers.forecast import validate_cutoff, validate_jan_date
from backend.app.schemas import (
    AccuracySummaryResponse,
    DailyAccuracyResponse,
    ErrorDistributionResponse,
    HorizonAccuracyResponse,
    HourlyAccuracyResponse,
)
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/api/accuracy", tags=["Accuracy"])


def validate_date_range(start: str, end: str) -> tuple[date, date]:
    s = validate_jan_date(start)
    e = validate_jan_date(end)
    if s > e:
        raise HTTPException(
            status_code=400,
            detail=f"Start date ({start}) cannot be after end date ({end}).",
        )
    return s, e


@router.get("/summary", response_model=AccuracySummaryResponse)
def get_accuracy_summary(
    start: str = Query(default="2026-01-01", description="Start date (YYYY-MM-DD)"),
    end: str = Query(default="2026-01-31", description="End date (YYYY-MM-DD)"),
    cutoff: str = Query(
        default=settings.decision_cutoff_local, description="D-1 cutoff local time (HH:MM)"
    ),
) -> AccuracySummaryResponse:
    """Return aggregate forecast accuracy metrics across a specified date range."""
    s_date, e_date = validate_date_range(start, end)
    c = validate_cutoff(cutoff)

    actuals = data_loader.get_actuals()
    forecasts = data_loader.get_forecasts()

    aligned = align_decision_and_actuals(
        actuals_df=actuals,
        forecasts_df=forecasts,
        start_date=s_date,
        end_date=e_date,
        cutoff_time_local=c,
    )

    n_total = len(aligned)
    valid = aligned.dropna(subset=["forecast_mw", "actual_mw"])
    n_matched = len(valid)
    coverage_pct = round((n_matched / n_total * 100.0), 1) if n_total > 0 else 0.0

    if not valid.empty:
        err = valid["forecast_mw"] - valid["actual_mw"]
        m = calculate_metrics(err, valid["actual_mw"])
    else:
        m = calculate_metrics([])

    return AccuracySummaryResponse(
        period={"start": s_date.isoformat(), "end": e_date.isoformat()},
        cutoff=c,
        n_points=n_total,
        n_matched=n_matched,
        coverage_pct=coverage_pct,
        mae_mw=m["mae_mw"],
        rmse_mw=m["rmse_mw"],
        bias_mw=m["bias_mw"],
        wape_pct=m["wape_pct"],
        p50_abs_error_mw=m["p50_abs_error_mw"],
        p90_abs_error_mw=m["p90_abs_error_mw"],
        p95_abs_error_mw=m["p95_abs_error_mw"],
        max_over_forecast_mw=m["max_over_forecast_mw"],
        max_under_forecast_mw=m["max_under_forecast_mw"],
        error_quantiles=m["error_quantiles"],
    )


@router.get("/daily", response_model=DailyAccuracyResponse)
def get_daily_accuracy(
    start: str = Query(default="2026-01-01", description="Start date (YYYY-MM-DD)"),
    end: str = Query(default="2026-01-31", description="End date (YYYY-MM-DD)"),
    cutoff: str = Query(
        default=settings.decision_cutoff_local, description="D-1 cutoff local time (HH:MM)"
    ),
) -> DailyAccuracyResponse:
    """Return daily accuracy metrics for each delivery day in the period."""
    s_date, e_date = validate_date_range(start, end)
    c = validate_cutoff(cutoff)

    actuals = data_loader.get_actuals()
    forecasts = data_loader.get_forecasts()

    days = compute_daily_accuracy(
        actuals_df=actuals,
        forecasts_df=forecasts,
        start_date=s_date,
        end_date=e_date,
        cutoff_time_local=c,
    )
    return DailyAccuracyResponse(cutoff=c, days=days)


@router.get("/by-hour", response_model=HourlyAccuracyResponse)
def get_hourly_accuracy(
    start: str = Query(default="2026-01-01", description="Start date (YYYY-MM-DD)"),
    end: str = Query(default="2026-01-31", description="End date (YYYY-MM-DD)"),
    cutoff: str = Query(
        default=settings.decision_cutoff_local, description="D-1 cutoff local time (HH:MM)"
    ),
) -> HourlyAccuracyResponse:
    """Return forecast accuracy metrics grouped by hour of the day (0 to 23 UTC)."""
    s_date, e_date = validate_date_range(start, end)
    c = validate_cutoff(cutoff)

    actuals = data_loader.get_actuals()
    forecasts = data_loader.get_forecasts()

    hours = compute_hourly_accuracy(
        actuals_df=actuals,
        forecasts_df=forecasts,
        start_date=s_date,
        end_date=e_date,
        cutoff_time_local=c,
    )
    return HourlyAccuracyResponse(cutoff=c, hours=hours)


@router.get("/by-horizon", response_model=HorizonAccuracyResponse)
def get_horizon_accuracy(
    start: str = Query(default="2026-01-01", description="Start date (YYYY-MM-DD)"),
    end: str = Query(default="2026-01-31", description="End date (YYYY-MM-DD)"),
) -> HorizonAccuracyResponse:
    """Return forecast accuracy metrics broken down by lead-time horizon buckets."""
    s_date, e_date = validate_date_range(start, end)

    actuals = data_loader.get_actuals()
    forecasts = data_loader.get_forecasts()

    buckets = compute_horizon_accuracy(
        actuals_df=actuals,
        forecasts_df=forecasts,
        start_date=s_date,
        end_date=e_date,
    )
    return HorizonAccuracyResponse(buckets=buckets)


@router.get("/error-distribution", response_model=ErrorDistributionResponse)
def get_error_distribution(
    start: str = Query(default="2026-01-01", description="Start date (YYYY-MM-DD)"),
    end: str = Query(default="2026-01-31", description="End date (YYYY-MM-DD)"),
    cutoff: str = Query(
        default=settings.decision_cutoff_local, description="D-1 cutoff local time (HH:MM)"
    ),
    bins: int = Query(default=15, ge=5, le=50, description="Number of histogram bins"),
) -> ErrorDistributionResponse:
    """Return error distribution histogram bins and quantiles."""
    s_date, e_date = validate_date_range(start, end)
    c = validate_cutoff(cutoff)

    actuals = data_loader.get_actuals()
    forecasts = data_loader.get_forecasts()

    dist = compute_error_distribution(
        actuals_df=actuals,
        forecasts_df=forecasts,
        start_date=s_date,
        end_date=e_date,
        cutoff_time_local=c,
        n_bins=bins,
    )
    return ErrorDistributionResponse(
        cutoff=c,
        histogram=dist["histogram"],
        quantiles=dist["quantiles"],
    )
