import React, { useState } from 'react';
import { useForecastRevisions } from '../../api/useForecast';
import { useMeta } from '../../api/useMeta';
import { formatLondonDateTime } from '../../utils/formatters';
import { ErrorState } from '../shared/ErrorState';
import { KpiCard } from '../shared/KpiCard';
import { LoadingSkeleton } from '../shared/LoadingSkeleton';
import { RevisionsChart } from './RevisionsChart';
import { Calendar, Clock, Layers, CheckCircle2 } from 'lucide-react';

interface RevisionsViewProps {
  selectedDate: string;
  onChangeDate: (date: string) => void;
  selectedCutoff: string;
  onChangeCutoff: (cutoff: string) => void;
}

export const RevisionsView: React.FC<RevisionsViewProps> = ({
  selectedDate,
  onChangeDate,
  selectedCutoff,
  onChangeCutoff,
}) => {
  const { data: meta } = useMeta();
  const { data, isLoading, isError, error, refetch } = useForecastRevisions(
    selectedDate,
    selectedCutoff
  );

  const [selectedVintages, setSelectedVintages] = useState<Set<string> | null>(null);

  const availableDates = meta?.available_dates || [];
  const cutoffOptions = meta?.cutoff_options || ['06:00', '09:00', '12:00'];

  if (isLoading) {
    return <LoadingSkeleton rows={4} height="h-96" />;
  }

  if (isError || !data) {
    return (
      <ErrorState
        title="Failed to load forecast revisions"
        message={error?.message || 'Check connection to backend server'}
        onRetry={refetch}
      />
    );
  }

  const { vintages, actuals } = data;
  const decisionVintage = vintages.find((v) => v.is_decision_forecast);

  const toggleVintage = (pubTime: string) => {
    setSelectedVintages((prev) => {
      const next = new Set(prev ? prev : vintages.map((v) => v.publish_time));
      if (next.has(pubTime)) {
        next.delete(pubTime);
      } else {
        next.add(pubTime);
      }
      return next;
    });
  };

  const selectAll = () => setSelectedVintages(null);
  const selectDecisionOnly = () => {
    if (decisionVintage) {
      setSelectedVintages(new Set([decisionVintage.publish_time]));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors duration-200">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
            Multi-Vintage Forecast Revision History
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Trace successive weather forecast revisions leading up to and after the D-1 decision
          </p>
        </div>

        {/* Date & Cutoff Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <label htmlFor="revisions-date" className="font-medium text-slate-500 dark:text-slate-400">
              Delivery Day:
            </label>
            <select
              id="revisions-date"
              value={selectedDate}
              onChange={(e) => onChangeDate(e.target.value)}
              className="bg-transparent font-semibold text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer [&>option]:bg-white [&>option]:dark:bg-slate-800 [&>option]:dark:text-slate-100"
            >
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <label htmlFor="revisions-cutoff" className="font-medium text-slate-500 dark:text-slate-400">
              D-1 Cutoff:
            </label>
            <select
              id="revisions-cutoff"
              value={selectedCutoff}
              onChange={(e) => onChangeCutoff(e.target.value)}
              className="bg-transparent font-semibold text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer [&>option]:bg-white [&>option]:dark:bg-slate-800 [&>option]:dark:text-slate-100"
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Total Vintages Published"
          value={`${vintages.length}`}
          subtext="Available model runs for this delivery day"
          icon={<Layers className="w-4 h-4 text-sky-600" />}
        />

        <KpiCard
          title="Decision Vintage Cutoff"
          value={selectedCutoff}
          subtext={`Cutoff at ${selectedCutoff} London on D-1`}
          icon={<Clock className="w-4 h-4 text-indigo-500" />}
        />

        <KpiCard
          title="Decision Vintage Run"
          value={decisionVintage ? formatLondonDateTime(decisionVintage.publish_time) : 'None'}
          subtext="Latest run before D-1 cutoff"
          badge={{ text: 'Active Choice', variant: 'positive' }}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
        />
      </div>

      {/* Main Revisions Line Chart */}
      <RevisionsChart
        vintages={vintages}
        actuals={actuals}
        visibleVintages={selectedVintages ?? undefined}
      />

      {/* Vintage Filter Pills */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm space-y-3 transition-colors duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Filter Model Vintages ({vintages.length} runs)
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Toggle specific publication times to inspect how projections evolved
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={selectAll}
              className="px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 rounded transition-colors font-medium border border-transparent dark:border-slate-700"
            >
              Select All
            </button>
            <button
              onClick={selectDecisionOnly}
              className="px-2.5 py-1 text-sky-700 dark:text-sky-300 hover:text-sky-900 dark:hover:text-white bg-sky-50 dark:bg-sky-950/80 hover:bg-sky-100 dark:hover:bg-sky-900 border border-sky-200 dark:border-sky-800 rounded transition-colors font-medium"
            >
              Decision Run Only
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pt-1">
          {vintages.map((v) => {
            const isVisible = selectedVintages ? selectedVintages.has(v.publish_time) : true;
            return (
              <button
                key={v.publish_time}
                onClick={() => toggleVintage(v.publish_time)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                  v.is_decision_forecast
                    ? isVisible
                      ? 'bg-sky-600 dark:bg-sky-500 text-white border-sky-600 dark:border-sky-500 shadow-sm font-bold'
                      : 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800 opacity-60'
                    : isVisible
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                    : 'bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 opacity-50'
                }`}
              >
                <span>{formatLondonDateTime(v.publish_time)}</span>
                {v.is_decision_forecast && (
                  <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-sky-800 text-white font-semibold">
                    Decision
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

