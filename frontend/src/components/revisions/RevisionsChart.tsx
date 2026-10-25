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
          <p className="text-xs text-slate-500 mt-0.5">
            See how weather model predictions evolved leading up to and after the D-1 auction gate ({vintageKeys.length} runs displayed)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1 bg-sky-600 rounded inline-block" />
            <span className="text-slate-800 font-bold">Decision Forecast (Cutoff)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-slate-400 rounded inline-block" />
            <span className="text-slate-600">Other Vintages ({vintageKeys.filter(k => !k.isDecision).length})</span>
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
            <Tooltip content={<RevisionsTooltip />} />

            {/* Other vintages first (background fan lines) */}
            {vintageKeys
              .filter((k) => !k.isDecision)
              .map((k) => (
                <Line
                  key={k.pub}
                  type="monotone"
                  dataKey={`v_${k.pub}`}
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  strokeOpacity={0.65}
                  dot={false}
                  activeDot={false}
                  connectNulls={true}
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
                  name="Decision Forecast"
                  connectNulls={true}
                />
              ))}

            {/* Actuals Line */}
            <Line
              type="monotone"
              dataKey="actual_mw"
              stroke="#0f172a"
              strokeWidth={2.5}
              dot={{ r: 2, fill: '#0f172a' }}
              activeDot={{ r: 5 }}
              name="Actuals"
              connectNulls={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const RevisionsTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  const actualItem = payload.find((p: any) => p.dataKey === 'actual_mw');
  const decisionItem = payload.find((p: any) => p.name === 'Decision Forecast');
  const otherItems = payload.filter(
    (p: any) => p.dataKey !== 'actual_mw' && p.name !== 'Decision Forecast'
  );

  return (
    <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl border border-slate-800 text-xs space-y-1.5 min-w-[200px] max-w-xs">
      <div className="font-semibold text-slate-200 border-b border-slate-700 pb-1 flex justify-between items-center">
        <span>Settlement Period</span>
        <span className="font-mono text-sky-400">{label} GMT</span>
      </div>

      {decisionItem && decisionItem.value !== undefined && (
        <div className="flex justify-between items-center text-sky-400 font-bold">
          <span>Decision Run:</span>
          <span className="font-mono">{formatMW(decisionItem.value)}</span>
        </div>
      )}

      {actualItem && actualItem.value !== undefined && actualItem.value !== null && (
        <div className="flex justify-between items-center text-slate-100 font-bold">
          <span>Actual Generation:</span>
          <span className="font-mono">{formatMW(actualItem.value)}</span>
        </div>
      )}

      {otherItems.length > 0 && (
        <div className="text-[10px] text-slate-400 border-t border-slate-800 pt-1 flex justify-between">
          <span>Other Vintages Active:</span>
          <span className="font-mono font-semibold text-slate-300">{otherItems.length} runs</span>
        </div>
      )}
    </div>
  );
};
