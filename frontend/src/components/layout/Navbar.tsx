import React from 'react';
import {
  Wind,
  BarChart3,
  History,
  HelpCircle,
  Activity,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { useDataRefresh } from '../../api/useDataRefresh';

export type ViewTab = 'decision' | 'accuracy' | 'revisions';

interface NavbarProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  onOpenMethodology: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenMethodology,
}) => {
  const { isRefreshing, status, refreshData, dismissStatus } = useDataRefresh();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between min-h-16 py-2.5 sm:py-0 gap-3">
          {/* Brand */}
          <button
            onClick={() => onSelectTab('decision')}
            className="flex items-center gap-3 shrink-0 text-left focus:outline-none group"
            title="Return to Default Decision View"
          >
            <div className="w-9 h-9 rounded-lg bg-sky-600 text-white flex items-center justify-center shadow-sm group-hover:bg-sky-700 transition-colors">
              <Wind className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-900 tracking-tight">GridBricks</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-200">
                  Day-Ahead Wind Desk
                </span>
              </div>
              <p className="text-[11px] text-slate-500">UK Power Procurement • January 2026</p>
            </div>
          </button>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
            <button
              onClick={() => onSelectTab('decision')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentTab === 'decision'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-sky-600" />
              Decision View
            </button>

            <button
              onClick={() => onSelectTab('accuracy')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentTab === 'accuracy'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
              Accuracy & Risk
            </button>

            <button
              onClick={() => onSelectTab('revisions')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentTab === 'revisions'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <History className="w-3.5 h-3.5 text-emerald-600" />
              Forecast Revisions
            </button>
          </nav>

          {/* Actions: Refresh Data + Methodology */}
          <div className="flex items-center gap-2.5">
            {/* Status indicator (Success or Error notification) */}
            {status.state === 'success' && status.lastUpdated && (
              <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg animate-fade-in">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Updated {status.lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </span>
            )}

            {status.state === 'error' && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-rose-800 bg-rose-50 border border-rose-200 rounded-lg shadow-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span className="max-w-[180px] sm:max-w-xs truncate" title={status.message || 'Network error'}>
                  {status.message || 'Network error'}
                </span>
                <button
                  onClick={dismissStatus}
                  className="text-rose-500 hover:text-rose-900 ml-1 text-xs font-bold leading-none cursor-pointer"
                  title="Dismiss alert"
                  aria-label="Dismiss error"
                >
                  &times;
                </button>
              </div>
            )}

            {/* Refresh Data Button */}
            <button
              onClick={refreshData}
              disabled={isRefreshing}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border shadow-2xs transition-all ${
                isRefreshing
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-wait'
                  : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 border-slate-300 active:scale-95 cursor-pointer'
              }`}
              title="Fetch latest data from Elexon feed & refresh all dashboard views"
              aria-label="Refresh Data"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 shrink-0 ${
                  isRefreshing ? 'animate-spin text-sky-600' : 'text-slate-500'
                }`}
              />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh Data'}</span>
            </button>

            {/* Methodology Button */}
            <button
              onClick={onOpenMethodology}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
              title="Methodology, Cutoff Rules & Metrics"
            >
              <HelpCircle className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">Methodology</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
