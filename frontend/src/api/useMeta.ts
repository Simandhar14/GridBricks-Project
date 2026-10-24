import { useQuery } from '@tanstack/react-query';
import { fetchJson } from './client';
import { MetaResponse } from '../types/api';

export function useMeta() {
  return useQuery<MetaResponse>({
    queryKey: ['meta'],
    queryFn: () => fetchJson<MetaResponse>('/api/meta'),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

