'use client';

import { Tracker, Card } from '@tremor/react';

export interface ShiftStatus {
  key: string;
  label: string;
  color: 'emerald' | 'red' | 'amber' | 'gray';
  tooltip: string;
}

export function CashflowTracker({ shifts }: { shifts: ShiftStatus[] }) {
  return (
    <Card>
      <p className="text-base font-semibold text-foreground">Status dos turnos</p>
      <p className="text-sm text-muted-foreground mt-1">
        Verde = caixa OK · Amarelo = diferença pequena · Vermelho = diferença significativa
      </p>
      <Tracker className="mt-4" data={shifts} />
    </Card>
  );
}
