// Queries financeiras agnósticas ao provider.
// Consulta apenas o banco normalizado — não sabe de Loyverse.

import type { PrismaClient } from '@prisma/client';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, subMonths } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface OverviewMetrics {
  revenue: number;          // centavos
  revenueNet: number;       // centavos (sem desconto e tax)
  costTotal: number;        // CMV em centavos
  grossProfit: number;      // centavos
  grossMarginPct: number;   // %
  transactionsCount: number;
  avgTicket: number;        // centavos
  refundsTotal: number;     // centavos
  discountsTotal: number;   // centavos
  // Deltas vs período anterior (%)
  revenueDelta?: number;
  transactionsDelta?: number;
  avgTicketDelta?: number;
}

export interface HourlyRevenue {
  hour: string;      // "08:00"
  receita: number;   // centavos
  transacoes: number;
}

export interface PaymentSplit {
  name: string;
  amount: number;   // centavos
  count: number;
  pct: number;      // % do total
}

export class DashboardService {
  constructor(private readonly prisma: PrismaClient) {}

  async getOverview(tenantId: string, range: DateRange, storeId?: string): Promise<OverviewMetrics> {
    const where = this.buildReceiptWhere(tenantId, range, storeId);

    const [sales, refunds, lineItemAgg] = await Promise.all([
      // Vendas no período
      this.prisma.receipt.aggregate({
        where: { ...where, type: 'sale' },
        _sum:   { totalAmount: true, totalDiscount: true, totalTax: true },
        _count: { id: true },
      }),
      // Devoluções
      this.prisma.receipt.aggregate({
        where: { ...where, type: 'refund' },
        _sum: { totalAmount: true },
      }),
      // CMV
      this.prisma.receiptLineItem.aggregate({
        where: { receipt: { ...where, type: 'sale' } },
        _sum: { totalCost: true },
      }),
    ]);

    const revenue      = sales._sum.totalAmount ?? 0;
    const discounts    = sales._sum.totalDiscount ?? 0;
    const tax          = sales._sum.totalTax ?? 0;
    const revenueNet   = revenue - discounts - tax;
    const costTotal    = lineItemAgg._sum.totalCost ?? 0;
    const grossProfit  = revenueNet - costTotal;
    const grossMargin  = revenueNet > 0 ? (grossProfit / revenueNet) * 100 : 0;
    const count        = sales._count.id;
    const refundsTotal = refunds._sum.totalAmount ?? 0;
    const avgTicket    = count > 0 ? Math.round(revenue / count) : 0;

    // Delta vs período anterior
    const prevRange = this.previousPeriod(range);
    const prevWhere = this.buildReceiptWhere(tenantId, prevRange, storeId);
    const prevSales = await this.prisma.receipt.aggregate({
      where: { ...prevWhere, type: 'sale' },
      _sum:   { totalAmount: true },
      _count: { id: true },
    });

    const prevRevenue = prevSales._sum.totalAmount ?? 0;
    const prevCount   = prevSales._count.id;
    const prevAvg     = prevCount > 0 ? Math.round(prevRevenue / prevCount) : 0;

    return {
      revenue,
      revenueNet,
      costTotal,
      grossProfit,
      grossMarginPct: Math.round(grossMargin * 10) / 10,
      transactionsCount: count,
      avgTicket,
      refundsTotal,
      discountsTotal: discounts,
      revenueDelta:      prevRevenue > 0 ? Math.round(((revenue - prevRevenue) / prevRevenue) * 1000) / 10 : undefined,
      transactionsDelta: prevCount > 0   ? Math.round(((count - prevCount) / prevCount) * 1000) / 10 : undefined,
      avgTicketDelta:    prevAvg > 0     ? Math.round(((avgTicket - prevAvg) / prevAvg) * 1000) / 10 : undefined,
    };
  }

  async getHourlyRevenue(tenantId: string, range: DateRange, storeId?: string): Promise<HourlyRevenue[]> {
    const where = this.buildReceiptWhere(tenantId, range, storeId);

    const receipts = await this.prisma.receipt.findMany({
      where: { ...where, type: 'sale' },
      select: { createdAt: true, totalAmount: true },
    });

    // Agrupar por hora (timezone America/Sao_Paulo)
    const buckets: Record<string, { receita: number; transacoes: number }> = {};

    for (const r of receipts) {
      const zoned = toZonedTime(r.createdAt, 'America/Sao_Paulo');
      const hour  = `${String(zoned.getHours()).padStart(2, '0')}:00`;
      if (!buckets[hour]) buckets[hour] = { receita: 0, transacoes: 0 };
      buckets[hour].receita     += r.totalAmount;
      buckets[hour].transacoes  += 1;
    }

    // Preencher todas as horas de 00 a 23
    return Array.from({ length: 24 }, (_, h) => {
      const hour = `${String(h).padStart(2, '0')}:00`;
      return { hour, receita: buckets[hour]?.receita ?? 0, transacoes: buckets[hour]?.transacoes ?? 0 };
    });
  }

  async getPaymentSplit(tenantId: string, range: DateRange, storeId?: string): Promise<PaymentSplit[]> {
    const where = this.buildReceiptWhere(tenantId, range, storeId);

    const payments = await this.prisma.receiptPayment.groupBy({
      by: ['paymentTypeName'],
      where: { receipt: { ...where, type: 'sale' } },
      _sum:   { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: 'desc' } },
    });

    const total = payments.reduce((s, p) => s + (p._sum.amount ?? 0), 0);

    return payments.map((p) => ({
      name:   p.paymentTypeName,
      amount: p._sum.amount ?? 0,
      count:  p._count.id,
      pct:    total > 0 ? Math.round(((p._sum.amount ?? 0) / total) * 1000) / 10 : 0,
    }));
  }

  async getTopProducts(tenantId: string, range: DateRange, storeId?: string, limit = 10) {
    const where = this.buildReceiptWhere(tenantId, range, storeId);

    const items = await this.prisma.receiptLineItem.groupBy({
      by: ['itemName'],
      where: { receipt: { ...where, type: 'sale' } },
      _sum:   { totalPrice: true, quantity: true },
      _count: { id: true },
      orderBy: { _sum: { totalPrice: 'desc' } },
      take: limit,
    });

    return items.map((i) => ({
      name:     i.itemName,
      revenue:  i._sum.totalPrice ?? 0,
      quantity: Number(i._sum.quantity ?? 0),
      orders:   i._count.id,
    }));
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private buildReceiptWhere(tenantId: string, range: DateRange, storeId?: string) {
    return {
      tenantId,
      cancelledAt: null,
      createdAt: { gte: range.from, lte: range.to },
      ...(storeId ? { storeId } : {}),
    };
  }

  private previousPeriod(range: DateRange): DateRange {
    const duration = range.to.getTime() - range.from.getTime();
    return {
      from: new Date(range.from.getTime() - duration),
      to:   new Date(range.from.getTime() - 1),
    };
  }
}
