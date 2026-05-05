import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { DatabaseService } from './lib/db/database.service.js';
import { AuthService } from './lib/auth/auth.service.js';
import { ProviderRegistry } from './lib/providers/registry.js';
import { SyncService } from './modules/sync/sync.service.js';
import { dashboardRoutes }  from './modules/dashboard/dashboard.routes.js';
import { inventoryRoutes }  from './modules/inventory/inventory.routes.js';
import { cashflowRoutes }   from './modules/cashflow/cashflow.routes.js';
import { dreRoutes }        from './modules/dre/dre.routes.js';
import { receiptsRoutes }   from './modules/receipts/receipts.routes.js';
import {
  providerEventQueue,
  startEventWorker,
  startIncrementalSyncWorker,
  scheduleCronSync,
} from './lib/queue/queue.service.js';

const app = Fastify({ logger: { level: process.env['NODE_ENV'] === 'production' ? 'warn' : 'info' } });
const db   = new DatabaseService();
const auth = new AuthService();

await app.register(cors, {
  origin: process.env['APP_URL'] ?? 'http://localhost:3000',
  credentials: true,
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

// ── Auth middleware ───────────────────────────────────────────────────────────
async function requireAuth(request: any, reply: any) {
  const header = request.headers['authorization'];
  if (!header?.startsWith('Bearer ')) return reply.status(401).send({ error: 'Unauthorized' });
  try {
    const payload = await auth.verifyToken(header.slice(7));
    request.tenantId = payload.sub;
  } catch {
    return reply.status(401).send({ error: 'Token inválido ou expirado' });
  }
}

// ── POST /auth/login ──────────────────────────────────────────────────────────
app.post<{ Body: { slug: string; password: string } }>('/auth/login', async (req, reply) => {
  const { slug, password } = req.body;
  const tenant = await db.prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) return reply.status(401).send({ error: 'Credenciais inválidas' });

  // Em produção: comparar hash da senha. Em dev, aceita qualquer senha para o slug.
  if (process.env['NODE_ENV'] !== 'development') {
    if (!tenant.passwordHash || !auth.verifyPassword(password, tenant.passwordHash)) {
      return reply.status(401).send({ error: 'Credenciais inválidas' });
    }
  }

  const token = await auth.signToken({ sub: tenant.id, slug: tenant.slug });
  return { token, tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug } };
});

// ── GET /tenants/me ───────────────────────────────────────────────────────────
app.get('/tenants/me', { preHandler: requireAuth }, async (req: any) => {
  const tenant = await db.prisma.tenant.findUniqueOrThrow({ where: { id: req.tenantId } });
  const connections = await db.prisma.providerConnection.findMany({
    where: { tenantId: req.tenantId },
    select: { id: true, providerId: true, displayName: true, status: true, lastSyncAt: true },
  });
  return { tenant, connections };
});

// ── POST /providers/connect ───────────────────────────────────────────────────
app.post<{ Body: { providerId: string; accessToken: string; displayName?: string } }>(
  '/providers/connect',
  { preHandler: requireAuth },
  async (req: any, reply) => {
    const { providerId, accessToken, displayName } = req.body;

    if (!ProviderRegistry.isRegistered(providerId)) {
      return reply.status(400).send({ error: `Provider "${providerId}" não suportado` });
    }

    const provider = ProviderRegistry.build(providerId, { accessToken });
    const valid = await provider.validateCredentials();
    if (!valid) return reply.status(400).send({ error: 'Credenciais inválidas para o provider' });

    const conn = await db.prisma.providerConnection.upsert({
      where: { tenantId_providerId: { tenantId: req.tenantId, providerId } },
      update: { credentials: { access_token: accessToken }, status: 'active', lastSyncError: null },
      create: {
        tenantId: req.tenantId,
        providerId,
        displayName: displayName ?? provider.displayName,
        credentials: { access_token: accessToken },
        status: 'active',
      },
    });

    // Disparar sync inicial em background (não bloqueia a resposta)
    const syncService = new SyncService(provider, db);
    syncService.initialSync(req.tenantId).catch((err) => {
      console.error('[SyncService] Erro no sync inicial:', err);
      db.setSyncError(req.tenantId, String(err));
    });

    return { connection: conn, message: 'Conectado! Sync inicial em andamento.' };
  },
);

