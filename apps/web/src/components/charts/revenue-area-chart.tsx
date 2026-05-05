'use client';

import { AreaChart, Card } from '@tremor/react';
import { formatCurrency } from '@/lib/format';

interface RevenueAreaChartProps {
  data: { hora: string; receita: number; meta?: number }[];
  loading?: boolean;
}

export function RevenueAreaChart({ data, loading }: RevenueAreaChartProps) {
  if (loading) return <Card className="h-64 animate-pulse bg-muted" />;

  return (
    <Card>
      <p className="text-base font-semibold text-foreground">Receita por hora</p>
      <AreaChart
        className="mt-4 h-52"
        data={data}
        index="hora"
        categories={['receita', 'meta']}
        colors={['blue', 'gray']}
        valueFormatter={(v) => formatCurrency(v)}
        showLegend
        showGradient
        curveType="monotone"
      />
    </Card>
  );
}
