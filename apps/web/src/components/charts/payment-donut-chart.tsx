'use client';

import { DonutChart, Card, Legend } from '@tremor/react';
import { formatCurrency } from '@/lib/format';

interface PaymentDonutChartProps {
  data: { name: string; amount: number }[];
  loading?: boolean;
}

export function PaymentDonutChart({ data, loading }: PaymentDonutChartProps) {
  if (loading) return <Card className="h-64 animate-pulse bg-muted" />;

  const colors = ['blue', 'emerald', 'violet', 'amber', 'rose'] as const;

  return (
    <Card>
      <p className="text-base font-semibold text-foreground">Formas de pagamento</p>
      <DonutChart
        className="mt-4 h-48"
        data={data}
        category="amount"
        index="name"
        valueFormatter={(v) => formatCurrency(v)}
        colors={[...colors]}
      />
      <Legend
        className="mt-3"
        categories={data.map((d) => d.name)}
        colors={[...colors].slice(0, data.length)}
      />
    </Card>
  );
}
