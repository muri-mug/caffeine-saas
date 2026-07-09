'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Card } from '@tremor/react';
import { KpiCard } from '@/components/financial/kpi-card';
import { PeriodSelector } from '@/components/financial/period-selector';
import { TopProductsTable } from '@/components/financial/top-products-table';
import { TrendingUp, Receipt, CreditCard, Percent } from '@/lib/icons';
import { useT } from '@/lib/i18n';
import { formatPercent } from '@/lib/format';
import {
  useDashboardOverview,
  useHourlyRevenue,
  usePayments,
  useTopProducts,
  type Period,
} from '@/hooks/use-dashboard';

const RevenueAreaChart = dynamic(
  () => import('@/components/charts/revenue-area-chart').then((m) => m.RevenueAreaChart),
  { ssr: false, loading: () => <Card className="h-64 animate-pulse rounded-lg border border-border bg-muted ring-0 shadow-none" /> },
);
const PaymentDonutChart = dynamic(
  () => import('@/components/charts/payment-donut-chart').then((m) => m.PaymentDonutChart),
  { ssr: false, loading: () => <Card className="h-64 animate-pulse rounded-lg border border-border bg-muted ring-0 shadow-none" /> },
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
    days30:    t.dashboard.vsPrevMonth,
    month:     t.dashboard.vsPrevMonth,
    custom:    t.dashboard.vsPrevPeriod,
  }[period];

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t.dashboard.title}</h1>
          <p className="text-sm text-muted-foreground first-letter:capitalize">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
          warningLabel={
            overview?.costCoveragePct != null && overview.costCoveragePct < 100
              ? t.dashboard.costCoverageWarning.replace('{pct}', formatPercent(100 - overview.costCoveragePct))
              : undefined
          }
        />
      </div>

      {/* Gráficos principais */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <TopProductsTable data={products} loading={loadingProducts} />
        </div>
        <div>
          <Card className="rounded-lg border border-border bg-card p-5 shadow-sm ring-0 transition-shadow duration-200 hover:shadow-md">
            <p className="card-title mb-4">{t.dashboard.financialSummary}</p>
            <div className="divide-y divide-border/60">
              {[
                { label: t.dashboard.discounts,   value: overview?.discountsTotal, color: 'text-warning'  },
                { label: t.dashboard.netRevenue,  value: overview?.revenueNet,     color: 'text-foreground' },
                { label: t.dashboard.totalCogs,   value: overview?.costTotal,      color: 'text-negative' },
                { label: t.dashboard.grossProfit, value: overview?.grossProfit,    color: 'text-positive' },
                { label: t.dashboard.refunds,     value: overview?.refundsTotal,   color: 'text-negative' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                  {loadingOverview ? (
                    <div className="h-4 w-24 bg-muted animate-pulse rounded-md" />
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
