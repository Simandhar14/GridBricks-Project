import React from 'react';
import { useDecisionForecast } from '../../api/useForecast';
import { useMeta } from '../../api/useMeta';
import {
  formatLondonDateTime,
  formatMW,
  formatMWh,
  formatPercentAbs,
} from '../../utils/formatters';
import { ErrorState } from '../shared/ErrorState';
import { KpiCard } from '../shared/KpiCard';
import { LoadingSkeleton } from '../shared/LoadingSkeleton';
import { ForecastChart } from './ForecastChart';
import { HalfHourlyTable } from './HalfHourlyTable';
import { WhatIfWidget } from './WhatIfWidget';
import { Calendar, Clock, Gauge, TrendingUp, Zap } from 'lucide-react';

interface DecisionViewProps {
  selectedDate: string;
  onChangeDate: (date: string) => void;
  selectedCutoff: string;
  onChangeCutoff: (cutoff: string) => void;
}

export const DecisionView: React.FC<DecisionViewProps> = ({
  selectedDate,
  onChangeDate,
  selectedCutoff,
  onChangeCutoff,
}) => {
  const { data: meta } = useMeta();
  const {
    data: forecastData,
    isLoading,
    isError,
    error,
    refetch,
  } = useDecisionForecast(selectedDate, selectedCutoff);

  const availableDates = meta?.available_dates || [];
  const cutoffOptions = meta?.cutoff_options || ['06:00', '09:00', '12:00'];

  if (isLoading) {
    return <LoadingSkeleton rows={5} height="h-96" />;
  }

  if (isError || !forecastData) {
    return (
      <ErrorState
        title="Unable to load decision forecast"
        message={error?.message || 'Check connection to backend server'}
        onRetry={refetch}
      />
    );
  }

  const { summary, half_hours } = forecastData;

  // Calculate lower bound average for what-if widget
  const validLowers = half_hours
    .map((h) => h.implied_actual_lower_mw)
    .filter((v): v is number => v !== null);
  const avgLower =
    validLowers.length > 0 ? validLowers.reduce((a, b) => a + b, 0) / validLowers.length : null;

  return (
    <div className="space-y-6">
      {/* View Header & Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Day-Ahead Wind Forecast & Procurement Order Decision
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Strictly reflects information available before the D-1 auction cutoff with zero look-ahead leakage
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <label htmlFor="decision-date" className="font-medium text-slate-500">
              Delivery Day:
            </label>
            <select
              id="decision-date"
              value={selectedDate}
              onChange={(e) => onChangeDate(e.target.value)}
              className="bg-transparent font-semibold text-slate-900 focus:outline-none cursor-pointer"
            >
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Cutoff Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-700">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <label htmlFor="decision-cutoff" className="font-medium text-slate-500">
              D-1 Cutoff:
            </label>
            <select
              id="decision-cutoff"
              value={selectedCutoff}
              onChange={(e) => onChangeCutoff(e.target.value)}
              className="bg-transparent font-semibold text-slate-900 focus:outline-none cursor-pointer"
            >
              {cutoffOptions.map((c) => (
                <option key={c} value={c}>
                  {c} London
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards (Adaptive Responsive Grid for All Zoom Levels) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4">
        <KpiCard
          title="Forecast Peak"
          value={formatMW(summary.forecast_peak_mw)}
          subtext="Maximum anticipated generation"
          icon={<TrendingUp className="w-4 h-4 text-sky-600" />}
        />

        <KpiCard
          title="Forecast Average"
          value={formatMW(summary.forecast_avg_mw)}
          subtext="Day-ahead expected generation"
          icon={<Gauge className="w-4 h-4 text-sky-600" />}
        />

        <KpiCard
          title="Expected Wind Energy"
          value={formatMWh(summary.forecast_total_mwh)}
          subtext="Total delivery day volume"
          icon={<Zap className="w-4 h-4 text-amber-500" />}
        />

        <KpiCard
          title="Matched Coverage"
          value={formatPercentAbs(summary.matched_coverage_pct)}
          subtext={`${summary.matched_half_hours} of 48 half-hours matched`}
          badge={{
            text: summary.matched_coverage_pct === 100 ? '100% Complete' : 'Partial',
            variant: summary.matched_coverage_pct === 100 ? 'positive' : 'warning',
          }}
          icon={<Clock className="w-4 h-4 text-emerald-600" />}
        />

        <KpiCard
          title="Forecast Published"
          value={formatLondonDateTime(summary.publish_time_used)}
          subtext="Latest run before D-1 cutoff"
          icon={<Clock className="w-4 h-4 text-slate-500" />}
        />
      </div>

      {/* Decision-Time Forecast Chart */}
      <ForecastChart data={half_hours} />

      {/* What-If Procurement Scenario Widget */}
      <WhatIfWidget
        forecastAvgMw={summary.forecast_avg_mw}
        p10LowerAvgMw={avgLower}
      />

      {/* Detailed Half-Hourly Settlement Table */}
      <HalfHourlyTable data={half_hours} date={selectedDate} />
    </div>
  );
};
