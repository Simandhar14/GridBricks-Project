import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchJson } from './client';
import {
  DecisionForecastResponse,
  RevisionsResponse,
  WhatIfRequest,
  WhatIfResponse,
} from '../types/api';

export function useDecisionForecast(date: string, cutoff: string) {
  return useQuery<DecisionForecastResponse>({
    queryKey: ['forecast', 'decision', date, cutoff],
    queryFn: () => fetchJson<DecisionForecastResponse>(`/api/forecast/decision?date=${date}&cutoff=${cutoff}`),
    enabled: Boolean(date && cutoff),
  });
}

export function useForecastRevisions(date: string, cutoff: string) {
  return useQuery<RevisionsResponse>({
    queryKey: ['forecast', 'revisions', date, cutoff],
    queryFn: () => fetchJson<RevisionsResponse>(`/api/forecast/revisions?date=${date}&cutoff=${cutoff}`),
    enabled: Boolean(date && cutoff),
  });
}

export function useWhatIfMutation() {
  return useMutation<WhatIfResponse, Error, WhatIfRequest>({
    mutationFn: (req: WhatIfRequest) =>
      fetchJson<WhatIfResponse>('/api/forecast/what-if', {
        method: 'POST',
        body: JSON.stringify(req),
      }),
  });
}

