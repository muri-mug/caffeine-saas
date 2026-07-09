'use client';

import { Card } from '@tremor/react';
import type { LucideIcon } from 'lucide-react';
import { CurrencyValue } from './currency-value';
import { DeltaBadge } from './delta-badge';
import { formatNumber, formatPercent } from '@/lib/format';
import { HelpCircle } from '@/lib/icons';

interface KpiCardProps {
  title: string;
  value: number;               // centavos (currency) ou número puro (count/percent)
  deltaPercent?: number;
  deltaLabel?: string;         // ex: "vs. ontem"
  icon: LucideIcon;
  format?: 'currency' | 'count' | 'percent';
  loading?: boolean;
  warningLabel?: string;       // tooltip de alerta ao lado do título (ex: dado incompleto na origem)
}

export function KpiCard({
  title,
  value,
  deltaPercent,
  deltaLabel,
  icon: Icon,
  format = 'currency',
  loading,
  warningLabel,
}: KpiCardProps) {
  return (
    <Card className="animate-fade-in rounded-lg border border-border bg-card p-5 shadow-sm ring-0 transition-shadow duration-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
            {warningLabel && !loading && (
              <span title={warningLabel} className="shrink-0 cursor-help">
                <HelpCircle className="h-3.5 w-3.5 text-warning" />
              </span>
            )}
          </div>
          {loading ? (
            <div className="h-8 w-32 bg-muted animate-pulse rounded-md mt-2" />
          ) : (
            <p className="financial-value text-2xl font-semibold tracking-tight text-foreground mt-2 truncate">
              {format === 'currency' && <CurrencyValue cents={value} size="xl" className="text-2xl tracking-tight" />}
              {format === 'count'    && formatNumber(value)}
              {format === 'percent'  && formatPercent(value)}
            </p>
          )}
          {deltaPercent != null && deltaLabel && !loading && (
            <div className="mt-3">
              <DeltaBadge percent={deltaPercent} label={deltaLabel} />
            </div>
          )}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-muted shrink-0">
          <Icon className="h-[18px] w-[18px] text-brand" />
        </div>
      </div>
    </Card>
  );
}
