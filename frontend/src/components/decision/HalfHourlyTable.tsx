import React, { useState } from 'react';
import { DecisionHalfHour } from '../../types/api';
import {
  formatMW,
  formatPercent,
  formatSignedMW,
  formatTimeOnly,
} from '../../utils/formatters';
import { CsvDownloadButton } from '../shared/CsvDownloadButton';
import { Info } from 'lucide-react';

interface HalfHourlyTableProps {
  data: DecisionHalfHour[];
  date: string;
}

export const HalfHourlyTable: React.FC<HalfHourlyTableProps> = ({ data, date }) => {
  const [filterMode, setFilterMode] = useState<'all' | 'hourlyOnly'>('all');

  const displayedData = React.useMemo(() => {
    if (filterMode === 'hourlyOnly') {
      return data.filter((h) => h.settlement_period % 2 !== 0); // SP 1, 3, 5... (:00 timestamps)
    }
    return data;
  }, [data, filterMode]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-200">
      <div className="p-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/50">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              Half-Hourly Settlement Schedule
            </h3>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
              {displayedData.length} Settlement Periods
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span>Trading delivery schedule for {date} (Europe/London).</span>
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
              <Info className="w-3 h-3 text-sky-500" />
              WINDFOR 60-min hourly forecast applies to both half-hours of each hour
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Resolution toggle */}
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 text-xs shadow-2xs">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterMode === 'all'
                  ? 'bg-sky-600 dark:bg-sky-500 text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All 48 Half-Hours
            </button>
            <button
              onClick={() => setFilterMode('hourlyOnly')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterMode === 'hourlyOnly'
                  ? 'bg-sky-600 dark:bg-sky-500 text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Hourly Cadence (24 SPs)
            </button>
          </div>

          <CsvDownloadButton data={data} filename={`gridbricks_decision_series_${date}.csv`} />
        </div>
      </div>

      <div className="overflow-x-auto max-h-[460px] overflow-y-auto relative">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase font-bold sticky top-0 z-20 text-[11px] border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="py-2.5 px-3 sticky left-0 z-20 bg-slate-100 dark:bg-slate-800 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                SP
              </th>
              <th className="py-2.5 px-3 sticky left-12 z-20 bg-slate-100 dark:bg-slate-800 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                Start Time (London)
              </th>
              <th className="py-2.5 px-3 text-right">Decision Forecast</th>
              <th className="py-2.5 px-3 text-right">Actual Generation</th>
              <th className="py-2.5 px-3 text-right">Error (F − A)</th>
              <th className="py-2.5 px-3 text-right">% Error</th>
              <th className="py-2.5 px-3 text-right">Implied Actual Range (P10–P90)</th>
              <th className="py-2.5 px-3 text-right">Lead Horizon</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
            {displayedData.map((row) => {
              const isOver = row.error_mw !== null && row.error_mw > 0;
              const isUnder = row.error_mw !== null && row.error_mw < 0;
              const isEvenSp = row.settlement_period % 2 === 0;

              return (
                <tr
                  key={row.settlement_period}
                  className={`hover:bg-sky-50/40 dark:hover:bg-slate-800/60 transition-colors ${
                    isEvenSp ? 'bg-slate-50/30 dark:bg-slate-800/20' : 'bg-white dark:bg-slate-900'
                  }`}
                >
                  <td className="py-2 px-3 font-sans font-bold text-slate-800 dark:text-slate-200 sticky left-0 z-10 bg-inherit shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                    {row.settlement_period}
                  </td>
                  <td className="py-2 px-3 font-sans text-slate-600 dark:text-slate-400 sticky left-12 z-10 bg-inherit shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] whitespace-nowrap">
                    {formatTimeOnly(row.start_time)} GMT
                  </td>
                  <td className="py-2 px-3 text-right text-sky-700 dark:text-sky-400 font-bold whitespace-nowrap">
                    {row.forecast_missing ? (
                      <span className="text-slate-400 dark:text-slate-500 font-sans text-[10px] italic">Missing</span>
                    ) : (
                      formatMW(row.forecast_mw)
                    )}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-900 dark:text-slate-100 font-semibold whitespace-nowrap">
                    {row.actual_missing ? (
                      <span className="text-slate-400 dark:text-slate-500 font-sans text-[10px] italic">Pending</span>
                    ) : (
                      formatMW(row.actual_mw)
                    )}
                  </td>
                  <td
                    className={`py-2 px-3 text-right font-bold whitespace-nowrap ${
                      isOver ? 'text-amber-600 dark:text-amber-400' : isUnder ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {formatSignedMW(row.error_mw)}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {formatPercent(row.pct_error)}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-500 dark:text-slate-400 font-sans whitespace-nowrap">
                    {row.implied_actual_lower_mw !== null && row.implied_actual_upper_mw !== null
                      ? `${row.implied_actual_lower_mw} – ${row.implied_actual_upper_mw} MW`
                      : '—'}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-500 dark:text-slate-400 font-sans whitespace-nowrap">
                    {row.horizon_hours !== null ? `${row.horizon_hours}h` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
