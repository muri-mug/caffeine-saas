'use client';

import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';
import type { Period } from '@/hooks/use-dashboard';

interface PeriodSelectorProps {
  value: Period;
  onChange: (period: Period) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  const t = useT();

  const options: { value: Period; label: string }[] = [
    { value: 'today',     label: t.period.today },
    { value: 'yesterday', label: t.period.yesterday },
    { value: 'week',      label: t.period.week },
    { value: 'month',     label: t.period.month },
  ];

  return (
    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            value === opt.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
