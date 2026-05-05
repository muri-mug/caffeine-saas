import Fastify from 'fastify';
import cors from '@fastify/cors';

const app = Fastify({ logger: { level: 'info' } });

await app.register(cors, {
  origin: process.env['APP_URL'] ?? 'http://localhost:3000',
  credentials: true,
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

// ── Webhook receiver (agnóstico) ─────────────────────────────────────────────
app.post<{ Params: { providerId: string } }>('/api/webhooks/:providerId', async (req, reply) => {
  const { providerId } = req.params;
  // TODO Sprint 2: validar assinatura, parsear evento, enfileirar no BullMQ
  app.log.info({ providerId }, 'Webhook recebido');
  return reply.status(200).send('OK');
});

// ── Start ─────────────────────────────────────────────────────────────────────
const port = parseInt(process.env['PORT'] ?? '3001', 10);

try {
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`API rodando em http://localhost:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
