import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { DailyAccuracyItem } from '../../types/api';
import { formatMW, formatSignedMW } from '../../utils/formatters';

interface DailyErrorChartProps {
  data: DailyAccuracyItem[];
}

export const DailyErrorChart: React.FC<DailyErrorChartProps> = ({ data }) => {
  const chartData = React.useMemo(() => {
    return data.map((d) => ({
      dateLabel: d.date.slice(5), // "01-15"
      fullDate: d.date,
      mae: d.mae_mw,
      bias: d.bias_mw,
      p90: d.p90_abs_error_mw,
      wape: d.wape_pct,
    }));
  }, [data]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Daily Forecast Error Trend
          </h3>
          <p className="text-xs text-slate-500">
            Day-by-day Mean Absolute Error (MAE), Bias, and P90 Tail Error
          </p>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="dateLabel" stroke="#94a3b8" fontSize={11} tickLine={false} />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v} MW`}
            />
            <Tooltip content={<DailyTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              iconType="circle"
            />
            <Bar
              dataKey="bias"
              name="Daily Bias (MW)"
              fill="#94a3b8"
              opacity={0.4}
              radius={[3, 3, 0, 0]}
            />
            <Line
              type="monotone"
              dataKey="mae"
              name="MAE (MW)"
              stroke="#0284c7"
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="p90"
              name="P90 Abs Error (MW)"
              stroke="#e11d48"
              strokeDasharray="3 3"
              strokeWidth={1.5}
              dot={{ r: 1.5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const DailyTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;

  return (
    <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-lg border border-slate-800 text-xs space-y-1 min-w-[170px]">
      <div className="font-semibold text-slate-200 border-b border-slate-700 pb-1">
        Delivery Date: {d.fullDate}
      </div>
      <div className="flex justify-between text-sky-400">
        <span>MAE:</span>
        <span className="font-mono font-bold">{formatMW(d.mae)}</span>
      </div>
      <div className="flex justify-between text-slate-300">
        <span>Bias:</span>
        <span className="font-mono font-bold">{formatSignedMW(d.bias)}</span>
      </div>
      <div className="flex justify-between text-rose-400">
        <span>P90 Error:</span>
        <span className="font-mono font-bold">{formatMW(d.p90)}</span>
      </div>
      {d.wape !== null && (
        <div className="flex justify-between text-amber-300 pt-1 border-t border-slate-800 text-[11px]">
          <span>WAPE:</span>
          <span className="font-mono font-bold">{d.wape}%</span>
        </div>
      )}
    </div>
  );
};

