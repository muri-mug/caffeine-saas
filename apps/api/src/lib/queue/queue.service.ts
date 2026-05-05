import { Queue, Worker, type Job } from 'bullmq';
import { Redis } from 'ioredis';
import type { ProviderEvent } from '@sarta/shared';
import { ProviderRegistry } from '../providers/registry.js';
import { DatabaseService } from '../db/database.service.js';
import { SyncService } from '../../modules/sync/sync.service.js';

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
const connection = new Redis(REDIS_URL, { maxRetriesPerRequest: null });

// ── Filas ────────────────────────────────────────────────────────────────────

export const providerEventQueue = new Queue<ProviderEvent>('provider-events', { connection });
export const incrementalSyncQueue = new Queue<{ tenantId: string }>('incremental-sync', { connection });

// ── Worker: processa eventos de webhook ──────────────────────────────────────

export function startEventWorker() {
  const db = new DatabaseService();

  const worker = new Worker<ProviderEvent>(
    'provider-events',
    async (job: Job<ProviderEvent>) => {
      const event = job.data;
      const conn  = await db.getProviderConnection(event.tenantId);
      const creds = conn.credentials as { access_token: string };
      const provider = ProviderRegistry.build(event.providerId, { accessToken: creds.access_token });
      const sync = new SyncService(provider, db);
      await sync.processEvent(event);
    },
    { connection, concurrency: 2 },
  );

  worker.on('completed', (job) => {
    console.log(`[Worker] Evento ${job.data.eventType} processado (${job.data.externalResourceId})`);
  });
  worker.on('failed', (job, err) => {
    console.error(`[Worker] Falha no evento ${job?.data.eventType}:`, err.message);
  });

  return worker;
}

// ── Worker: sync incremental ──────────────────────────────────────────────────

export function startIncrementalSyncWorker() {
  const db = new DatabaseService();

  const worker = new Worker<{ tenantId: string }>(
    'incremental-sync',
    async (job: Job<{ tenantId: string }>) => {
      const { tenantId } = job.data;
      const conn   = await db.getProviderConnection(tenantId);
      const creds  = conn.credentials as { access_token: string };
      const provider = ProviderRegistry.build(conn.providerId, { accessToken: creds.access_token });
      const sync = new SyncService(provider, db);
      await sync.incrementalSync(tenantId);
    },
    { connection, concurrency: 1 },
  );

  worker.on('completed', (job) => {
    console.log(`[Worker] Sync incremental OK para tenant ${job.data.tenantId}`);
  });
  worker.on('failed', (job, err) => {
    console.error(`[Worker] Sync incremental falhou:`, err.message);
  });

  return worker;
}

// ── Cron: sync incremental a cada 15 min ─────────────────────────────────────

export async function scheduleCronSync(tenantIds: string[]) {
  for (const tenantId of tenantIds) {
    await incrementalSyncQueue.add(
      `cron-${tenantId}`,
      { tenantId },
      {
        repeat: { pattern: '*/15 * * * *' },  // a cada 15 minutos
        jobId:  `cron-sync-${tenantId}`,
      },
    );
  }
  console.log(`[Cron] Sync incremental agendado para ${tenantIds.length} tenant(s)`);
}
