import React from 'react';

export const LoadingSkeleton: React.FC<{ rows?: number; height?: string }> = ({
  rows = 4,
  height = 'h-64',
}) => {
  return (
    <div className="w-full animate-pulse space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-28 bg-slate-200/80 dark:bg-slate-800/80 rounded-xl" />
        ))}
      </div>
      <div className={`w-full ${height} bg-slate-200/70 dark:bg-slate-800/70 rounded-xl`} />
    </div>
  );
};

