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
    <Card>
      <p className="text-base font-semibold text-foreground mb-4">{t.dashboard.topProducts}</p>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">{t.dashboard.noData}</p>
      ) : (
        <div className="space-y-2">
          {data.map((product) => (
            <div key={product.name} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-foreground truncate">{product.name}</span>
                  <span className="text-sm financial-value text-foreground ml-2 shrink-0">
                    {formatCurrency(product.revenue)}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(product.revenue / maxRevenue) * 100}%` }}
                  />
                </div>
                <div className="flex gap-3 mt-1">
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
