'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Card } from '@tremor/react';
import { KpiCard } from '@/components/financial/kpi-card';
import { PeriodSelector } from '@/components/financial/period-selector';
import { TopProductsTable } from '@/components/financial/top-products-table';
import { TrendingUp, Receipt, CreditCard, Percent } from '@/lib/icons';
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
  const [period, setPeriod] = useState<Period>('month');

  const { data: overview, loading: loadingOverview } = useDashboardOverview(period);
  const { data: hourly,   loading: loadingHourly }   = useHourlyRevenue(period);
  const { data: payments, loading: loadingPayments } = usePayments(period);
  const { data: products, loading: loadingProducts } = useTopProducts(period);

  const periodLabel = {
    today:     'vs. ontem',
    yesterday: 'vs. anteontem',
    week:      'vs. semana anterior',
    month:     'vs. mês anterior',
  }[period];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Visão geral</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Receita bruta"
          value={overview?.revenue ?? 0}
          deltaPercent={overview?.revenueDelta}
          deltaLabel={periodLabel}
          icon={TrendingUp}
          format="currency"
          loading={loadingOverview}
        />
        <KpiCard
          title="Nº de vendas"
          value={overview?.transactionsCount ?? 0}
          deltaPercent={overview?.transactionsDelta}
          deltaLabel={periodLabel}
          icon={Receipt}
          format="count"
          loading={loadingOverview}
        />
        <KpiCard
          title="Ticket médio"
          value={overview?.avgTicket ?? 0}
          deltaPercent={overview?.avgTicketDelta}
          deltaLabel={periodLabel}
          icon={CreditCard}
          format="currency"
          loading={loadingOverview}
        />
        <KpiCard
          title="Margem bruta"
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
            <p className="text-base font-semibold text-foreground mb-4">Resumo financeiro</p>
            <div className="space-y-3">
              {[
                { label: 'Receita líquida',  value: overview?.revenueNet,      color: 'text-positive' },
                { label: 'CMV total',         value: overview?.costTotal,       color: 'text-negative' },
                { label: 'Lucro bruto',       value: overview?.grossProfit,     color: 'text-positive' },
                { label: 'Devoluções',        value: overview?.refundsTotal,    color: 'text-negative' },
                { label: 'Descontos',         value: overview?.discountsTotal,  color: 'text-warning'  },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                  {loadingOverview ? (
                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  ) : (
                    <span className={`text-sm financial-value font-medium ${row.color}`}>
                      {row.value != null
                        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((row.value) / 100)
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
