import type { FastifyInstance } from 'fastify';
import { startOfDay, endOfDay, subDays, parseISO } from 'date-fns';
import { DatabaseService } from '../../lib/db/database.service.js';

const db = new DatabaseService();

function parseDateRange(query: Record<string, string | undefined>) {
  const period = query['period'] ?? 'today';
  const now = new Date();
  switch (period) {
    case 'today':     return { from: startOfDay(now),           to: endOfDay(now) };
    case 'yesterday': return { from: startOfDay(subDays(now,1)), to: endOfDay(subDays(now,1)) };
    case 'week':      return { from: startOfDay(subDays(now,6)), to: endOfDay(now) };
    case 'custom': {
      const from = query['from'] ? parseISO(query['from']) : startOfDay(now);
      const to   = query['to']   ? parseISO(query['to'])   : endOfDay(now);
      return { from, to };
    }
    default: return { from: startOfDay(now), to: endOfDay(now) };
  }
}

export async function cashflowRoutes(app: FastifyInstance) {
  // GET /api/cashflow — turnos com status de caixa
  app.get<{ Querystring: { period?: string; from?: string; to?: string; storeId?: string } }>(
    '/',
    async (req: any) => {
      const { from, to } = parseDateRange(req.query);
      const { storeId } = req.query;

      const shifts = await db.prisma.shift.findMany({
        where: {
          tenantId: req.tenantId,
          openedAt: { gte: from, lte: to },
          ...(storeId ? { storeId } : {}),
        },
        include: {
          store:    { select: { id: true, name: true } },
          employee: { select: { id: true, name: true } },
        },
        orderBy: { openedAt: 'desc' },
      });

      const enriched = shifts.map((shift) => {
        const diff = shift.cashDifference ?? 0;
        let cashStatus: 'ok' | 'low_diff' | 'high_diff' | 'open';
        if (!shift.closedAt)           cashStatus = 'open';
        else if (Math.abs(diff) === 0) cashStatus = 'ok';
        else if (Math.abs(diff) <= 500) cashStatus = 'low_diff';   // ≤ R$5
        else                            cashStatus = 'high_diff';

        return { ...shift, cashStatus };
      });

      // Resumo do período
      const closed = enriched.filter((s) => s.closedAt);
      const summary = {
        totalShifts:          shifts.length,
        closedShifts:         closed.length,
        openShifts:           shifts.filter((s) => !s.closedAt).length,
        totalNetRevenue:      closed.reduce((s, x) => s + x.netTotal, 0),
        totalCashReceived:    closed.reduce((s, x) => s + x.cashReceived, 0),
        totalCashPaidOut:     closed.reduce((s, x) => s + x.cashPaidOut, 0),
        totalCashDifference:  closed.reduce((s, x) => s + (x.cashDifference ?? 0), 0),
        shiftsWithDifference: closed.filter((s) => Math.abs(s.cashDifference ?? 0) > 0).length,
      };

      return { shifts: enriched, summary };
    },
  );
}
