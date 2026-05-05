import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface DeltaBadgeProps {
  percent: number;   // ex: 12.5 ou -3.2
  label?: string;    // ex: "vs. ontem"
  size?: 'sm' | 'md';
}

export function DeltaBadge({ percent, label, size = 'sm' }: DeltaBadgeProps) {
  const isPositive = percent > 0;
  const isNeutral  = percent === 0;
  const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;
  const absPercent = Math.abs(percent).toFixed(1);

  return (
    <span className="flex items-center gap-1">
      <span
        className={cn(
          'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium',
          size === 'sm' ? 'text-xs' : 'text-sm',
          isPositive && 'bg-positive/12 text-positive',
          isNeutral  && 'bg-muted text-muted-foreground',
          !isPositive && !isNeutral && 'bg-negative/12 text-negative',
        )}
      >
        <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
        {absPercent}%
      </span>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </span>
  );
}
