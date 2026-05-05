'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

export type Period = 'today' | 'yesterday' | 'week' | 'month';

export function useDashboardOverview(period: Period) {
  const [data, setData]       = useState<Awaited<ReturnType<typeof api.getOverview>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.getOverview({ period }));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useHourlyRevenue(period: Period) {
  const [data, setData]       = useState<Awaited<ReturnType<typeof api.getHourlyRevenue>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getHourlyRevenue({ period })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

  return { data, loading };
}

export function usePayments(period: Period) {
  const [data, setData]       = useState<Awaited<ReturnType<typeof api.getPayments>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getPayments({ period })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

  return { data, loading };
}

export function useTopProducts(period: Period) {
  const [data, setData]       = useState<Awaited<ReturnType<typeof api.getTopProducts>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getTopProducts({ period, limit: 8 })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

  return { data, loading };
}
