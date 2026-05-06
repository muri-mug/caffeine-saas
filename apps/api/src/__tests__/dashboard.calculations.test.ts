/**
 * Testes de lógica de cálculo do DashboardService.
 * Usa mocks do Prisma para isolar a aritmética sem banco real.
 *
 * Semântica dos campos (ver dashboard.service.ts):
 *   subtotal      = totalAmount + totalDiscount  (preço cheio, antes de descontos)
 *   totalAmount   = o que o cliente pagou         (após descontos)
 *   totalDiscount = desconto concedido            (já deduzido do totalAmount)
 *   totalTax      = imposto embutido no totalAmount
 *
 *   grossRevenue  = SUM(subtotal)                 → Receita Bruta (preço cheio)
 *   revenue       = SUM(totalAmount)              → Receita após descontos
 *   revenueNet    = revenue - taxes               → Receita Líquida
 *   grossProfit   = revenueNet - CMV
 *   grossMarginPct = grossProfit / revenueNet × 100
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardService } from '../modules/dashboard/dashboard.service.js';

function makePrisma() {
  return {
    receipt: {
      aggregate: vi.fn(),
      findMany:  vi.fn().mockResolvedValue([]),
    },
    receiptLineItem: {
      aggregate: vi.fn(),
    },
  } as any;
}

const RANGE = { from: new Date('2025-01-01'), to: new Date('2025-01-31') };

describe('DashboardService — getOverview calculations', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let svc: DashboardService;

  beforeEach(() => {
    prisma = makePrisma();
    svc = new DashboardService(prisma);
  });

  it('grossRevenue usa subtotal (preço cheio, não totalAmount)', async () => {
    // Produto R$100, desconto R$10 → cliente paga R$90
    // subtotal=10000, totalAmount=9000, totalDiscount=1000
    prisma.receipt.aggregate
      .mockResolvedValueOnce({
        _sum:   { subtotal: 10000, totalAmount: 9000, totalDiscount: 1000, totalTax: 0 },
        _count: { id: 1 },
      })
      .mockResolvedValueOnce({ _sum: { totalAmount: 0 } })          // refunds
      .mockResolvedValueOnce({ _sum: { subtotal: 0, totalAmount: 0 }, _count: { id: 0 } }); // prev period

    prisma.receiptLineItem.aggregate.mockResolvedValue({ _sum: { totalCost: 0 } });

    const result = await svc.getOverview('tenant-1', RANGE);

    expect(result.grossRevenue).toBe(10000);   // preço cheio
    expect(result.revenue).toBe(9000);         // após desconto
    expect(result.discountsTotal).toBe(1000);  // informativo
  });

  it('revenueNet = revenue - taxes (sem double-counting de desconto)', async () => {
    // totalAmount=9000, totalDiscount=1000, totalTax=810 (9%)
    prisma.receipt.aggregate
      .mockResolvedValueOnce({
        _sum:   { subtotal: 10000, totalAmount: 9000, totalDiscount: 1000, totalTax: 810 },
        _count: { id: 1 },
      })
      .mockResolvedValueOnce({ _sum: { totalAmount: 0 } })
      .mockResolvedValueOnce({ _sum: { subtotal: 0, totalAmount: 0 }, _count: { id: 0 } });

    prisma.receiptLineItem.aggregate.mockResolvedValue({ _sum: { totalCost: 0 } });

    const result = await svc.getOverview('tenant-1', RANGE);

    expect(result.revenueNet).toBe(8190);   // 9000 - 810
    expect(result.taxTotal).toBe(810);
  });

  it('grossProfit e grossMarginPct calculados sobre revenueNet', async () => {
    // revenue=10000, tax=0, CMV=4000 → grossProfit=6000, margin=60%
    prisma.receipt.aggregate
      .mockResolvedValueOnce({
        _sum:   { subtotal: 10000, totalAmount: 10000, totalDiscount: 0, totalTax: 0 },
        _count: { id: 10 },
      })
      .mockResolvedValueOnce({ _sum: { totalAmount: 0 } })
      .mockResolvedValueOnce({ _sum: { subtotal: 0, totalAmount: 0 }, _count: { id: 0 } });

    prisma.receiptLineItem.aggregate.mockResolvedValue({ _sum: { totalCost: 4000 } });

    const result = await svc.getOverview('tenant-1', RANGE);

    expect(result.costTotal).toBe(4000);
    expect(result.grossProfit).toBe(6000);
    expect(result.grossMarginPct).toBe(60);
  });

  it('grossMarginPct é 0 quando revenueNet é 0', async () => {
    prisma.receipt.aggregate
      .mockResolvedValueOnce({ _sum: { subtotal: 0, totalAmount: 0, totalDiscount: 0, totalTax: 0 }, _count: { id: 0 } })
      .mockResolvedValueOnce({ _sum: { totalAmount: 0 } })
      .mockResolvedValueOnce({ _sum: { subtotal: 0, totalAmount: 0 }, _count: { id: 0 } });

    prisma.receiptLineItem.aggregate.mockResolvedValue({ _sum: { totalCost: 0 } });

    const result = await svc.getOverview('tenant-1', RANGE);

    expect(result.grossMarginPct).toBe(0);
  });

  it('avgTicket calculado sobre revenue (totalAmount), não grossRevenue', async () => {
    // 4 vendas, totalAmount=8000 (após desconto) → avgTicket=2000
    prisma.receipt.aggregate
      .mockResolvedValueOnce({
        _sum:   { subtotal: 9600, totalAmount: 8000, totalDiscount: 1600, totalTax: 0 },
        _count: { id: 4 },
      })
      .mockResolvedValueOnce({ _sum: { totalAmount: 0 } })
      .mockResolvedValueOnce({ _sum: { subtotal: 0, totalAmount: 0 }, _count: { id: 0 } });

    prisma.receiptLineItem.aggregate.mockResolvedValue({ _sum: { totalCost: 0 } });

    const result = await svc.getOverview('tenant-1', RANGE);

    expect(result.avgTicket).toBe(2000);          // 8000 / 4
    expect(result.transactionsCount).toBe(4);
  });

  it('revenueDelta compara grossRevenue (preço cheio) entre períodos', async () => {
    // Período atual: grossRevenue=10000; período anterior: grossRevenue=8000 → delta=+25%
    prisma.receipt.aggregate
      .mockResolvedValueOnce({
        _sum:   { subtotal: 10000, totalAmount: 9500, totalDiscount: 500, totalTax: 0 },
        _count: { id: 10 },
      })
      .mockResolvedValueOnce({ _sum: { totalAmount: 0 } })  // refunds
      .mockResolvedValueOnce({ _sum: { subtotal: 8000, totalAmount: 7600 }, _count: { id: 8 } }); // prev

    prisma.receiptLineItem.aggregate.mockResolvedValue({ _sum: { totalCost: 0 } });

    const result = await svc.getOverview('tenant-1', RANGE);

    expect(result.revenueDelta).toBe(25);  // (10000-8000)/8000 × 100
  });
});
