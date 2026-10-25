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
import { HourlyAccuracyItem } from '../../types/api';
import { formatMW, formatSignedMW } from '../../utils/formatters';
import { useTheme } from '../../context/ThemeContext';

interface HourOfDayChartProps {
  data: HourlyAccuracyItem[];
}

export const HourOfDayChart: React.FC<HourOfDayChartProps> = ({ data }) => {
  const { isDark } = useTheme();

  const chartData = React.useMemo(() => {
    return data.map((h) => ({
      hourLabel: `${h.hour_utc.toString().padStart(2, '0')}:00`,
      hour: h.hour_utc,
      mae: h.mae_mw,
      bias: h.bias_mw,
      wape: h.wape_pct,
    }));
  }, [data]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm transition-colors duration-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
            Error by Hour of the Day (Diurnal Cycle)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Assessing daytime thermal vs. overnight wind forecast stability (UTC / London)
          </p>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? '#334155' : '#f1f5f9'}
              vertical={false}
            />
            <XAxis
              dataKey="hourLabel"
              stroke={isDark ? '#64748b' : '#94a3b8'}
              fontSize={11}
              tickLine={false}
            />
            <YAxis
              stroke={isDark ? '#64748b' : '#94a3b8'}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v} MW`}
            />
            <Tooltip content={<HourTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} iconType="circle" />
            <Bar
              dataKey="bias"
              name="Hourly Bias (MW)"
              fill="#c084fc"
              opacity={0.5}
              radius={[3, 3, 0, 0]}
            />
            <Line
              type="monotone"
              dataKey="mae"
              name="MAE (MW)"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const HourTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const h = payload[0].payload;

  return (
    <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-lg border border-slate-800 text-xs space-y-1 min-w-[170px]">
      <div className="font-semibold text-slate-200 border-b border-slate-700 pb-1">
        Target Hour: {h.hourLabel} GMT
      </div>
      <div className="flex justify-between text-indigo-400">
        <span>MAE:</span>
        <span className="font-mono font-bold">{formatMW(h.mae)}</span>
      </div>
      <div className="flex justify-between text-purple-300">
        <span>Bias:</span>
        <span className="font-mono font-bold">{formatSignedMW(h.bias)}</span>
      </div>
      {h.wape !== null && (
        <div className="flex justify-between text-amber-300 pt-1 border-t border-slate-800 text-[11px]">
          <span>WAPE:</span>
          <span className="font-mono font-bold">{h.wape}%</span>
        </div>
      )}
    </div>
  );
};

