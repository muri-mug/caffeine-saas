import type { FastifyInstance } from 'fastify';
import { startOfDay, endOfDay, subDays, parseISO } from 'date-fns';
import { DatabaseService } from '../../lib/db/database.service.js';

const db = new DatabaseService();

function parseDateRange(query: Record<string, string | undefined>) {
  const period = query['period'] ?? 'today';
  const now = new Date();
  switch (period) {
    case 'today':     return { from: startOfDay(now),            to: endOfDay(now) };
    case 'yesterday': return { from: startOfDay(subDays(now,1)), to: endOfDay(subDays(now,1)) };
    case 'week':      return { from: startOfDay(subDays(now,6)), to: endOfDay(now) };
    case 'month':     return { from: startOfDay(subDays(now,29)), to: endOfDay(now) };
    case 'custom': {
      const from = query['from'] ? parseISO(query['from']) : startOfDay(now);
      const to   = query['to']   ? parseISO(query['to'])   : endOfDay(now);
      return { from, to };
    }
    default: return { from: startOfDay(now), to: endOfDay(now) };
  }
}

export async function receiptsRoutes(app: FastifyInstance) {
  // GET /api/receipts
  app.get<{
    Querystring: {
      period?: string; from?: string; to?: string;
      storeId?: string; type?: string;
      page?: string; pageSize?: string;
    }
  }>('/', async (req: any) => {
    const { from, to } = parseDateRange(req.query);
    const { storeId, type } = req.query;
    const page     = Math.max(1, parseInt(req.query.page ?? '1', 10));
    const pageSize = Math.min(100, parseInt(req.query.pageSize ?? '50', 10));

    const where = {
      tenantId: req.tenantId,
      createdAt: { gte: from, lte: to },
      ...(storeId ? { storeId } : {}),
      ...(type ? { type } : {}),
    };

    const [receipts, total] = await Promise.all([
      db.prisma.receipt.findMany({
        where,
        include: {
          store:    { select: { id: true, name: true } },
          employee: { select: { id: true, name: true } },
          payments: { select: { paymentTypeName: true, paymentTypeCategory: true, amount: true } },
          lineItems: {
            select: { itemName: true, variantName: true, quantity: true, totalPrice: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip:  (page - 1) * pageSize,
        take:  pageSize,
      }),
      db.prisma.receipt.count({ where }),
    ]);

    return {
      receipts,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  });
}
