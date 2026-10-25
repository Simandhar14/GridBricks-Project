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

  // Compute active states for buttons
  const isAllSelected =
    selectedVintages === null ||
    (vintages.length > 0 && selectedVintages.size === vintages.length);

  const isDecisionOnly =
    selectedVintages !== null &&
    selectedVintages.size === 1 &&
    decisionVintage !== undefined &&
    selectedVintages.has(decisionVintage.publish_time);

  const toggleVintage = (pubTime: string) => {
    setSelectedVintages((prev) => {
      const next = prev ? new Set(prev) : new Set(vintages.map((v) => v.publish_time));
      if (next.has(pubTime)) {
        next.delete(pubTime);
      } else {
        next.add(pubTime);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedVintages(new Set(vintages.map((v) => v.publish_time)));
  };

  const selectDecisionOnly = () => {
    if (decisionVintage) {
      setSelectedVintages(new Set([decisionVintage.publish_time]));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Multi-Vintage Forecast Revision History
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Trace successive weather forecast revisions leading up to and after the D-1 decision
          </p>
        </div>

        {/* Date & Cutoff Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <label htmlFor="revisions-date" className="font-medium text-slate-500">
              Delivery Day:
            </label>
            <select
              id="revisions-date"
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

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-700">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <label htmlFor="revisions-cutoff" className="font-medium text-slate-500">
              D-1 Cutoff:
            </label>
            <select
              id="revisions-cutoff"
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
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Filter Model Vintages ({vintages.length} runs)
            </h4>
            <p className="text-[11px] text-slate-500">
              Toggle specific publication times to inspect how projections evolved
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={selectAll}
              className={`px-3 py-1.5 rounded-lg transition-all font-semibold shadow-xs ${
                isAllSelected
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Select All ({vintages.length})
            </button>
            <button
              type="button"
              onClick={selectDecisionOnly}
              className={`px-3 py-1.5 rounded-lg transition-all font-semibold shadow-xs ${
                isDecisionOnly
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
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
                type="button"
                key={v.publish_time}
                onClick={() => toggleVintage(v.publish_time)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                  v.is_decision_forecast
                    ? isVisible
                      ? 'bg-sky-600 text-white border-sky-600 shadow-sm font-bold'
                      : 'bg-sky-50 text-sky-700 border-sky-300 opacity-60'
                    : isVisible
                    ? 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200 font-medium'
                    : 'bg-white text-slate-400 border-slate-200 opacity-50'
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
