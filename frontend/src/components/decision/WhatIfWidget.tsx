import React, { useState, useEffect } from 'react';
import { Calculator, AlertCircle, ShieldAlert, Zap } from 'lucide-react';
import { useWhatIfMutation } from '../../api/useForecast';
import { formatMW } from '../../utils/formatters';

interface WhatIfWidgetProps {
  forecastAvgMw: number | null;
  p10LowerAvgMw: number | null;
}

export const WhatIfWidget: React.FC<WhatIfWidgetProps> = ({
  forecastAvgMw,
  p10LowerAvgMw,
}) => {
  const [demandInput, setDemandInput] = useState<string>('32000');
  const whatIfMutation = useWhatIfMutation();

  const handleCompute = () => {
    const val = parseFloat(demandInput);
    if (isNaN(val) || val < 0) return;

    whatIfMutation.mutate({
      expected_demand_mw: val,
      forecast_wind_mw: forecastAvgMw || 10000,
      lower_wind_bound_mw: p10LowerAvgMw || 8500,
    });
  };

  useEffect(() => {
    if (forecastAvgMw && p10LowerAvgMw) {
      handleCompute();
    }
  }, [forecastAvgMw, p10LowerAvgMw]);

  const res = whatIfMutation.data;

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-5 shadow-sm border border-slate-700">
      <div className="flex items-center justify-between gap-2 border-b border-slate-700/80 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold tracking-tight text-white">
              Day-Ahead Procurement "What-If" Scenario
            </h4>
            <p className="text-[11px] text-slate-400">
              Calculate residual purchase obligations based on your expected national demand
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-slate-800 px-2 py-1 rounded border border-slate-700">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          <span>User Scenario Input (Not BMRS feed)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 items-stretch">
        {/* Demand Scenario Input */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Expected National Demand (MW)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={demandInput}
              onChange={(e) => setDemandInput(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
              placeholder="e.g. 32000"
              step="500"
              min="0"
            />
            <button
              onClick={handleCompute}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              Recalculate
            </button>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Avg Forecast Wind: {formatMW(forecastAvgMw)}
          </span>
        </div>

        {/* Baseline Procurement */}
        <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Baseline Procurement Need</span>
            <Zap className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="mt-1 text-xl font-bold font-mono text-white">
            {formatMW(res?.procurement_baseline_mw)}
          </div>
          <span className="text-[10px] text-slate-400">Demand − Expected Wind</span>
        </div>

        {/* Conservative Procurement */}
        <div className="bg-slate-800/80 rounded-lg p-3 border border-amber-900/40">
          <div className="flex items-center justify-between text-xs text-amber-300">
            <span>Conservative Procurement (P10 Wind)</span>
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-1 text-xl font-bold font-mono text-amber-300">
            {formatMW(res?.procurement_conservative_mw)}
          </div>
          <span className="text-[10px] text-amber-200/70">
            Recommended buffer: +{formatMW(res?.recommended_buffer_mw)}
          </span>
        </div>
      </div>
    </div>
  );
};

