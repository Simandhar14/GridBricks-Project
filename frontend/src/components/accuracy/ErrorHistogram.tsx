import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { ErrorDistributionResponse } from '../../types/api';
import { formatMW } from '../../utils/formatters';

interface ErrorHistogramProps {
  data: ErrorDistributionResponse;
}

export const ErrorHistogram: React.FC<ErrorHistogramProps> = ({ data }) => {
  const { histogram, quantiles } = data;

  const chartData = React.useMemo(() => {
    return histogram.map((b) => ({
      binLabel: `${Math.round(b.bin_left_mw)}`,
      rangeLabel: `${Math.round(b.bin_left_mw)} to ${Math.round(b.bin_right_mw)} MW`,
      count: b.count,
    }));
  }, [histogram]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Signed Error Distribution & Tail Quantiles
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Frequency histogram of forecast error (Forecast − Actual) across the selected period
          </p>
        </div>

        {/* Quantile badges - Perfectly aligned, uniform height, non-wrapping values */}
        <div className="flex flex-wrap items-center gap-2 text-xs shrink-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 whitespace-nowrap shadow-xs">
            <span className="font-semibold text-[11px] uppercase tracking-wider text-emerald-700">P10:</span>
            <span className="font-mono font-bold">{formatMW(quantiles.p10)}</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-800 whitespace-nowrap shadow-xs">
            <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-600">Median (P50):</span>
            <span className="font-mono font-bold">{formatMW(quantiles.p50)}</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-800 whitespace-nowrap shadow-xs">
            <span className="font-semibold text-[11px] uppercase tracking-wider text-rose-700">P90:</span>
            <span className="font-mono font-bold">{formatMW(quantiles.p90)}</span>
          </div>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="binLabel"
              stroke="#94a3b8"
              fontSize={10}
              tickLine={false}
              interval={1}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}`}
            />
            <Tooltip content={<HistoTooltip />} />
            <Bar dataKey="count" name="Frequency" fill="#3b82f6" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const HistoTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0].payload;

  return (
    <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-lg border border-slate-800 text-xs space-y-1 min-w-[170px]">
      <div className="font-semibold text-slate-200 border-b border-slate-700 pb-1">
        Bin Range: {item.rangeLabel}
      </div>
      <div className="flex justify-between text-sky-400">
        <span>Half-Hour Count:</span>
        <span className="font-mono font-bold">{item.count}</span>
      </div>
    </div>
  );
};
