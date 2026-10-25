import React from 'react';
import { Wind, BarChart3, History, HelpCircle, Activity, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export type ViewTab = 'decision' | 'accuracy' | 'revisions';

interface NavbarProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  onOpenMethodology: () => void;
  onResetToDefaultView?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenMethodology,
  onResetToDefaultView,
}) => {
  const { theme, setTheme } = useTheme();

  const handleSetTheme = (targetTheme: 'light' | 'dark') => {
    setTheme(targetTheme);
    if (targetTheme === 'light') {
      // Switching to Light Mode routes back to the default frontend view
      onSelectTab('decision');
      if (onResetToDefaultView) {
        onResetToDefaultView();
      }
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between min-h-16 py-2.5 sm:py-0 gap-3">
          {/* Brand - Clicking brand also routes to default decision view */}
          <button
            onClick={() => onSelectTab('decision')}
            className="flex items-center gap-3 shrink-0 text-left focus:outline-none group"
            title="Return to Default Decision View"
          >
            <div className="w-9 h-9 rounded-lg bg-sky-600 dark:bg-sky-500 text-white flex items-center justify-center shadow-sm group-hover:bg-sky-700 transition-colors">
              <Wind className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-900 dark:text-white tracking-tight">GridBricks</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-transparent dark:border-sky-800">
                  Day-Ahead Wind Desk
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">UK Power Procurement • January 2026</p>
            </div>
          </button>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <button
              onClick={() => onSelectTab('decision')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentTab === 'decision'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              Decision View
            </button>

            <button
              onClick={() => onSelectTab('accuracy')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentTab === 'accuracy'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Accuracy & Risk
            </button>

            <button
              onClick={() => onSelectTab('revisions')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentTab === 'revisions'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <History className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Forecast Revisions
            </button>
          </nav>

          {/* Actions: Mode Switch (Light/Dark) + Methodology */}
          <div className="flex items-center gap-2">
            {/* Theme / Mode Switch: Light (Default) vs Dark */}
            <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800/90 p-0.5 text-xs shadow-2xs">
              <button
                type="button"
                onClick={() => handleSetTheme('light')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                  theme === 'light'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
                title="Switch to Light Mode & restore Default Decision View"
                aria-label="Light Mode"
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Light</span>
              </button>

              <button
                type="button"
                onClick={() => handleSetTheme('dark')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                  theme === 'dark'
                    ? 'bg-slate-900 text-white shadow-xs font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
                title="Switch to Dark Mode"
                aria-label="Dark Mode"
              >
                <Moon className="w-3.5 h-3.5 text-sky-400" />
                <span>Dark</span>
              </button>
            </div>

            <button
              onClick={onOpenMethodology}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              title="Methodology, Cutoff Rules & Metrics"
            >
              <HelpCircle className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <span className="hidden sm:inline">Methodology</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

