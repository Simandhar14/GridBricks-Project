import React from 'react';
import { DecisionHalfHour } from '../../types/api';
import {
  formatMW,
  formatPercent,
  formatSignedMW,
  formatTimeOnly,
} from '../../utils/formatters';
import { CsvDownloadButton } from '../shared/CsvDownloadButton';

interface HalfHourlyTableProps {
  data: DecisionHalfHour[];
  date: string;
}

export const HalfHourlyTable: React.FC<HalfHourlyTableProps> = ({ data, date }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 sm:px-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Half-Hourly Settlement Schedule
          </h3>
          <p className="text-xs text-slate-500">
            All 48 settlement periods for {date} (Europe/London)
          </p>
        </div>
        <CsvDownloadButton data={data} filename={`gridbricks_decision_series_${date}.csv`} />
      </div>

      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-100 text-slate-600 uppercase font-semibold sticky top-0 z-10 text-[11px] border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3">SP</th>
              <th className="py-2.5 px-3">Start Time (London)</th>
              <th className="py-2.5 px-3 text-right">Decision Forecast</th>
              <th className="py-2.5 px-3 text-right">Actual</th>
              <th className="py-2.5 px-3 text-right">Error (F − A)</th>
              <th className="py-2.5 px-3 text-right">% Error</th>
              <th className="py-2.5 px-3 text-right">Implied Actual Range (P10–P90)</th>
              <th className="py-2.5 px-3 text-right">Lead Horizon</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
            {data.map((row) => {
              const isOver = row.error_mw !== null && row.error_mw > 0;
              const isUnder = row.error_mw !== null && row.error_mw < 0;

              return (
                <tr key={row.settlement_period} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2 px-3 font-sans font-semibold text-slate-700">
                    {row.settlement_period}
                  </td>
                  <td className="py-2 px-3 font-sans text-slate-600">
                    {formatTimeOnly(row.start_time)} GMT
                  </td>
                  <td className="py-2 px-3 text-right text-sky-700 font-bold">
                    {row.forecast_missing ? (
                      <span className="text-slate-400 font-sans text-[10px] italic">Missing</span>
                    ) : (
                      formatMW(row.forecast_mw)
                    )}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-900 font-semibold">
                    {row.actual_missing ? (
                      <span className="text-slate-400 font-sans text-[10px] italic">Pending</span>
                    ) : (
                      formatMW(row.actual_mw)
                    )}
                  </td>
                  <td
                    className={`py-2 px-3 text-right font-bold ${
                      isOver ? 'text-amber-600' : isUnder ? 'text-emerald-600' : 'text-slate-500'
                    }`}
                  >
                    {formatSignedMW(row.error_mw)}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-600">
                    {formatPercent(row.pct_error)}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-500 font-sans">
                    {row.implied_actual_lower_mw !== null && row.implied_actual_upper_mw !== null
                      ? `${row.implied_actual_lower_mw} – ${row.implied_actual_upper_mw} MW`
                      : '—'}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-500 font-sans">
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
