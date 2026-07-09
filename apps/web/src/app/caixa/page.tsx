'use client';

import { useState, useEffect } from 'react';
import { Card } from '@tremor/react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';
import { PeriodSelector } from '@/components/financial/period-selector';
import { Banknote, ArrowUpRight, ArrowDownLeft, Scale, Wallet } from '@/lib/icons';
import type { Period } from '@/hooks/use-dashboard';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

interface Shift {
  id: string; externalId: string;
  openedAt: string; closedAt: string | null;
  openingCashAmount: number; cashReceived: number;
  cashPaidIn: number; cashPaidOut: number; cashRefunds: number;
  expectedCashAmount: number; actualCashAmount: number | null;
  cashDifference: number | null; receiptsCount: number; netTotal: number;
  cashStatus: 'ok' | 'low_diff' | 'high_diff' | 'open';
  employee: { name: string } | null;
  store: { name: string } | null;
}

interface CashflowData {
  shifts: Shift[];
  summary: {
    totalShifts: number; closedShifts: number; openShifts: number;
    totalNetRevenue: number; totalCashReceived: number;
    totalCashPaidOut: number; totalCashDifference: number;
    shiftsWithDifference: number;
  };
}

export default function CaixaPage() {
  const [period, setPeriod]   = useState<Period>('today');
  const [customFrom, setFrom] = useState('');
  const [customTo,   setTo]   = useState('');
  const [data, setData]       = useState<CashflowData | null>(null);
  const [loading, setLoading] = useState(true);
  const t = useT();

  const statusBadge: Record<string, string> = {
    ok:        'bg-positive-muted text-positive',
    low_diff:  'bg-warning-muted text-warning',
    high_diff: 'bg-negative-muted text-negative',
    open:      'bg-muted text-muted-foreground',
  };
  const statusLabel: Record<string, string> = {
    ok:        t.cashflow.statusOk,
    low_diff:  t.cashflow.statusLowDiff,
    high_diff: t.cashflow.statusHighDiff,
    open:      t.cashflow.statusOpen,
  };

  useEffect(() => {
    const isCustom = period === 'custom' && customFrom && customTo;
    if (period === 'custom' && !isCustom) return;
    const qs = isCustom ? `period=custom&from=${customFrom}&to=${customTo}` : `period=${period}`;
    setLoading(true);
    fetch(`${API}/api/cashflow?${qs}`, {
      headers: { Authorization: `Bearer ${api.getToken()}` },
    })
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period, customFrom, customTo]);

  const s = data?.summary;

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t.cashflow.title}</h1>
          <p className="text-sm text-muted-foreground">{t.cashflow.subtitle}</p>
        </div>
        <PeriodSelector
          value={period}
          onChange={setPeriod}
          customFrom={customFrom}
          customTo={customTo}
          onCustomRange={(f, t) => { setFrom(f); setTo(t); }}
        />
      </div>

      {/* Resumo do período */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: t.cashflow.netRevenue,      value: s?.totalNetRevenue,     icon: Wallet,        color: 'text-positive', iconBox: 'bg-positive-muted text-positive' },
          { label: t.cashflow.cashInflows,     value: s?.totalCashReceived,   icon: ArrowUpRight,  color: 'text-positive', iconBox: 'bg-positive-muted text-positive' },
          { label: t.cashflow.cashOutflows,    value: s?.totalCashPaidOut,    icon: ArrowDownLeft, color: 'text-negative', iconBox: 'bg-negative-muted text-negative' },
          { label: t.cashflow.totalDifference, value: s?.totalCashDifference, icon: Scale,         color: (s?.totalCashDifference ?? 0) === 0 ? 'text-positive' : 'text-negative', iconBox: (s?.totalCashDifference ?? 0) === 0 ? 'bg-positive-muted text-positive' : 'bg-negative-muted text-negative' },
        ].map(({ label, value, icon: Icon, color, iconBox }) => (
          <Card key={label} className="animate-fade-in rounded-lg border border-border bg-card p-5 shadow-sm ring-0 transition-shadow duration-200 hover:shadow-md">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-muted-foreground truncate">{label}</p>
                {loading ? (
                  <div className="h-8 w-28 bg-muted animate-pulse rounded-md mt-2" />
                ) : (
                  <p className={cn('financial-value text-2xl font-semibold tracking-tight mt-2 truncate', color)}>
                    {value != null ? formatCurrency(value) : '—'}
                  </p>
                )}
              </div>
              <div className={cn('flex h-9 w-9 items-center justify-center rounded-md shrink-0', iconBox)}>
                <Icon className="h-[18px] w-[18px]" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Tabela de turnos */}
      <Card className="rounded-lg border border-border bg-card p-0 shadow-sm ring-0 transition-shadow duration-200 hover:shadow-md overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <p className="card-title">{t.cashflow.shifts}</p>
          {s && (
            <p className="text-xs text-muted-foreground mt-1">
              {s.closedShifts} {t.cashflow.closed} · {s.openShifts} {t.cashflow.open} · {s.shiftsWithDifference} {t.cashflow.withDifference}
            </p>
          )}
        </div>

        {loading ? (
          <div className="space-y-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted/70 animate-pulse border-b border-border/60 last:border-0" />
            ))}
          </div>
        ) : !data?.shifts.length ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {t.cashflow.noShifts}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {[
                    t.cashflow.shift, t.cashflow.employee, t.cashflow.opening,
                    t.cashflow.float, t.cashflow.expected, t.cashflow.counted,
                    t.cashflow.difference, t.cashflow.salesCol, t.cashflow.statusOk.split(' ')[0],
                  ].map((h) => (
                    <th key={h} className="text-left text-xs font-medium uppercase tracking-wide text-muted-foreground px-3 py-3 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.shifts.map((shift) => {
                  const opened = new Date(shift.openedAt).toLocaleString(t.locale, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                  const closed = shift.closedAt
                    ? new Date(shift.closedAt).toLocaleTimeString(t.locale, { hour: '2-digit', minute: '2-digit' })
                    : t.cashflow.statusOpen;
                  const diff = shift.cashDifference ?? 0;

                  return (
                    <tr key={shift.id} className="border-b border-border/60 last:border-0 hover:bg-muted/60 transition-colors">
                      <td className="px-3 py-3 whitespace-nowrap">
                        <p className="text-sm text-foreground">{opened}</p>
                        <p className="text-xs text-muted-foreground">{t.cashflow.until} {closed}</p>
                      </td>
                      <td className="px-3 py-3 text-sm text-foreground">{shift.employee?.name ?? '—'}</td>
                      <td className="px-3 py-3 text-sm financial-value text-right">{formatCurrency(shift.openingCashAmount)}</td>
                      <td className="px-3 py-3 text-sm financial-value text-right">{formatCurrency(shift.cashPaidOut)}</td>
                      <td className="px-3 py-3 text-sm financial-value text-right">{formatCurrency(shift.expectedCashAmount)}</td>
                      <td className="px-3 py-3 text-sm financial-value text-right">
                        {shift.actualCashAmount != null ? formatCurrency(shift.actualCashAmount) : '—'}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className={cn('text-sm financial-value font-medium',
                          diff === 0 ? 'text-positive' : diff > 0 ? 'text-warning' : 'text-negative',
                        )}>
                          {diff !== 0 ? (diff > 0 ? '+' : '') + formatCurrency(diff) : '—'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="text-sm financial-value">{formatCurrency(shift.netTotal)}</span>
                        <p className="text-xs text-muted-foreground">{shift.receiptsCount} {t.cashflow.sales}</p>
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', statusBadge[shift.cashStatus])}>
                          {statusLabel[shift.cashStatus]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
