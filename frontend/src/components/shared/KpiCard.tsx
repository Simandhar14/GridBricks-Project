import React from 'react';

interface KpiCardProps {
  title: string;
  value: string;
  subtext?: string;
  badge?: {
    text: string;
    variant?: 'neutral' | 'positive' | 'warning' | 'danger';
  };
  icon?: React.ReactNode;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtext,
  badge,
  icon,
}) => {
  const badgeClasses = {
    neutral: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    positive: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    warning: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    danger: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  }[badge?.variant || 'neutral'];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-w-0">
      {/* Top Header: Title on Left, Badge & Icon on Right */}
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate"
          title={title}
        >
          {title}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {badge && (
            <span
              className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap shadow-2xs ${badgeClasses}`}
            >
              {badge.text}
            </span>
          )}
          {icon && <div className="text-slate-400 dark:text-slate-500 shrink-0">{icon}</div>}
        </div>
      </div>

      {/* Main Metric Value: Full Width, No Awkward Wrap */}
      <div className="mt-2.5">
        <div
          className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap overflow-hidden text-ellipsis"
          title={value}
        >
          {value}
        </div>

        {subtext && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2" title={subtext}>
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
};
