'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';
import type { Period } from '@/hooks/use-dashboard';

interface PeriodSelectorProps {
  value: Period;
  onChange: (period: Period) => void;
  customFrom?: string;
  customTo?: string;
  onCustomRange?: (from: string, to: string) => void;
}

export function PeriodSelector({ value, onChange, customFrom = '', customTo = '', onCustomRange }: PeriodSelectorProps) {
  const t = useT();
  const [localFrom, setLocalFrom] = useState(customFrom);
  const [localTo, setLocalTo] = useState(customTo);

  // Reset local state when switching away from custom
  useEffect(() => {
    if (value !== 'custom') {
      setLocalFrom('');
      setLocalTo('');
    }
  }, [value]);

  const presets: { value: Period; label: string }[] = [
    { value: 'today',     label: t.period.today },
    { value: 'yesterday', label: t.period.yesterday },
    { value: 'week',      label: t.period.week },
    { value: 'month',     label: t.period.month },
    { value: 'custom',    label: t.period.custom },
  ];

  function handleApply() {
    if (localFrom && localTo) onCustomRange?.(localFrom, localTo);
  }

  const canApply = value === 'custom' && !!localFrom && !!localTo;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
        {presets.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
              value === opt.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {value === 'custom' && (
        <>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">{t.period.from}</span>
            <input
              type="date"
              value={localFrom}
              max={localTo || undefined}
              onChange={(e) => setLocalFrom(e.target.value)}
              className="text-sm border border-border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">{t.period.to}</span>
            <input
              type="date"
              value={localTo}
              min={localFrom || undefined}
              onChange={(e) => setLocalTo(e.target.value)}
              className="text-sm border border-border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            onClick={handleApply}
            disabled={!canApply}
            className="px-3 py-1.5 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {t.period.apply}
          </button>
        </>
      )}
    </div>
  );
}
