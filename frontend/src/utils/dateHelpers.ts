/**
 * Helpers for January 2026 dates.
 */

export const JAN_2026_START = '2026-01-01';
export const JAN_2026_END = '2026-01-31';

export function getAllJanuaryDates(): string[] {
  const dates: string[] = [];
  for (let i = 1; i <= 31; i++) {
    const day = i.toString().padStart(2, '0');
    dates.push(`2026-01-${day}`);
  }
  return dates;
}

export function formatDateLabel(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[2], 10);
      return `${day} Jan 2026`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

