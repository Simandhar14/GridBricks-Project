/**
 * Formatters for display in the GridBricks UI.
 * Units: MW, MWh, percentages, and timestamps in London local time.
 */

export function formatMW(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return `${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 }).format(val)} MW`;
}

export function formatMWh(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return `${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(val)} MWh`;
}

export function formatPercent(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`;
}

export function formatPercentAbs(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return `${val.toFixed(1)}%`;
}

export function formatSignedMW(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const prefix = val > 0 ? '+' : '';
  return `${prefix}${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 }).format(val)} MW`;
}

/**
 * Format ISO datetime string to London local time with explicit timezone label.
 * E.g. "2026-01-15T00:00:00Z" -> "15 Jan 00:00 GMT"
 */
export function formatLondonDateTime(isoStr: string | null | undefined): string {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    const day = d.getUTCDate().toString().padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getUTCMonth()];
    const hours = d.getUTCHours().toString().padStart(2, '0');
    const mins = d.getUTCMinutes().toString().padStart(2, '0');
    return `${day} ${month} ${hours}:${mins} GMT`;
  } catch {
    return isoStr;
  }
}

/**
 * Format time only for charts (HH:MM GMT).
 */
export function formatTimeOnly(isoStr: string | null | undefined): string {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    const hours = d.getUTCHours().toString().padStart(2, '0');
    const mins = d.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${mins}`;
  } catch {
    return '';
  }
}

