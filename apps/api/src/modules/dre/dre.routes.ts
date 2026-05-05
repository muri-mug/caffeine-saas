import type { FastifyInstance } from 'fastify';
import { startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import { DatabaseService } from '../../lib/db/database.service.js';

const db = new DatabaseService();

function parseDateRange(query: Record<string, string | undefined>) {
  const period = query['period'] ?? 'month';
  const now = new Date();
  switch (period) {
    case 'month':    return { from: startOfMonth(now),           to: endOfMonth(now) };
    case 'lastmonth':return { from: startOfMonth(subMonths(now,1)), to: endOfMonth(subMonths(now,1)) };
    case 'custom': {
      const from = query['from'] ? parseISO(query['from']) : startOfMonth(now);
      const to   = query['to']   ? parseISO(query['to'])   : endOfMonth(now);
      return { from, to };
    }
    default: return { from: startOfMonth(now), to: endOfMonth(now) };
  }
}

export async function dreRoutes(app: FastifyInstance) {
  // GET /api/dre — DRE do período
  app.get<{ Querystring: { period?: string; from?: string; to?: string; storeId?: string } }>(
    '/',
    async (req: any) => {
      const { from, to } = parseDateRange(req.query);
      const { storeId } = req.query;
      const tenantId = req.tenantId;

      const where = {
        tenantId,
        cancelledAt: null,
        createdAt: { gte: from, lte: to },
        ...(storeId ? { storeId } : {}),
      };

      const [sales, refunds, lineItems, expenses] = await Promise.all([
        db.prisma.receipt.aggregate({
          where: { ...where, type: 'sale' },
          _sum:   { totalAmount: true, totalDiscount: true, totalTax: true },
          _count: { id: true },
        }),
        db.prisma.receipt.aggregate({
          where: { ...where, type: 'refund' },
          _sum: { totalAmount: true },
        }),
        db.prisma.receiptLineItem.aggregate({
          where: { receipt: { ...where, type: 'sale' } },
          _sum: { totalCost: true },
        }),
        db.prisma.expense.findMany({
          where: {
            tenantId,
            referenceDate: { gte: from, lte: to },
            ...(storeId ? { storeId } : {}),
          },
          orderBy: { referenceDate: 'desc' },
        }),
      ]);

      const grossRevenue  = sales._sum.totalAmount ?? 0;
      const refundsTotal  = refunds._sum.totalAmount ?? 0;
      const discounts     = sales._sum.totalDiscount ?? 0;
      const taxes         = sales._sum.totalTax ?? 0;
      const netRevenue    = grossRevenue - refundsTotal - discounts - taxes;
      const cmv           = lineItems._sum.totalCost ?? 0;
      const grossProfit   = netRevenue - cmv;
      const grossMargin   = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

      // Agrupar despesas por categoria
      const expensesByCategory = expenses.reduce<Record<string, number>>((acc, e) => {
        acc[e.category] = (acc[e.category] ?? 0) + e.amount;
        return acc;
      }, {});
      const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

      const ebitda      = grossProfit - totalExpenses;
      const netProfit   = ebitda;
      const netMargin   = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

      return {
        period: { from, to },
        dre: {
          grossRevenue,
          refundsTotal,
          discounts,
          taxes,
          netRevenue,
          cmv,
          grossProfit,
          grossMarginPct: Math.round(grossMargin * 10) / 10,
          expenses: expensesByCategory,
          totalExpenses,
          ebitda,
          netProfit,
          netMarginPct: Math.round(netMargin * 10) / 10,
        },
        expensesList: expenses,
        transactionsCount: sales._count.id,
      };
    },
  );

  // POST /api/dre/expenses — lançar despesa manual
  app.post<{
    Body: {
      category: string;
      description: string;
      amount: number;
      recurrence?: string;
      referenceDate: string;
      storeId?: string;
    };
  }>('/expenses', async (req: any, reply) => {
    const { category, description, amount, recurrence, referenceDate, storeId } = req.body;

    if (!['rent', 'salary', 'utilities', 'other'].includes(category)) {
      return reply.status(400).send({ error: 'Categoria inválida' });
    }

    const expense = await db.prisma.expense.create({
      data: {
        tenantId:      req.tenantId,
        storeId:       storeId ?? null,
        category,
        description,
        amount,
        recurrence:    recurrence ?? 'one_time',
        referenceDate: parseISO(referenceDate),
      },
    });

    return expense;
  });

  // DELETE /api/dre/expenses/:id
  app.delete<{ Params: { id: string } }>('/expenses/:id', async (req: any, reply) => {
    const expense = await db.prisma.expense.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!expense) return reply.status(404).send({ error: 'Despesa não encontrada' });
    await db.prisma.expense.delete({ where: { id: req.params.id } });
    return { ok: true };
  });
}
