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
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    positive: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
  }[badge?.variant || 'neutral'];

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-w-0">
      {/* Top Header: Title on Left, Badge & Icon on Right */}
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate"
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
          {icon && <div className="text-slate-400 shrink-0">{icon}</div>}
        </div>
      </div>

      {/* Main Metric Value: Full Width, No Awkward Wrap */}
      <div className="mt-2.5">
        <div
          className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis"
          title={value}
        >
          {value}
        </div>

        {subtext && (
          <p className="mt-1 text-xs text-slate-500 leading-relaxed line-clamp-2" title={subtext}>
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
};