// ── POST /providers/sync ──────────────────────────────────────────────────────
app.post('/providers/sync', { preHandler: requireAuth }, async (req: any, reply) => {
  const conn = await db.getProviderConnection(req.tenantId);
  const creds = conn.credentials as { access_token: string };
  const provider = ProviderRegistry.build(conn.providerId, { accessToken: creds.access_token });
  const syncService = new SyncService(provider, db);

  syncService.incrementalSync(req.tenantId).catch((err) => {
    console.error('[SyncService] Erro no sync incremental:', err);
    db.setSyncError(req.tenantId, String(err));
  });

  return { message: 'Sync incremental iniciado' };
});

// ── Routes (todas protegidas por requireAuth via addHook no plugin wrapper) ────
await app.register(async (api) => {
  api.addHook('preHandler', requireAuth);
  await api.register(dashboardRoutes, { prefix: '/api/dashboard' });
  await api.register(inventoryRoutes, { prefix: '/api/inventory' });
  await api.register(cashflowRoutes,  { prefix: '/api/cashflow'  });
  await api.register(dreRoutes,       { prefix: '/api/dre'       });
  await api.register(receiptsRoutes,  { prefix: '/api/receipts'  });
});

// ── Webhook receiver (agnóstico) ──────────────────────────────────────────────
app.post<{ Params: { providerId: string } }>('/api/webhooks/:providerId', async (req, reply) => {
  const { providerId } = req.params;

  if (!ProviderRegistry.isRegistered(providerId)) {
    return reply.status(404).send({ error: `Provider "${providerId}" não suportado` });
  }

  // Identificar tenant pelo providerId + cabeçalho x-tenant-id (em produção: via host ou lookup)
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) return reply.status(400).send({ error: 'x-tenant-id header obrigatório' });

  const dbService = new DatabaseService();
  const conn = await dbService.getProviderConnection(tenantId).catch(() => null);
  if (!conn) return reply.status(404).send({ error: 'Tenant/provider não encontrado' });

  const creds    = conn.credentials as { access_token: string; webhook_secret?: string };
  const provider = ProviderRegistry.build(providerId, {
    accessToken: creds.access_token,
    webhookSecret: creds.webhook_secret,
  });

  // Validar assinatura
  if (provider.supportsWebhooks && provider.validateWebhookSignature) {
    const valid = provider.validateWebhookSignature(
      JSON.stringify(req.body),
      req.headers as Record<string, string>,
    );
    if (!valid) return reply.status(401).send({ error: 'Assinatura inválida' });
  }

  // Parsear e enfileirar o evento
  if (provider.parseWebhookEvent) {
    const event = provider.parseWebhookEvent(req.body, req.headers as Record<string, string>);
    event.tenantId = tenantId;
    await providerEventQueue.add(event.eventType, event);
  }

  return reply.status(200).send('OK');
});

// ── Start ─────────────────────────────────────────────────────────────────────
const port = parseInt(process.env['PORT'] ?? '3001', 10);
await app.listen({ port, host: '0.0.0.0' });
console.log(`API rodando em http://localhost:${port}`);

// Iniciar workers BullMQ
startEventWorker();
startIncrementalSyncWorker();

// Agendar cron de sync para todos os tenants ativos
const activeConnections = await db.prisma.providerConnection.findMany({
  where: { status: 'active' },
  distinct: ['tenantId'],
  select: { tenantId: true },
});
await scheduleCronSync(activeConnections.map((c) => c.tenantId));
