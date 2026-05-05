import { cn } from '@/lib/utils';

const providerColors: Record<string, string> = {
  loyverse: 'bg-blue-100 text-blue-700',
  square:   'bg-green-100 text-green-700',
  ifood:    'bg-red-100 text-red-700',
};

export function ProviderBadge({ providerId }: { providerId: string }) {
  const label = providerId.charAt(0).toUpperCase() + providerId.slice(1);
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium',
        providerColors[providerId] ?? 'bg-muted text-muted-foreground',
      )}
    >
      {label}
    </span>
  );
}
