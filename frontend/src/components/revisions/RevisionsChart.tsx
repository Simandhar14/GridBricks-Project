import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { ForecastVintage, RevisionActual } from '../../types/api';
import { formatMW, formatTimeOnly } from '../../utils/formatters';

interface RevisionsChartProps {
  vintages: ForecastVintage[];
  actuals: RevisionActual[];
  visibleVintages?: Set<string>;
}

export const RevisionsChart: React.FC<RevisionsChartProps> = ({
  vintages,
  actuals,
  visibleVintages,
}) => {
  // Build time-series aligned on start_time
  const { chartData, vintageKeys } = React.useMemo(() => {
    const timeMap = new Map<string, any>();

    // 1. Add actuals
    for (const a of actuals) {
      timeMap.set(a.start_time, {
        start_time: a.start_time,
        timeStr: formatTimeOnly(a.start_time),
        actual_mw: a.actual_mw,
      });
    }

    // 2. Add each vintage
    const keys: { pub: string; isDecision: boolean }[] = [];

    for (const v of vintages) {
      if (visibleVintages && !visibleVintages.has(v.publish_time)) {
        continue;
      }
      keys.push({ pub: v.publish_time, isDecision: v.is_decision_forecast });

      for (const pt of v.half_hours) {
        if (!timeMap.has(pt.start_time)) {
          timeMap.set(pt.start_time, {
            start_time: pt.start_time,
            timeStr: formatTimeOnly(pt.start_time),
            actual_mw: null,
          });
        }
        timeMap.get(pt.start_time)[`v_${v.publish_time}`] = pt.forecast_mw;
      }
    }

    const sortedData = Array.from(timeMap.values()).sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    return { chartData: sortedData, vintageKeys: keys };
  }, [vintages, actuals, visibleVintages]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Evolution of Forecast Vintages vs. Confirmed Actuals
          </h3>
          <p className="text-xs text-slate-500">
            See how weather model predictions evolved leading up to and after the D-1 auction gate
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1 bg-sky-600 rounded inline-block" />
            <span className="text-slate-800 font-bold">Decision Forecast (Cutoff)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-slate-300 rounded inline-block" />
            <span className="text-slate-500">Other Vintages</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1 bg-slate-950 rounded inline-block" />
            <span className="text-slate-900 font-bold">Actuals</span>
          </div>
        </div>
      </div>

      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="timeStr" stroke="#94a3b8" fontSize={11} tickLine={false} interval={3} />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v} MW`}
            />
            <Tooltip content={<RevisionsTooltip />} />

            {/* Other vintages first (background) */}
            {vintageKeys
              .filter((k) => !k.isDecision)
              .map((k) => (
                <Line
                  key={k.pub}
                  type="monotone"
                  dataKey={`v_${k.pub}`}
                  stroke="#94a3b8"
                  strokeWidth={1}
                  strokeOpacity={0.4}
                  dot={false}
                  activeDot={false}
                  connectNulls={false}
                />
              ))}

            {/* Decision vintage (highlighted bold blue) */}
            {vintageKeys
              .filter((k) => k.isDecision)
              .map((k) => (
                <Line
                  key={k.pub}
                  type="monotone"
                  dataKey={`v_${k.pub}`}
                  stroke="#0284c7"
                  strokeWidth={3}
                  dot={{ r: 2.5, fill: '#0284c7' }}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                />
              ))}

            {/* Actuals Line (solid dark) */}
            <Line
              type="monotone"
              dataKey="actual_mw"
              stroke="#090d16"
              strokeWidth={2.5}
              dot={{ r: 2, fill: '#090d16' }}
              activeDot={{ r: 5 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const RevisionsTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0].payload;

  // Find decision vintage value if present
  const decisionKey = Object.keys(item).find((k) => k.startsWith('v_') && payload.some((p: any) => p.dataKey === k && p.stroke === '#0284c7'));
  const decisionVal = decisionKey ? item[decisionKey] : null;

  return (
    <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-lg border border-slate-800 text-xs space-y-1.5 min-w-[200px]">
      <div className="font-semibold text-slate-200 border-b border-slate-700 pb-1 flex justify-between">
        <span>Target: {formatTimeOnly(item.start_time)} GMT</span>
        <span className="text-slate-400">{item.start_time.slice(0, 10)}</span>
      </div>

      <div className="space-y-1 pt-0.5">
        <div className="flex justify-between items-center text-slate-200">
          <span>Actual Generation:</span>
          <span className="font-mono font-bold">{formatMW(item.actual_mw)}</span>
        </div>

        {decisionVal !== null && (
          <div className="flex justify-between items-center text-sky-400">
            <span>Decision Forecast:</span>
            <span className="font-mono font-bold">{formatMW(decisionVal)}</span>
          </div>
        )}

        <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
          Showing {payload.filter((p: any) => p.dataKey.startsWith('v_')).length} forecast vintages
        </div>
      </div>
    </div>
  );
};
