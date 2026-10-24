"""Pydantic v2 schemas for request and response validation."""

from __future__ import annotations

from pydantic import BaseModel, Field

# ── Health & Meta ─────────────────────────────────────────────────────────────


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "0.1.0"


class CoverageSummary(BaseModel):
    dates_with_full_coverage: list[str]
    dates_with_partial_coverage: list[str]
    dates_missing: list[str]


class DataQualitySummary(BaseModel):
    actuals_rows: int
    forecast_rows: int
    actuals_unique_start_times: int
    forecast_unique_start_times: int
    actuals_missing_half_hours_count: int
    negative_actual_values: int
    negative_forecast_values: int
    forecast_vintages_per_starttime_p50: float | None = None


class MetaResponse(BaseModel):
    available_dates: list[str]
    default_cutoff: str
    cutoff_options: list[str]
    snapshot_timestamp: str | None = None
    data_quality: DataQualitySummary
    actuals_coverage: CoverageSummary


# ── Forecast Decision ─────────────────────────────────────────────────────────


class DecisionHalfHour(BaseModel):
    start_time: str
    settlement_period: int
    forecast_mw: float | None = None
    forecast_publish_time: str | None = None
    horizon_hours: float | None = None
    actual_mw: float | None = None
    error_mw: float | None = None
    pct_error: float | None = None
    error_band_p10: float | None = None
    error_band_p90: float | None = None
    implied_actual_lower_mw: float | None = None
    implied_actual_upper_mw: float | None = None
    forecast_missing: bool
    actual_missing: bool


class DecisionSummary(BaseModel):
    forecast_peak_mw: float | None = None
    forecast_avg_mw: float | None = None
    forecast_total_mwh: float | None = None
    actuals_available: bool
    matched_coverage_pct: float
    publish_time_used: str | None = None
    matched_half_hours: int
    total_half_hours: int = 48


class DecisionForecastResponse(BaseModel):
    date: str
    cutoff_local: str
    cutoff_utc: str
    half_hours: list[DecisionHalfHour]
    summary: DecisionSummary


# ── Forecast Revisions ────────────────────────────────────────────────────────


class RevisionHalfHour(BaseModel):
    start_time: str
    forecast_mw: float


class RevisionActual(BaseModel):
    start_time: str
    actual_mw: float


class ForecastVintage(BaseModel):
    publish_time: str
    is_decision_forecast: bool
    points_count: int
    half_hours: list[RevisionHalfHour]


class RevisionsResponse(BaseModel):
    date: str
    decision_cutoff_utc: str
    vintages: list[ForecastVintage]
    actuals: list[RevisionActual]


# ── Accuracy Metrics ──────────────────────────────────────────────────────────


class ErrorQuantiles(BaseModel):
    p5: float | None = None
    p10: float | None = None
    p25: float | None = None
    p50: float | None = None
    p75: float | None = None
    p90: float | None = None
    p95: float | None = None


class DatePeriod(BaseModel):
    start: str
    end: str


class AccuracySummaryResponse(BaseModel):
    period: DatePeriod
    cutoff: str
    n_points: int
    n_matched: int
    coverage_pct: float
    mae_mw: float | None = None
    rmse_mw: float | None = None
    bias_mw: float | None = None
    wape_pct: float | None = None
    p50_abs_error_mw: float | None = None
    p90_abs_error_mw: float | None = None
    p95_abs_error_mw: float | None = None
    max_over_forecast_mw: float | None = None
    max_under_forecast_mw: float | None = None
    error_quantiles: ErrorQuantiles


class DailyAccuracyItem(BaseModel):
    date: str
    n_points: int
    mae_mw: float | None = None
    rmse_mw: float | None = None
    bias_mw: float | None = None
    wape_pct: float | None = None
    p90_abs_error_mw: float | None = None


class DailyAccuracyResponse(BaseModel):
    cutoff: str
    days: list[DailyAccuracyItem]


class HourlyAccuracyItem(BaseModel):
    hour_utc: int
    n_points: int
    mae_mw: float | None = None
    bias_mw: float | None = None
    wape_pct: float | None = None


class HourlyAccuracyResponse(BaseModel):
    cutoff: str
    hours: list[HourlyAccuracyItem]


class HorizonAccuracyItem(BaseModel):
    label: str
    horizon_min_h: float
    horizon_max_h: float | None = None
    n_points: int
    mae_mw: float | None = None
    bias_mw: float | None = None


class HorizonAccuracyResponse(BaseModel):
    buckets: list[HorizonAccuracyItem]


class HistogramBin(BaseModel):
    bin_left_mw: float
    bin_right_mw: float
    count: int


class ErrorDistributionResponse(BaseModel):
    cutoff: str
    histogram: list[HistogramBin]
    quantiles: ErrorQuantiles


# ── What-If Helper ────────────────────────────────────────────────────────────


class WhatIfRequest(BaseModel):
    expected_demand_mw: float = Field(
        ..., ge=0, description="Expected national demand in MW (user input)"
    )
    forecast_wind_mw: float = Field(..., ge=0, description="Forecast wind generation in MW")
    lower_wind_bound_mw: float = Field(..., ge=0, description="Conservative lower wind bound in MW")


class WhatIfResponse(BaseModel):
    expected_demand_mw: float
    forecast_wind_mw: float
    lower_wind_bound_mw: float
    procurement_baseline_mw: float
    procurement_conservative_mw: float
    recommended_buffer_mw: float
    disclaimer: str = "Demand is a user input scenario and not an official Elexon data source."
