// Seed de desenvolvimento: cria o tenant Sarta + provider connection Loyverse
// Uso: DATABASE_URL=... pnpm exec tsx prisma/seed.ts

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const LOYVERSE_TOKEN = process.env['LOYVERSE_ACCESS_TOKEN'];
if (!LOYVERSE_TOKEN) {
  console.error('❌  LOYVERSE_ACCESS_TOKEN não definido');
  process.exit(1);
}

async function main() {
  // Upsert tenant
  const tenant = await db.tenant.upsert({
    where: { slug: 'sarta-coffee' },
    update: {},
    create: {
      name:  'Sarta Coffee',
      slug:  'sarta-coffee',
    },
  });
  console.log(`✅  Tenant: ${tenant.name} (${tenant.id})`);

  // Upsert provider connection
  const conn = await db.providerConnection.upsert({
    where: {
      tenantId_providerId: {
        tenantId:   tenant.id,
        providerId: 'loyverse',
      },
    },
    update: {
      credentials: { access_token: LOYVERSE_TOKEN },
      status:      'active',
    },
    create: {
      tenantId:    tenant.id,
      providerId:  'loyverse',
      displayName: 'Loyverse — Sarta Coffee',
      credentials: { access_token: LOYVERSE_TOKEN },
      status:      'active',
    },
  });
  console.log(`✅  Provider connection: ${conn.providerId} (${conn.id})`);
  console.log(`\n📋  Tenant ID para usar nas chamadas de API: ${tenant.id}`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
