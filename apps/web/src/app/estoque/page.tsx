'use client';

import { useState, useEffect } from 'react';
import { Card } from '@tremor/react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';
import { Search, AlertTriangle, CheckCircle2, XCircle, Package } from '@/lib/icons';
import { EmptyState } from '@/components/shared/empty-state';

type StockStatus = 'ok' | 'low' | 'out' | 'untracked';

interface InventoryItem {
  itemId: string; itemName: string;
  variantId: string; variantName: string;
  sku: string | null; price: number; cost: number | null;
  category: { id: string; name: string; color: string | null } | null;
  trackStock: boolean; inStock: number | null; lowThreshold: number | null;
  stockStatus: StockStatus;
}

interface InventoryData {
  items: InventoryItem[];
  summary: { total: number; ok: number; low: number; out: number; untracked: number };
}

export default function EstoquePage() {
  const [data, setData]         = useState<InventoryData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState<StockStatus | 'all'>('all');
  const t = useT();

  const statusConfig: Record<StockStatus, { label: string; color: string; icon: React.ElementType }> = {
    ok:        { label: t.inventory.statusOk,        color: 'text-positive bg-positive-muted', icon: CheckCircle2 },
    low:       { label: t.inventory.statusLow,       color: 'text-warning bg-warning-muted',  icon: AlertTriangle },
    out:       { label: t.inventory.statusOut,       color: 'text-negative bg-negative-muted', icon: XCircle },
    untracked: { label: t.inventory.statusUntracked, color: 'text-muted-foreground bg-muted', icon: Package },
  };

  useEffect(() => {
    setLoading(true);
    fetch(`${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'}/api/inventory`, {
      headers: { Authorization: `Bearer ${api.getToken()}` },
    })
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = data?.items.filter((item) => {
    const matchSearch = !search ||
      item.itemName.toLowerCase().includes(search.toLowerCase()) ||
      item.variantName.toLowerCase().includes(search.toLowerCase()) ||
      (item.sku?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchStatus = statusFilter === 'all' || item.stockStatus === statusFilter;
    return matchSearch && matchStatus;
  }) ?? [];

  return (
    <div className="space-y-7">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t.inventory.title}</h1>
        <p className="text-sm text-muted-foreground">{t.inventory.subtitle}</p>
      </div>

      {/* Resumo */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          {(['ok', 'low', 'out', 'untracked'] as StockStatus[]).map((s) => {
            const cfg = statusConfig[s];
            const Icon = cfg.icon;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
                className={cn(
                  'text-left p-5 rounded-lg border bg-card shadow-sm transition-all duration-200 hover:shadow-md',
                  statusFilter === s ? 'border-primary ring-1 ring-primary' : 'border-border',
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', cfg.color)}>
                    <Icon className="h-3 w-3" /> {cfg.label}
                  </span>
                </div>
                <p className="text-2xl font-semibold tracking-tight text-foreground financial-value">{data.summary[s]}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t.inventory.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-md bg-card shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Tabela */}
      <Card className="rounded-lg border border-border bg-card p-0 shadow-sm ring-0 transition-shadow duration-200 hover:shadow-md overflow-hidden">
        {loading ? (
          <div className="space-y-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 bg-muted/70 animate-pulse border-b border-border/60 last:border-0" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title={t.inventory.noProducts}
            description={t.inventory.noProductsDesc}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left text-xs font-medium uppercase tracking-wide text-muted-foreground px-4 py-3">{t.inventory.product}</th>
                  <th className="text-left text-xs font-medium uppercase tracking-wide text-muted-foreground px-4 py-3">{t.inventory.category}</th>
                  <th className="text-right text-xs font-medium uppercase tracking-wide text-muted-foreground px-4 py-3">{t.inventory.price}</th>
                  <th className="text-right text-xs font-medium uppercase tracking-wide text-muted-foreground px-4 py-3">{t.inventory.inStock}</th>
                  <th className="text-right text-xs font-medium uppercase tracking-wide text-muted-foreground px-4 py-3">{t.inventory.minimum}</th>
                  <th className="text-center text-xs font-medium uppercase tracking-wide text-muted-foreground px-4 py-3">{t.inventory.status}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const cfg = statusConfig[item.stockStatus];
                  const Icon = cfg.icon;
                  return (
                    <tr key={item.variantId} className="border-b border-border/60 last:border-0 hover:bg-muted/60 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-foreground">{item.itemName}</p>
                        {item.variantName !== 'Padrão' && item.variantName !== 'Default' && (
                          <p className="text-xs text-muted-foreground">{item.variantName}</p>
                        )}
                        {item.sku && <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>}
                      </td>
                      <td className="px-4 py-3">
                        {item.category ? (
                          <span className="text-xs text-muted-foreground">{item.category.name}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm financial-value">{formatCurrency(item.price)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn('text-sm financial-value font-medium',
                          item.stockStatus === 'out' && 'text-negative',
                          item.stockStatus === 'low' && 'text-warning',
                        )}>
                          {item.inStock !== null ? item.inStock : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm text-muted-foreground financial-value">
                          {item.lowThreshold ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', cfg.color)}>
                          <Icon className="h-3 w-3" />
                          {cfg.label}
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
