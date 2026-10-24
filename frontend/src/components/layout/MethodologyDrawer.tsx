import React from 'react';
import { X, ShieldCheck, Clock, Calculator, Database } from 'lucide-react';

interface MethodologyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MethodologyDrawer: React.FC<MethodologyDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-xl w-full bg-white shadow-2xl flex flex-col z-10 border-l border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">Trading Desk Methodology & Rules</h2>
            <p className="text-xs text-slate-500">Procurement decision cutoff, invariants, and error formulas</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-slate-700">
          {/* Section 1 */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-semibold">
              <Clock className="w-4 h-4 text-sky-600" />
              <span>1. D-1 Decision Cutoff & Strict No-Leakage</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Power procurement for delivery day <strong>D</strong> occurs on <strong>D-1</strong> before auction gate closure.
              By default, the decision cutoff is set to <strong>09:00 Europe/London (GMT) on D-1</strong>.
            </p>
            <div className="bg-sky-50 border border-sky-100 rounded-lg p-3 text-xs text-sky-900 space-y-1">
              <div className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-sky-600" />
                <span>Zero Look-Ahead Leakage Invariant</span>
              </div>
              <p>
                Only forecasts with <code className="bg-sky-100 px-1 py-0.5 rounded">publishTime &le; cutoff(D-1)</code> are selected.
                Forecasts published even 1 second after (<code className="bg-sky-100 px-1 py-0.5 rounded">09:00:01</code>) are strictly excluded from the decision series and accuracy scores.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-semibold">
              <Calculator className="w-4 h-4 text-indigo-600" />
              <span>2. Error Definitions & Sign Convention</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              GridBricks adheres to the standard energy procurement convention:
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono text-xs text-slate-800 space-y-1">
              <div>Error = Forecast Generation − Actual Generation</div>
              <div className="text-emerald-700 font-sans">• Positive (+): Over-forecast (risk of under-procuring other power)</div>
              <div className="text-rose-700 font-sans">• Negative (−): Under-forecast (risk of over-procuring other power)</div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-semibold">
              <Calculator className="w-4 h-4 text-amber-600" />
              <span>3. Why WAPE Instead of MAPE?</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Mean Absolute Percentage Error (MAPE) divides by the actual generation of each settlement period (<code className="bg-slate-100 px-1 py-0.5 rounded">error / actual</code>).
              When national wind drops below 200 MW during calm periods, individual percentage errors explode to thousands of percent or divide by zero.
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>WAPE (Weighted Absolute Percentage Error)</strong> uses the portfolio-wide sum of actuals as the single denominator:
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 font-mono text-xs text-amber-900">
              WAPE = ( &sum; |Forecast &minus; Actual| ) / ( &sum; Actual ) &times; 100%
            </div>
            <p className="text-xs text-slate-500">
              This weights each error by volume, providing traders with an economically meaningful metric.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>4. Empirical Uncertainty Bands (P10 / P90)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              The shaded band around the decision forecast represents empirical quantiles of January 2026 forecast errors:
            </p>
            <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
              <li><strong>P10 bound:</strong> Implied actual wind generation under severe under-forecast conditions.</li>
              <li><strong>P90 bound:</strong> Implied actual wind generation under severe over-forecast conditions.</li>
            </ul>
            <p className="text-[11px] text-slate-400 italic">
              Note: Historical empirical bands are derived from January 2026 Elexon data and serve as scenario guidelines.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-semibold">
              <Database className="w-4 h-4 text-sky-600" />
              <span>5. Official Data Feeds</span>
            </div>
            <div className="space-y-1 text-xs text-slate-600">
              <div>• <strong>Actuals:</strong> Elexon BMRS <code className="bg-slate-100 px-1 py-0.5 rounded">FUELHH/stream</code> (fuelType=WIND, 30-min resolution).</div>
              <div>• <strong>Forecasts:</strong> Elexon BMRS <code className="bg-slate-100 px-1 py-0.5 rounded">WINDFOR/stream</code> (hourly resolution, multi-vintage).</div>
              <div>• <strong>Scope:</strong> January 1, 2026 to January 31, 2026 (1,488 settlement periods).</div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
          >
            Close Methodology
          </button>
        </div>
      </div>
    </div>
  );
};
