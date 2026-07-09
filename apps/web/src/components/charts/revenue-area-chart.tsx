'use client';

import { AreaChart, Card } from '@tremor/react';
import { formatCurrency } from '@/lib/format';

interface RevenueAreaChartProps {
  data: { hora: string; receita: number; meta?: number }[];
  loading?: boolean;
}

export function RevenueAreaChart({ data, loading }: RevenueAreaChartProps) {
  if (loading) return <Card className="h-64 animate-pulse rounded-lg border border-border bg-muted ring-0 shadow-none" />;

  return (
    <Card className="rounded-lg border border-border bg-card p-5 shadow-sm ring-0 transition-shadow duration-200 hover:shadow-md">
      <p className="card-title">Receita por hora</p>
      <AreaChart
        className="mt-5 h-52"
        data={data}
        index="hora"
        categories={['receita', 'meta']}
        colors={['blue', 'gray']}
        valueFormatter={(v) => formatCurrency(v)}
        yAxisWidth={104}
        showLegend
        showGradient
        curveType="monotone"
      />
    </Card>
  );
}
