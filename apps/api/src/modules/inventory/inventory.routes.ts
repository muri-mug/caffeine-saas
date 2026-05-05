import type { FastifyInstance } from 'fastify';
import { DatabaseService } from '../../lib/db/database.service.js';

const db = new DatabaseService();

export async function inventoryRoutes(app: FastifyInstance) {
  // GET /api/inventory — lista de variantes com nível de estoque
  app.get<{ Querystring: { storeId?: string; categoryId?: string; search?: string; status?: string } }>(
    '/',
    async (req: any) => {
      const { storeId, categoryId, search, status } = req.query;

      const items = await db.prisma.item.findMany({
        where: {
          tenantId: req.tenantId,
          deletedAt: null,
          ...(categoryId ? { categoryId } : {}),
          ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
        },
        include: {
          category: { select: { id: true, name: true, color: true } },
          variants: {
            include: {
              inventoryLevels: {
                where: storeId ? { storeId } : {},
                include: { store: { select: { id: true, name: true } } },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      // Achatar em lista de variantes com info de estoque
      const rows = items.flatMap((item) =>
        item.variants.map((variant) => {
          const level = variant.inventoryLevels[0] ?? null;
          const inStock = level ? Number(level.inStock) : null;
          const lowThreshold = level?.lowStockThreshold ? Number(level.lowStockThreshold) : null;

          let stockStatus: 'ok' | 'low' | 'out' | 'untracked' = 'untracked';
          if (item.trackStock && inStock !== null) {
            if (inStock <= 0) stockStatus = 'out';
            else if (lowThreshold !== null && inStock <= lowThreshold) stockStatus = 'low';
            else stockStatus = 'ok';
          }

          return {
            itemId:      item.id,
            itemName:    item.name,
            variantId:   variant.id,
            variantName: variant.name,
            sku:         variant.sku,
            price:       variant.price,
            cost:        variant.cost,
            category:    item.category,
            trackStock:  item.trackStock,
            inStock,
            lowThreshold,
            stockStatus,
            store:       level?.store ?? null,
          };
        }),
      );

      // Filtrar por status se solicitado
      const filtered = status ? rows.filter((r) => r.stockStatus === status) : rows;

      return {
        items: filtered,
        summary: {
          total:     rows.length,
          ok:        rows.filter((r) => r.stockStatus === 'ok').length,
          low:       rows.filter((r) => r.stockStatus === 'low').length,
          out:       rows.filter((r) => r.stockStatus === 'out').length,
          untracked: rows.filter((r) => r.stockStatus === 'untracked').length,
        },
      };
    },
  );

  // GET /api/inventory/categories — categorias para filtro
  app.get('/categories', async (req: any) => {
    return db.prisma.category.findMany({
      where: { tenantId: req.tenantId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, color: true },
    });
  });
}
