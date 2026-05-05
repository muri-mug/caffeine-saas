import dynamic from 'next/dynamic';
import { Card } from '@tremor/react';
import { KpiCard } from '@/components/financial/kpi-card';
import {
  TrendingUp,
  Receipt,
  CreditCard,
  Percent,
} from '@/lib/icons';

// Gráficos carregados dinamicamente (evita SSR issues do Tremor)
const RevenueAreaChart = dynamic(
  () => import('@/components/charts/revenue-area-chart').then((m) => m.RevenueAreaChart),
  { ssr: false, loading: () => <Card className="h-64 animate-pulse bg-muted" /> },
);
const PaymentDonutChart = dynamic(
  () => import('@/components/charts/payment-donut-chart').then((m) => m.PaymentDonutChart),
  { ssr: false, loading: () => <Card className="h-64 animate-pulse bg-muted" /> },
);

// Dados mockados — serão substituídos por chamadas reais à API no Sprint 2
const mockHourlyRevenue = [
  { hora: '07h', receita: 42000 },
  { hora: '08h', receita: 89000 },
  { hora: '09h', receita: 156000 },
  { hora: '10h', receita: 134000 },
  { hora: '11h', receita: 178000 },
  { hora: '12h', receita: 245000 },
  { hora: '13h', receita: 198000 },
  { hora: '14h', receita: 112000 },
  { hora: '15h', receita: 87000 },
  { hora: '16h', receita: 65000 },
  { hora: '17h', receita: 94000 },
  { hora: '18h', receita: 45000 },
];

const mockPayments = [
  { name: 'Pix',        amount: 485000 },
  { name: 'Débito',     amount: 312000 },
  { name: 'Crédito',    amount: 289000 },
  { name: 'Dinheiro',   amount: 158000 },
  { name: 'Vale',       amount: 47000 },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header da página */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Visão geral</h1>
        <p className="text-sm text-muted-foreground mt-1">Hoje, {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Receita hoje"
          value={1291000}
          deltaPercent={12.3}
          deltaLabel="vs. ontem"
          icon={TrendingUp}
          format="currency"
        />
        <KpiCard
          title="Nº de vendas"
          value={47}
          deltaPercent={5.2}
          deltaLabel="vs. ontem"
          icon={Receipt}
          format="count"
        />
        <KpiCard
          title="Ticket médio"
          value={27468}
          deltaPercent={-2.1}
          deltaLabel="vs. ontem"
          icon={CreditCard}
          format="currency"
        />
        <KpiCard
          title="Margem bruta"
          value={6240}
          deltaPercent={1.8}
          deltaLabel="vs. ontem"
          icon={Percent}
          format="percent"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RevenueAreaChart data={mockHourlyRevenue} />
        </div>
        <div>
          <PaymentDonutChart data={mockPayments} />
        </div>
      </div>
    </div>
  );
}
