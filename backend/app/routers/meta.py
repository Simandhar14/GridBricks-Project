"""Metadata and data quality summary router."""

from __future__ import annotations

from datetime import date, timedelta

from backend.app.config import settings
from backend.app.data_loader import data_loader
from backend.app.schemas import (
    CoverageSummary,
    DataQualitySummary,
    MetaResponse,
)
from fastapi import APIRouter

router = APIRouter(tags=["Metadata"])


@router.get("/api/meta", response_model=MetaResponse)
def get_metadata() -> MetaResponse:
    """Return available dates, data coverage, default cutoff, snapshot timestamp, and data-quality summary."""
    # Dates in January 2026
    start_d = date(2026, 1, 1)
    available_dates = [(start_d + timedelta(days=i)).isoformat() for i in range(31)]

    actuals = data_loader.get_actuals()
    forecasts = data_loader.get_forecasts()
    meta = data_loader.get_meta()

    snapshot_ts = meta.get("fetch_time_utc")

    # Quality metrics
    act_rows = len(actuals)
    f_rows = len(forecasts)

    act_unique = int(actuals["start_time"].nunique()) if not actuals.empty else 0
    f_unique = int(forecasts["start_time"].nunique()) if not forecasts.empty else 0

    missing_half_hours = max(0, 1488 - act_unique)
    neg_act = int((actuals["generation"] < 0).sum()) if not actuals.empty else 0
    neg_f = int((forecasts["generation"] < 0).sum()) if not forecasts.empty else 0

    p50_vintages = None
    if not forecasts.empty:
        counts = forecasts.groupby("start_time")["publish_time"].nunique()
        p50_vintages = float(counts.quantile(0.5))

    quality = DataQualitySummary(
        actuals_rows=act_rows,
        forecast_rows=f_rows,
        actuals_unique_start_times=act_unique,
        forecast_unique_start_times=f_unique,
        actuals_missing_half_hours_count=missing_half_hours,
        negative_actual_values=neg_act,
        negative_forecast_values=neg_f,
        forecast_vintages_per_starttime_p50=p50_vintages,
    )

    # Coverage by date
    full_dates = []
    partial_dates = []
    missing_dates = []

    if not actuals.empty:
        daily_counts = actuals.groupby(actuals["start_time"].dt.date)["start_time"].nunique()
        for d_str in available_dates:
            d_obj = date.fromisoformat(d_str)
            cnt = daily_counts.get(d_obj, 0)
            if cnt == 48:
                full_dates.append(d_str)
            elif cnt > 0:
                partial_dates.append(d_str)
            else:
                missing_dates.append(d_str)
    else:
        missing_dates = list(available_dates)

    coverage = CoverageSummary(
        dates_with_full_coverage=full_dates,
        dates_with_partial_coverage=partial_dates,
        dates_missing=missing_dates,
    )

    return MetaResponse(
        available_dates=available_dates,
        default_cutoff=settings.decision_cutoff_local,
        cutoff_options=settings.cutoff_options,
        snapshot_timestamp=snapshot_ts,
        data_quality=quality,
        actuals_coverage=coverage,
    )


@router.post("/api/refresh")
def reload_data() -> dict[str, Any]:
    """Reload snapshot datasets into in-memory cache and return status."""
    data_loader.load()
    return {
        "status": "success",
        "message": "Snapshot data reloaded successfully",
        "actuals_rows": len(data_loader.get_actuals()),
        "forecast_rows": len(data_loader.get_forecasts()),
    }
