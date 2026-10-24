import { useQuery } from '@tanstack/react-query';
import { fetchJson } from './client';
import {
  AccuracySummaryResponse,
  DailyAccuracyResponse,
  ErrorDistributionResponse,
  HorizonAccuracyResponse,
  HourlyAccuracyResponse,
} from '../types/api';

export function useAccuracySummary(start: string, end: string, cutoff: string) {
  return useQuery<AccuracySummaryResponse>({
    queryKey: ['accuracy', 'summary', start, end, cutoff],
    queryFn: () => fetchJson<AccuracySummaryResponse>(`/api/accuracy/summary?start=${start}&end=${end}&cutoff=${cutoff}`),
    enabled: Boolean(start && end && cutoff),
  });
}

export function useDailyAccuracy(start: string, end: string, cutoff: string) {
  return useQuery<DailyAccuracyResponse>({
    queryKey: ['accuracy', 'daily', start, end, cutoff],
    queryFn: () => fetchJson<DailyAccuracyResponse>(`/api/accuracy/daily?start=${start}&end=${end}&cutoff=${cutoff}`),
    enabled: Boolean(start && end && cutoff),
  });
}

export function useHourlyAccuracy(start: string, end: string, cutoff: string) {
  return useQuery<HourlyAccuracyResponse>({
    queryKey: ['accuracy', 'hourly', start, end, cutoff],
    queryFn: () => fetchJson<HourlyAccuracyResponse>(`/api/accuracy/by-hour?start=${start}&end=${end}&cutoff=${cutoff}`),
    enabled: Boolean(start && end && cutoff),
  });
}

export function useHorizonAccuracy(start: string, end: string) {
  return useQuery<HorizonAccuracyResponse>({
    queryKey: ['accuracy', 'horizon', start, end],
    queryFn: () => fetchJson<HorizonAccuracyResponse>(`/api/accuracy/by-horizon?start=${start}&end=${end}`),
    enabled: Boolean(start && end),
  });
}

export function useErrorDistribution(start: string, end: string, cutoff: string, bins: number = 15) {
  return useQuery<ErrorDistributionResponse>({
    queryKey: ['accuracy', 'distribution', start, end, cutoff, bins],
    queryFn: () =>
      fetchJson<ErrorDistributionResponse>(
        `/api/accuracy/error-distribution?start=${start}&end=${end}&cutoff=${cutoff}&bins=${bins}`
      ),
    enabled: Boolean(start && end && cutoff),
  });
}

