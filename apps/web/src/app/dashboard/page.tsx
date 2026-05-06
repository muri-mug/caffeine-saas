'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Card } from '@tremor/react';
import { KpiCard } from '@/components/financial/kpi-card';
import { PeriodSelector } from '@/components/financial/period-selector';
import { TopProductsTable } from '@/components/financial/top-products-table';
import { TrendingUp, Receipt, CreditCard, Percent } from '@/lib/icons';
import { useT } from '@/lib/i18n';
import {
  useDashboardOverview,
  useHourlyRevenue,
  usePayments,
  useTopProducts,
  type Period,
} from '@/hooks/use-dashboard';

const RevenueAreaChart = dynamic(
  () => import('@/components/charts/revenue-area-chart').then((m) => m.RevenueAreaChart),
  { ssr: false, loading: () => <Card className="h-64 animate-pulse bg-muted" /> },
);
const PaymentDonutChart = dynamic(
  () => import('@/components/charts/payment-donut-chart').then((m) => m.PaymentDonutChart),
  { ssr: false, loading: () => <Card className="h-64 animate-pulse bg-muted" /> },
);

export default function DashboardPage() {
  const [period, setPeriod]   = useState<Period>('month');
  const [customFrom, setFrom] = useState('');
  const [customTo,   setTo]   = useState('');
  const t = useT();

  const from = period === 'custom' ? customFrom : undefined;
  const to   = period === 'custom' ? customTo   : undefined;

  const { data: overview, loading: loadingOverview } = useDashboardOverview(period, from, to);
  const { data: hourly,   loading: loadingHourly }   = useHourlyRevenue(period, from, to);
  const { data: payments, loading: loadingPayments } = usePayments(period, from, to);
  const { data: products, loading: loadingProducts } = useTopProducts(period, from, to);

  const periodLabel = {
    today:     t.dashboard.vsYesterday,
    yesterday: t.dashboard.vsDayBefore,
    week:      t.dashboard.vsPrevWeek,
    month:     t.dashboard.vsPrevMonth,
  }[period];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t.dashboard.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().toLocaleDateString(t.locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <PeriodSelector
          value={period}
          onChange={setPeriod}
          customFrom={customFrom}
          customTo={customTo}
          onCustomRange={(f, t) => { setFrom(f); setTo(t); }}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title={t.dashboard.grossRevenue}
          value={overview?.grossRevenue ?? 0}
          deltaPercent={overview?.revenueDelta}
          deltaLabel={periodLabel}
          icon={TrendingUp}
          format="currency"
          loading={loadingOverview}
        />
        <KpiCard
          title={t.dashboard.salesCount}
          value={overview?.transactionsCount ?? 0}
          deltaPercent={overview?.transactionsDelta}
          deltaLabel={periodLabel}
          icon={Receipt}
          format="count"
          loading={loadingOverview}
        />
        <KpiCard
          title={t.dashboard.avgTicket}
          value={overview?.avgTicket ?? 0}
          deltaPercent={overview?.avgTicketDelta}
          deltaLabel={periodLabel}
          icon={CreditCard}
          format="currency"
          loading={loadingOverview}
        />
        <KpiCard
          title={t.dashboard.grossMargin}
          value={overview?.grossMarginPct ?? 0}
          icon={Percent}
          format="percent"
          loading={loadingOverview}
        />
      </div>

      {/* Gráficos principais */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RevenueAreaChart
            data={hourly.map((h) => ({ hora: h.hour, receita: h.receita }))}
            loading={loadingHourly}
          />
        </div>
        <div>
          <PaymentDonutChart
            data={payments.map((p) => ({ name: p.name, amount: p.amount }))}
            loading={loadingPayments}
          />
        </div>
      </div>

      {/* Top produtos + métricas secundárias */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <TopProductsTable data={products} loading={loadingProducts} />
        </div>
        <div>
          <Card>
            <p className="text-base font-semibold text-foreground mb-4">{t.dashboard.financialSummary}</p>
            <div className="space-y-3">
              {[
                { label: t.dashboard.discounts,   value: overview?.discountsTotal, color: 'text-warning'  },
                { label: t.dashboard.netRevenue,  value: overview?.revenueNet,     color: 'text-foreground' },
                { label: t.dashboard.totalCogs,   value: overview?.costTotal,      color: 'text-negative' },
                { label: t.dashboard.grossProfit, value: overview?.grossProfit,    color: 'text-positive' },
                { label: t.dashboard.refunds,     value: overview?.refundsTotal,   color: 'text-negative' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                  {loadingOverview ? (
                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  ) : (
                    <span className={`text-sm financial-value font-medium ${row.color}`}>
                      {row.value != null
                        ? new Intl.NumberFormat(t.locale, { style: 'currency', currency: 'BRL' }).format((row.value) / 100)
                        : '—'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
