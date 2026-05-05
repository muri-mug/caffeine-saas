'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

export type Period = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

function periodParams(period: Period, from?: string, to?: string) {
  return period === 'custom' && from && to ? { period: 'custom', from, to } : { period };
}

function isReady(period: Period, from?: string, to?: string) {
  return period !== 'custom' || (!!from && !!to);
}

export function useDashboardOverview(period: Period, from?: string, to?: string) {
  const [data, setData]       = useState<Awaited<ReturnType<typeof api.getOverview>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!isReady(period, from, to)) return;
    setLoading(true);
    setError(null);
    try {
      setData(await api.getOverview(periodParams(period, from, to)));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [period, from, to]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useHourlyRevenue(period: Period, from?: string, to?: string) {
  const [data, setData]       = useState<Awaited<ReturnType<typeof api.getHourlyRevenue>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady(period, from, to)) return;
    setLoading(true);
    api.getHourlyRevenue(periodParams(period, from, to))
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period, from, to]);

  return { data, loading };
}

export function usePayments(period: Period, from?: string, to?: string) {
  const [data, setData]       = useState<Awaited<ReturnType<typeof api.getPayments>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady(period, from, to)) return;
    setLoading(true);
    api.getPayments(periodParams(period, from, to))
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period, from, to]);

  return { data, loading };
}

export function useTopProducts(period: Period, from?: string, to?: string) {
  const [data, setData]       = useState<Awaited<ReturnType<typeof api.getTopProducts>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady(period, from, to)) return;
    setLoading(true);
    api.getTopProducts({ ...periodParams(period, from, to), limit: 8 })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period, from, to]);

  return { data, loading };
}
