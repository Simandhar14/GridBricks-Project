import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { HorizonAccuracyItem } from '../../types/api';
import { formatMW, formatSignedMW } from '../../utils/formatters';

interface HorizonChartProps {
  data: HorizonAccuracyItem[];
}

export const HorizonChart: React.FC<HorizonChartProps> = ({ data }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Error vs. Lead Horizon (Lead-Time Degradation)
          </h3>
          <p className="text-xs text-slate-500">
            How forecast accuracy degrades as lead time increases (0–6h to 48h+)
          </p>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v} MW`}
            />
            <Tooltip content={<HorizonTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} iconType="circle" />
            <Bar
              dataKey="mae_mw"
              name="MAE (MW)"
              fill="#0ea5e9"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="bias_mw"
              name="Bias (MW)"
              fill="#f59e0b"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const HorizonTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const b: HorizonAccuracyItem = payload[0].payload;

  return (
    <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-lg border border-slate-800 text-xs space-y-1 min-w-[170px]">
      <div className="font-semibold text-slate-200 border-b border-slate-700 pb-1">
        Lead Horizon: {b.label}
      </div>
      <div className="flex justify-between text-sky-400">
        <span>MAE:</span>
        <span className="font-mono font-bold">{formatMW(b.mae_mw)}</span>
      </div>
      <div className="flex justify-between text-amber-400">
        <span>Bias:</span>
        <span className="font-mono font-bold">{formatSignedMW(b.bias_mw)}</span>
      </div>
      <div className="flex justify-between text-slate-400 text-[11px] pt-0.5 border-t border-slate-800">
        <span>Evaluated Points:</span>
        <span className="font-mono">{b.n_points}</span>
      </div>
    </div>
  );
};

