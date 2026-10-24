import { describe, it, expect } from 'vitest';
import {
  formatMW,
  formatMWh,
  formatPercent,
  formatPercentAbs,
  formatSignedMW,
  formatLondonDateTime,
  formatTimeOnly,
} from '../utils/formatters';

describe('Formatters Utility', () => {
  it('formats MW values correctly', () => {
    expect(formatMW(4200.5)).toBe('4,200.5 MW');
    expect(formatMW(0)).toBe('0 MW');
    expect(formatMW(null)).toBe('—');
    expect(formatMW(undefined)).toBe('—');
  });

  it('formats MWh values correctly without fractions', () => {
    expect(formatMWh(100800.4)).toBe('100,800 MWh');
    expect(formatMWh(null)).toBe('—');
  });

  it('formats signed MW correctly', () => {
    expect(formatSignedMW(250.5)).toBe('+250.5 MW');
    expect(formatSignedMW(-180.2)).toBe('-180.2 MW');
    expect(formatSignedMW(0)).toBe('0 MW');
    expect(formatSignedMW(null)).toBe('—');
  });

  it('formats percentage correctly with signs', () => {
    expect(formatPercent(5.24)).toBe('+5.2%');
    expect(formatPercent(-8.16)).toBe('-8.2%');
    expect(formatPercent(null)).toBe('—');
  });

  it('formats absolute percentage correctly', () => {
    expect(formatPercentAbs(5.24)).toBe('5.2%');
    expect(formatPercentAbs(null)).toBe('—');
  });

  it('formats London datetime with GMT suffix in January', () => {
    const formatted = formatLondonDateTime('2026-01-15T09:00:00Z');
    expect(formatted).toBe('15 Jan 09:00 GMT');
  });

  it('formats time only correctly', () => {
    expect(formatTimeOnly('2026-01-15T09:30:00Z')).toBe('09:30');
    expect(formatTimeOnly(null)).toBe('');
  });
});

