import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';

interface CurrencyValueProps {
  cents: number;
  className?: string;
  colorize?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizes = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
  xl: 'text-3xl font-semibold',
};

export function CurrencyValue({ cents, className, colorize, size = 'md' }: CurrencyValueProps) {
  return (
    <span
      className={cn(
        'financial-value',
        sizes[size],
        colorize && cents > 0 && 'text-positive',
        colorize && cents < 0 && 'text-negative',
        colorize && cents === 0 && 'text-muted-foreground',
        className,
      )}
    >
      {formatCurrency(cents)}
    </span>
  );
}
