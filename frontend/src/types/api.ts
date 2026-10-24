export interface CoverageSummary {
  dates_with_full_coverage: string[];
  dates_with_partial_coverage: string[];
  dates_missing: string[];
}

export interface DataQualitySummary {
  actuals_rows: number;
  forecast_rows: number;
  actuals_unique_start_times: number;
  forecast_unique_start_times: number;
  actuals_missing_half_hours_count: number;
  negative_actual_values: number;
  negative_forecast_values: number;
  forecast_vintages_per_starttime_p50: number | null;
}

export interface MetaResponse {
  available_dates: string[];
  default_cutoff: string;
  cutoff_options: string[];
  snapshot_timestamp: string | null;
  data_quality: DataQualitySummary;
  actuals_coverage: CoverageSummary;
}

export interface DecisionHalfHour {
  start_time: string;
  settlement_period: number;
  forecast_mw: number | null;
  forecast_publish_time: string | null;
  horizon_hours: number | null;
  actual_mw: number | null;
  error_mw: number | null;
  pct_error: number | null;
  error_band_p10: number | null;
  error_band_p90: number | null;
  implied_actual_lower_mw: number | null;
  implied_actual_upper_mw: number | null;
  forecast_missing: boolean;
  actual_missing: boolean;
}

export interface DecisionSummary {
  forecast_peak_mw: number | null;
  forecast_avg_mw: number | null;
  forecast_total_mwh: number | null;
  actuals_available: boolean;
  matched_coverage_pct: number;
  publish_time_used: string | null;
  matched_half_hours: number;
  total_half_hours: number;
}

export interface DecisionForecastResponse {
  date: string;
  cutoff_local: string;
  cutoff_utc: string;
  half_hours: DecisionHalfHour[];
  summary: DecisionSummary;
}

export interface RevisionHalfHour {
  start_time: string;
  forecast_mw: number;
}

export interface RevisionActual {
  start_time: string;
  actual_mw: number;
}

export interface ForecastVintage {
  publish_time: string;
  is_decision_forecast: boolean;
  points_count: number;
  half_hours: RevisionHalfHour[];
}

export interface RevisionsResponse {
  date: string;
  decision_cutoff_utc: string;
  vintages: ForecastVintage[];
  actuals: RevisionActual[];
}

export interface ErrorQuantiles {
  p5: number | null;
  p10: number | null;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  p90: number | null;
  p95: number | null;
}

export interface DatePeriod {
  start: string;
  end: string;
}

export interface AccuracySummaryResponse {
  period: DatePeriod;
  cutoff: string;
  n_points: number;
  n_matched: number;
  coverage_pct: number;
  mae_mw: number | null;
  rmse_mw: number | null;
  bias_mw: number | null;
  wape_pct: number | null;
  p50_abs_error_mw: number | null;
  p90_abs_error_mw: number | null;
  p95_abs_error_mw: number | null;
  max_over_forecast_mw: number | null;
  max_under_forecast_mw: number | null;
  error_quantiles: ErrorQuantiles;
}

export interface DailyAccuracyItem {
  date: string;
  n_points: number;
  mae_mw: number | null;
  rmse_mw: number | null;
  bias_mw: number | null;
  wape_pct: number | null;
  p90_abs_error_mw: number | null;
}

export interface DailyAccuracyResponse {
  cutoff: string;
  days: DailyAccuracyItem[];
}

export interface HourlyAccuracyItem {
  hour_utc: number;
  n_points: number;
  mae_mw: number | null;
  bias_mw: number | null;
  wape_pct: number | null;
}

export interface HourlyAccuracyResponse {
  cutoff: string;
  hours: HourlyAccuracyItem[];
}

export interface HorizonAccuracyItem {
  label: string;
  horizon_min_h: number;
  horizon_max_h: number | null;
  n_points: number;
  mae_mw: number | null;
  bias_mw: number | null;
}

export interface HorizonAccuracyResponse {
  buckets: HorizonAccuracyItem[];
}

export interface HistogramBin {
  bin_left_mw: number;
  bin_right_mw: number;
  count: number;
}

export interface ErrorDistributionResponse {
  cutoff: string;
  histogram: HistogramBin[];
  quantiles: ErrorQuantiles;
}

export interface WhatIfRequest {
  expected_demand_mw: number;
  forecast_wind_mw: number;
  lower_wind_bound_mw: number;
}

export interface WhatIfResponse {
  expected_demand_mw: number;
  forecast_wind_mw: number;
  lower_wind_bound_mw: number;
  procurement_baseline_mw: number;
  procurement_conservative_mw: number;
  recommended_buffer_mw: number;
  disclaimer: string;
}

