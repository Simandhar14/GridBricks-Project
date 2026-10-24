import React from 'react';
import {
  useAccuracySummary,
  useDailyAccuracy,
  useErrorDistribution,
  useHorizonAccuracy,
  useHourlyAccuracy,
} from '../../api/useAccuracy';
import { useMeta } from '../../api/useMeta';
import { formatMW, formatPercentAbs, formatSignedMW } from '../../utils/formatters';
import { ErrorState } from '../shared/ErrorState';
import { KpiCard } from '../shared/KpiCard';
import { LoadingSkeleton } from '../shared/LoadingSkeleton';
import { DailyErrorChart } from './DailyErrorChart';
import { ErrorHistogram } from './ErrorHistogram';
import { HorizonChart } from './HorizonChart';
import { HourOfDayChart } from './HourOfDayChart';
import { Calendar, Clock, Lightbulb, Activity, Target, Shield, Percent } from 'lucide-react';

interface AccuracyViewProps {
  startDate: string;
  endDate: string;
  onChangeStartDate: (d: string) => void;
  onChangeEndDate: (d: string) => void;
  selectedCutoff: string;
  onChangeCutoff: (c: string) => void;
}

export const AccuracyView: React.FC<AccuracyViewProps> = ({
  startDate,
  endDate,
  onChangeStartDate,
  onChangeEndDate,
  selectedCutoff,
  onChangeCutoff,
}) => {
  const { data: meta } = useMeta();
  const summaryQuery = useAccuracySummary(startDate, endDate, selectedCutoff);
  const dailyQuery = useDailyAccuracy(startDate, endDate, selectedCutoff);
  const hourlyQuery = useHourlyAccuracy(startDate, endDate, selectedCutoff);
  const horizonQuery = useHorizonAccuracy(startDate, endDate);
  const distQuery = useErrorDistribution(startDate, endDate, selectedCutoff);

  const isLoading =
    summaryQuery.isLoading ||
    dailyQuery.isLoading ||
    hourlyQuery.isLoading ||
    horizonQuery.isLoading ||
    distQuery.isLoading;

  const isError =
    summaryQuery.isError ||
    dailyQuery.isError ||
    hourlyQuery.isError ||
    horizonQuery.isError ||
    distQuery.isError;

  if (isLoading) {
    return <LoadingSkeleton rows={5} height="h-96" />;
  }

  if (isError || !summaryQuery.data) {
    return (
      <ErrorState
        title="Failed to load accuracy metrics"
        message="Could not load aggregate error metrics for the selected period."
        onRetry={() => {
          summaryQuery.refetch();
          dailyQuery.refetch();
          hourlyQuery.refetch();
          horizonQuery.refetch();
          distQuery.refetch();
        }}
      />
    );
  }

  const s = summaryQuery.data;
  const availableDates = meta?.available_dates || [];
  const cutoffOptions = meta?.cutoff_options || ['06:00', '09:00', '12:00'];

  // Plain-English trader insight
  const biasVal = s.bias_mw ?? 0;
  const p90Val = s.p90_abs_error_mw ?? 0;
  const isOverForecasting = biasVal > 0;

  return (
    <div className="space-y-6">
      {/* View Header & Date-Range Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Decision-Time Forecast Accuracy & Risk Evaluation
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Benchmark forecast performance against confirmed FUELHH generation actuals
          </p>
        </div>

        {/* Date Range & Cutoff Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <label htmlFor="accuracy-start" className="font-medium text-slate-500">
              Period:
            </label>
            <select
              id="accuracy-start"
              value={startDate}
              onChange={(e) => onChangeStartDate(e.target.value)}
              className="bg-transparent font-semibold text-slate-900 focus:outline-none cursor-pointer"
            >
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <span className="text-slate-400">→</span>
            <select
              id="accuracy-end"
              value={endDate}
              onChange={(e) => onChangeEndDate(e.target.value)}
              className="bg-transparent font-semibold text-slate-900 focus:outline-none cursor-pointer"
            >
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-700">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <label htmlFor="accuracy-cutoff" className="font-medium text-slate-500">
              D-1 Cutoff:
            </label>
            <select
              id="accuracy-cutoff"
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

      {/* Trader Insight Callout Banner */}
      <div className="bg-sky-50/80 border border-sky-200 rounded-xl p-4 sm:p-5 flex items-start gap-3.5">
        <div className="p-2 rounded-lg bg-sky-100 text-sky-700 shrink-0 mt-0.5">
          <Lightbulb className="w-5 h-5" />
        </div>
        <div className="text-xs text-sky-950 space-y-1">
          <div className="font-bold text-sm tracking-tight text-sky-900">
            What This Means For Procurement & Trading
          </div>
          <p className="leading-relaxed">
            {isOverForecasting ? (
              <>
                On average across the selected period, the decision-time forecast{' '}
                <strong>over-predicts actual wind generation by {formatMW(Math.abs(biasVal))}</strong>{' '}
                (positive bias). If procuring strictly against the raw forecast, your desk risks{' '}
                <strong>under-contracting alternative generation</strong>.
              </>
            ) : (
              <>
                On average across the selected period, the decision-time forecast{' '}
                <strong>under-predicts actual wind generation by {formatMW(Math.abs(biasVal))}</strong>{' '}
                (negative bias).
              </>
            )}
          </p>
          <p className="text-sky-800 font-medium">
            💡 Practical Rule-of-Thumb: Maintain a reserve purchasing buffer of{' '}
            <strong>~{formatMW(p90Val)}</strong> to cover forecast shortfall with ~90% empirical confidence.
          </p>
        </div>
      </div>

      {/* KPI Cards (Adaptive Responsive Grid for All Zoom Levels) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4">
        <KpiCard
          title="MAE (Mean Absolute Error)"
          value={formatMW(s.mae_mw)}
          subtext="Average magnitude of forecast error"
          icon={<Activity className="w-4 h-4 text-sky-600" />}
        />

        <KpiCard
          title="RMSE (Root Mean Sq. Error)"
          value={formatMW(s.rmse_mw)}
          subtext="Penalizes large forecast excursions"
          icon={<Target className="w-4 h-4 text-indigo-600" />}
        />

        <KpiCard
          title="Mean Bias"
          value={formatSignedMW(s.bias_mw)}
          subtext={isOverForecasting ? 'Persistent over-forecast' : 'Persistent under-forecast'}
          badge={{
            text: isOverForecasting ? '+ Over' : '− Under',
            variant: isOverForecasting ? 'warning' : 'neutral',
          }}
          icon={<Shield className="w-4 h-4 text-purple-600" />}
        />

        <KpiCard
          title="WAPE"
          value={formatPercentAbs(s.wape_pct)}
          subtext="Volume-weighted error (prefer over MAPE)"
          icon={<Percent className="w-4 h-4 text-amber-500" />}
        />

        <KpiCard
          title="P90 Abs Error"
          value={formatMW(s.p90_abs_error_mw)}
          subtext="90% of half-hour errors fall within this"
          badge={{ text: 'Tail Risk', variant: 'danger' }}
          icon={<Shield className="w-4 h-4 text-rose-500" />}
        />
      </div>

      {/* Charts 2x2 Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {dailyQuery.data && <DailyErrorChart data={dailyQuery.data.days} />}
        {hourlyQuery.data && <HourOfDayChart data={hourlyQuery.data.hours} />}
        {horizonQuery.data && <HorizonChart data={horizonQuery.data.buckets} />}
        {distQuery.data && <ErrorHistogram data={distQuery.data} />}
      </div>
    </div>
  );
};

