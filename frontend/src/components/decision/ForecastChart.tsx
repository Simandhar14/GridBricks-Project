import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { DecisionHalfHour } from '../../types/api';
import { formatLondonDateTime, formatMW, formatTimeOnly } from '../../utils/formatters';

interface ForecastChartProps {
  data: DecisionHalfHour[];
}

interface ChartItem {
  timeStr: string;
  start_time: string;
  sp: number;
  forecast_mw: number | null;
  actual_mw: number | null;
  band_base: number | null;
  band_range: number | null;
  lower_bound: number | null;
  upper_bound: number | null;
  horizon_hours: number | null;
  error_mw: number | null;
}

export const ForecastChart: React.FC<ForecastChartProps> = ({ data }) => {
  const chartData: ChartItem[] = React.useMemo(() => {
    return data.map((h) => {
      const lower = h.implied_actual_lower_mw;
      const upper = h.implied_actual_upper_mw;
      const hasBand = lower !== null && upper !== null;

      return {
        timeStr: formatTimeOnly(h.start_time),
        start_time: h.start_time,
        sp: h.settlement_period,
        forecast_mw: h.forecast_mw,
        actual_mw: h.actual_mw,
        band_base: hasBand ? lower : null,
        band_range: hasBand && upper !== null && lower !== null ? Math.max(0, upper - lower) : null,
        lower_bound: lower,
        upper_bound: upper,
        horizon_hours: h.horizon_hours,
        error_mw: h.error_mw,
      };
    });
  }, [data]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Decision-Time Forecast vs. Actual Generation
          </h3>
          <p className="text-xs text-slate-500">
            Shaded envelope denotes the historical empirical P10–P90 implied actual range
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-sky-600 inline-block" />
            <span className="text-slate-600 font-medium">Decision Forecast</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-slate-900 inline-block" />
            <span className="text-slate-600 font-medium">Actuals</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 bg-sky-100 border border-sky-300 rounded inline-block" />
            <span className="text-slate-600 font-medium">P10–P90 Band</span>
          </div>
        </div>
      </div>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="timeStr"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              interval={3}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v} MW`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend display="none" />

            {/* Empirical Range Band (Stacked Area) */}
            <Area
              dataKey="band_base"
              stackId="band"
              stroke="none"
              fill="transparent"
              isAnimationActive={false}
            />
            <Area
              dataKey="band_range"
              stackId="band"
              stroke="#7dd3fc"
              strokeDasharray="2 2"
              fill="#e0f2fe"
              fillOpacity={0.6}
              name="P10–P90 Range"
              isAnimationActive={false}
            />

            {/* Lines */}
            <Line
              type="monotone"
              dataKey="forecast_mw"
              name="Forecast"
              stroke="#0284c7"
              strokeWidth={2.5}
              dot={{ r: 2.5, fill: '#0284c7' }}
              activeDot={{ r: 5 }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="actual_mw"
              name="Actual"
              stroke="#0f172a"
              strokeWidth={2}
              dot={{ r: 2, fill: '#0f172a' }}
              activeDot={{ r: 5 }}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const item: ChartItem = payload[0].payload;

  return (
    <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-lg border border-slate-800 text-xs space-y-1.5 min-w-[200px]">
      <div className="font-semibold text-slate-200 border-b border-slate-700 pb-1 flex justify-between">
        <span>{formatLondonDateTime(item.start_time)}</span>
        <span className="text-slate-400">SP {item.sp}</span>
      </div>

      <div className="space-y-1 pt-0.5">
        <div className="flex justify-between items-center text-sky-400">
          <span>Decision Forecast:</span>
          <span className="font-mono font-bold">{formatMW(item.forecast_mw)}</span>
        </div>

        <div className="flex justify-between items-center text-slate-200">
          <span>Actual Generation:</span>
          <span className="font-mono font-bold">{formatMW(item.actual_mw)}</span>
        </div>

        {item.error_mw !== null && (
          <div className="flex justify-between items-center text-slate-300">
            <span>Forecast Error:</span>
            <span className={`font-mono font-bold ${item.error_mw > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {item.error_mw > 0 ? `+${item.error_mw} MW` : `${item.error_mw} MW`}
            </span>
          </div>
        )}

        {item.lower_bound !== null && item.upper_bound !== null && (
          <div className="flex justify-between items-center text-sky-200/80 text-[11px] pt-1 border-t border-slate-800">
            <span>P10–P90 Range:</span>
            <span className="font-mono">
              {item.lower_bound} – {item.upper_bound} MW
            </span>
          </div>
        )}

        {item.horizon_hours !== null && (
          <div className="text-[10px] text-slate-400 text-right">
            Lead Horizon: {item.horizon_hours}h
          </div>
        )}
      </div>
    </div>
  );
};

