'use client';

import { Card } from '@tremor/react';
import type { LucideIcon } from 'lucide-react';
import { CurrencyValue } from './currency-value';
import { DeltaBadge } from './delta-badge';
import { formatNumber, formatPercent } from '@/lib/format';

interface KpiCardProps {
  title: string;
  value: number;               // centavos (currency) ou número puro (count/percent)
  deltaPercent?: number;
  deltaLabel?: string;         // ex: "vs. ontem"
  icon: LucideIcon;
  format?: 'currency' | 'count' | 'percent';
  loading?: boolean;
}

export function KpiCard({
  title,
  value,
  deltaPercent,
  deltaLabel,
  icon: Icon,
  format = 'currency',
  loading,
}: KpiCardProps) {
  return (
    <Card className="animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground truncate">{title}</p>
          {loading ? (
            <div className="h-8 w-32 bg-muted animate-pulse rounded mt-1" />
          ) : (
            <p className="financial-value text-2xl font-semibold mt-1 truncate">
              {format === 'currency' && <CurrencyValue cents={value} size="xl" />}
              {format === 'count'    && formatNumber(value)}
              {format === 'percent'  && formatPercent(value)}
            </p>
          )}
          {deltaPercent != null && deltaLabel && !loading && (
            <div className="mt-2">
              <DeltaBadge percent={deltaPercent} label={deltaLabel} />
            </div>
          )}
        </div>
        <div className="ml-4 p-2 bg-brand-muted rounded-lg shrink-0">
          <Icon className="h-5 w-5 text-brand" />
        </div>
      </div>
    </Card>
  );
}
