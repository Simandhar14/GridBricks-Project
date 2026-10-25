import React from 'react';
import { Download } from 'lucide-react';
import { DecisionHalfHour } from '../../types/api';

interface CsvDownloadButtonProps {
  data: DecisionHalfHour[];
  filename?: string;
}

export const CsvDownloadButton: React.FC<CsvDownloadButtonProps> = ({
  data,
  filename = 'wind_forecast_decision_series.csv',
}) => {
  const handleDownload = () => {
    if (!data || data.length === 0) return;

    const headers = [
      'Settlement Period',
      'Target Start Time (UTC)',
      'Decision Forecast (MW)',
      'Forecast Publish Time (UTC)',
      'Lead Horizon (Hours)',
      'Actual Generation (MW)',
      'Error (MW: Forecast - Actual)',
      'Percentage Error (%)',
      'P10 Error Offset (MW)',
      'P90 Error Offset (MW)',
      'Implied Actual Lower Bound (MW)',
      'Implied Actual Upper Bound (MW)',
      'Forecast Missing',
      'Actual Missing',
    ];

    const rows = data.map((h) => [
      h.settlement_period,
      h.start_time,
      h.forecast_mw ?? '',
      h.forecast_publish_time ?? '',
      h.horizon_hours ?? '',
      h.actual_mw ?? '',
      h.error_mw ?? '',
      h.pct_error ?? '',
      h.error_band_p10 ?? '',
      h.error_band_p90 ?? '',
      h.implied_actual_lower_mw ?? '',
      h.implied_actual_upper_mw ?? '',
      h.forecast_missing ? 'TRUE' : 'FALSE',
      h.actual_missing ? 'TRUE' : 'FALSE',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button
      onClick={handleDownload}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/80 shadow-sm transition-colors"
      title="Download half-hourly decision series as CSV"
    >
      <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
      Export CSV
    </button>
  );
};

