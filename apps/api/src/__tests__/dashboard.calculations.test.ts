/**
 * Testes de lógica de cálculo do DashboardService.
 * Usa mocks do Prisma para isolar a aritmética sem banco real.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardService } from '../modules/dashboard/dashboard.service.js';

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    receipt: {
      aggregate: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    receiptLineItem: {
      aggregate: vi.fn(),
    },
    ...overrides,
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

  it('revenueNet não desconta totalDiscount duas vezes (totalAmount já é líquido de desconto)', async () => {
    // Produto: R$100, desconto R$10 → cliente paga R$90 → totalAmount=9000, totalDiscount=1000
    prisma.receipt.aggregate
      .mockResolvedValueOnce({
        _sum:   { totalAmount: 9000, totalDiscount: 1000, totalTax: 0 },
        _count: { id: 1 },
      })
      // refunds
      .mockResolvedValueOnce({ _sum: { totalAmount: 0 } })
      // prev period
      .mockResolvedValueOnce({ _sum: { totalAmount: 0 }, _count: { id: 0 } });

    prisma.receiptLineItem.aggregate.mockResolvedValue({ _sum: { totalCost: 0 } });

    const result = await svc.getOverview('tenant-1', RANGE);

    // revenueNet = totalAmount - totalTax = 9000 - 0 = 9000 (NÃO 9000 - 1000 = 8000)
    expect(result.revenue).toBe(9000);
    expect(result.revenueNet).toBe(9000);
    expect(result.discountsTotal).toBe(1000); // informativo
  });

  it('revenueNet desconta apenas totalTax quando há imposto embutido', async () => {
    // totalAmount=10000, totalDiscount=500, totalTax=900 (9% embutido)
    prisma.receipt.aggregate
      .mockResolvedValueOnce({
        _sum:   { totalAmount: 10000, totalDiscount: 500, totalTax: 900 },
        _count: { id: 5 },
      })
      .mockResolvedValueOnce({ _sum: { totalAmount: 0 } })
      .mockResolvedValueOnce({ _sum: { totalAmount: 0 }, _count: { id: 0 } });

    prisma.receiptLineItem.aggregate.mockResolvedValue({ _sum: { totalCost: 0 } });

    const result = await svc.getOverview('tenant-1', RANGE);

    expect(result.revenue).toBe(10000);
    expect(result.revenueNet).toBe(9100);  // 10000 - 900
    expect(result.discountsTotal).toBe(500);
  });

  it('grossProfit e grossMarginPct calculados sobre revenueNet correto', async () => {
    // revenue=10000, tax=0, cost=4000 → grossProfit=6000, margin=60%
    prisma.receipt.aggregate
      .mockResolvedValueOnce({
        _sum:   { totalAmount: 10000, totalDiscount: 0, totalTax: 0 },
        _count: { id: 10 },
      })
      .mockResolvedValueOnce({ _sum: { totalAmount: 0 } })
      .mockResolvedValueOnce({ _sum: { totalAmount: 0 }, _count: { id: 0 } });

    prisma.receiptLineItem.aggregate.mockResolvedValue({ _sum: { totalCost: 4000 } });

    const result = await svc.getOverview('tenant-1', RANGE);

    expect(result.costTotal).toBe(4000);
    expect(result.grossProfit).toBe(6000);
    expect(result.grossMarginPct).toBe(60);
  });

  it('grossMarginPct is 0 when revenueNet is 0', async () => {
    prisma.receipt.aggregate
      .mockResolvedValueOnce({ _sum: { totalAmount: 0, totalDiscount: 0, totalTax: 0 }, _count: { id: 0 } })
      .mockResolvedValueOnce({ _sum: { totalAmount: 0 } })
      .mockResolvedValueOnce({ _sum: { totalAmount: 0 }, _count: { id: 0 } });

    prisma.receiptLineItem.aggregate.mockResolvedValue({ _sum: { totalCost: 0 } });

    const result = await svc.getOverview('tenant-1', RANGE);

    expect(result.grossMarginPct).toBe(0);
  });

  it('avgTicket calculado sobre revenue (totalAmount), não revenueNet', async () => {
    // 4 vendas, totalAmount=8000 → avgTicket=2000
    prisma.receipt.aggregate
      .mockResolvedValueOnce({
        _sum:   { totalAmount: 8000, totalDiscount: 400, totalTax: 0 },
        _count: { id: 4 },
      })
      .mockResolvedValueOnce({ _sum: { totalAmount: 0 } })
      .mockResolvedValueOnce({ _sum: { totalAmount: 0 }, _count: { id: 0 } });

    prisma.receiptLineItem.aggregate.mockResolvedValue({ _sum: { totalCost: 0 } });

    const result = await svc.getOverview('tenant-1', RANGE);

    expect(result.avgTicket).toBe(2000);
    expect(result.transactionsCount).toBe(4);
  });
});
