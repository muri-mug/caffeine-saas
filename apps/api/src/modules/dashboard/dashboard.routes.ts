import type { FastifyInstance } from 'fastify';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, parseISO } from 'date-fns';
import { DatabaseService } from '../../lib/db/database.service.js';
import { DashboardService } from './dashboard.service.js';

const db        = new DatabaseService();
const dashboard = new DashboardService(db.prisma);

function parseDateRange(query: Record<string, string | undefined>) {
  const period = query['period'] ?? 'today';
  const now = new Date();

  switch (period) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case 'yesterday':
      return { from: startOfDay(subDays(now, 1)), to: endOfDay(subDays(now, 1)) };
    case 'week':
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case 'month':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'custom': {
      const from = query['from'] ? parseISO(query['from']) : startOfDay(now);
      const to   = query['to']   ? parseISO(query['to'])   : endOfDay(now);
      return { from, to };
    }
    default:
      return { from: startOfDay(now), to: endOfDay(now) };
  }
}

export async function dashboardRoutes(app: FastifyInstance) {
  // GET /api/dashboard/overview
  app.get<{ Querystring: { period?: string; from?: string; to?: string; storeId?: string } }>(
    '/overview',
    async (req: any) => {
      const range = parseDateRange(req.query);
      return dashboard.getOverview(req.tenantId, range, req.query.storeId);
    },
  );

  // GET /api/dashboard/hourly
  app.get<{ Querystring: { period?: string; from?: string; to?: string; storeId?: string } }>(
    '/hourly',
    async (req: any) => {
      const range = parseDateRange(req.query);
      return dashboard.getHourlyRevenue(req.tenantId, range, req.query.storeId);
    },
  );

  // GET /api/dashboard/payments
  app.get<{ Querystring: { period?: string; from?: string; to?: string; storeId?: string } }>(
    '/payments',
    async (req: any) => {
      const range = parseDateRange(req.query);
      return dashboard.getPaymentSplit(req.tenantId, range, req.query.storeId);
    },
  );

  // GET /api/dashboard/top-products
  app.get<{ Querystring: { period?: string; from?: string; to?: string; storeId?: string; limit?: string } }>(
    '/top-products',
    async (req: any) => {
      const range = parseDateRange(req.query);
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
      return dashboard.getTopProducts(req.tenantId, range, req.query.storeId, limit);
    },
  );
}
