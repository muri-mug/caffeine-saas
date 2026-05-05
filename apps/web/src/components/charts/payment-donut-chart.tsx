'use client';

import { Card } from '@tremor/react';
import { useT } from '@/lib/i18n';
import { formatCurrency } from '@/lib/format';

interface PaymentDonutChartProps {
  data: { name: string; amount: number }[];
  loading?: boolean;
}

const COLORS = ['#3b82f6', '#f97316', '#10b981', '#f43f5e', '#8b5cf6', '#eab308', '#06b6d4'];

function DonutSVG({ data }: { data: { name: string; amount: number }[] }) {
  const total = data.reduce((s, d) => s + d.amount, 0);
  if (total === 0) return null;

  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const r = 56;
  const innerR = 34;

  let cumulative = 0;
  const slices = data.map((d, i) => {
    const pct = d.amount / total;
    const startAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    cumulative += pct;
    const endAngle = cumulative * 2 * Math.PI - Math.PI / 2;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const ix1 = cx + innerR * Math.cos(endAngle);
    const iy1 = cy + innerR * Math.sin(endAngle);
    const ix2 = cx + innerR * Math.cos(startAngle);
    const iy2 = cy + innerR * Math.sin(startAngle);
    const large = pct > 0.5 ? 1 : 0;

    return {
      d: `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${large} 0 ${ix2} ${iy2} Z`,
      color: COLORS[i % COLORS.length],
    };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((s, i) => (
        <path key={i} d={s.d} fill={s.color} stroke="white" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

export function PaymentDonutChart({ data, loading }: PaymentDonutChartProps) {
  const t = useT();

  if (loading) return <Card className="h-64 animate-pulse bg-muted" />;

  const total = data.reduce((s, d) => s + d.amount, 0);

  return (
    <Card>
      <p className="text-base font-semibold text-foreground">{t.dashboard.paymentMethods}</p>
      <div className="mt-4 flex flex-col items-center gap-4">
        <div className="relative">
          <DonutSVG data={data} />
          {total > 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-medium text-muted-foreground financial-value">
                {formatCurrency(total)}
              </span>
            </div>
          )}
        </div>
        <div className="w-full space-y-1.5">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-muted-foreground">{d.name}</span>
              </div>
              <span className="financial-value text-foreground font-medium">{formatCurrency(d.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
