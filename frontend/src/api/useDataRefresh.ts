import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { fetchJson } from './client';

export interface RefreshStatus {
  state: 'idle' | 'loading' | 'success' | 'error';
  message: string | null;
  lastUpdated: Date | null;
}

export function useDataRefresh() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<RefreshStatus>({
    state: 'idle',
    message: null,
    lastUpdated: null,
  });

  const refreshData = async () => {
    if (status.state === 'loading') return;

    setStatus((prev) => ({ ...prev, state: 'loading', message: null }));

    try {
      // 1. Try to notify backend to re-verify snapshot cache
      try {
        await fetchJson('/api/refresh', { method: 'POST' });
      } catch {
        // Fallback: Continue to query refetch even if POST /api/refresh is unavailable
      }

      // 2. Concurrently refetch all currently mounted/active queries across the dashboard
      await queryClient.refetchQueries({ type: 'active' });

      // 3. Mark all cached queries as invalidated so background views also update
      await queryClient.invalidateQueries();

      setStatus({
        state: 'success',
        message: 'Data successfully refreshed from data feed.',
        lastUpdated: new Date(),
      });

      // Automatically dismiss the success pill after 3.5 seconds
      setTimeout(() => {
        setStatus((prev) =>
          prev.state === 'success' ? { ...prev, state: 'idle', message: null } : prev
        );
      }, 3500);
    } catch (err: any) {
      // Graceful error handling for offline/network disconnects
      const errorMsg =
        err instanceof Error
          ? err.message
          : 'Network error: Failed to connect to server. Preserving current data snapshot.';

      setStatus({
        state: 'error',
        message: errorMsg,
        lastUpdated: null,
      });
    }
  };

  const dismissStatus = () => {
    setStatus((prev) => ({ ...prev, state: 'idle', message: null }));
  };

  return {
    isRefreshing: status.state === 'loading',
    status,
    refreshData,
    dismissStatus,
  };
}
