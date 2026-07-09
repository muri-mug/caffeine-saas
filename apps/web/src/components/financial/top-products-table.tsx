'use client';

import { Card } from '@tremor/react';
import { useT } from '@/lib/i18n';
import { formatCurrency, formatNumber } from '@/lib/format';

interface Product {
  name: string;
  revenue: number;
  quantity: number;
  orders: number;
}

interface TopProductsTableProps {
  data: Product[];
  loading?: boolean;
}

export function TopProductsTable({ data, loading }: TopProductsTableProps) {
  const t = useT();
  const maxRevenue = data[0]?.revenue ?? 1;

  return (
    <Card className="rounded-lg border border-border bg-card p-5 shadow-sm ring-0 transition-shadow duration-200 hover:shadow-md">
      <p className="card-title mb-4">{t.dashboard.topProducts}</p>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 bg-muted animate-pulse rounded-md" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">{t.dashboard.noData}</p>
      ) : (
        <div className="space-y-1">
          {data.map((product, index) => (
            <div
              key={product.name}
              className="flex items-center gap-3 rounded-md px-2 py-2 -mx-2 transition-colors hover:bg-muted/60"
            >
              <span className="financial-value w-5 shrink-0 text-xs text-muted-foreground/70 text-right">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-sm font-medium text-foreground truncate">{product.name}</span>
                  <span className="text-sm financial-value font-medium text-foreground ml-2 shrink-0">
                    {formatCurrency(product.revenue)}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand/80 rounded-full transition-all"
                    style={{ width: `${(product.revenue / maxRevenue) * 100}%` }}
                  />
                </div>
                <div className="flex gap-3 mt-1.5">
                  <span className="text-xs text-muted-foreground">{formatNumber(product.quantity)} un.</span>
                  <span className="text-xs text-muted-foreground">{product.orders} pedidos</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
