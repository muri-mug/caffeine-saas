// Roda o sync inicial completo para o tenant Sarta Coffee
// Uso: pnpm --filter api sync:initial

import { ProviderRegistry } from '../lib/providers/registry.js';
import { DatabaseService } from '../lib/db/database.service.js';
import { SyncService } from '../modules/sync/sync.service.js';

const TENANT_ID = process.env['SARTA_TENANT_ID'];
const TOKEN     = process.env['LOYVERSE_ACCESS_TOKEN'];

if (!TENANT_ID || !TOKEN) {
  console.error('❌  Defina SARTA_TENANT_ID e LOYVERSE_ACCESS_TOKEN no .env');
  process.exit(1);
}

const db       = new DatabaseService();
const provider = ProviderRegistry.build('loyverse', { accessToken: TOKEN });
const sync     = new SyncService(provider, db);

console.log('🚀  Iniciando sync inicial...\n');

await sync.initialSync(TENANT_ID);

// Resumo do banco após sync
const counts = await Promise.all([
  db.prisma.store.count({ where: { tenantId: TENANT_ID } }),
  db.prisma.category.count({ where: { tenantId: TENANT_ID } }),
  db.prisma.item.count({ where: { tenantId: TENANT_ID } }),
  db.prisma.variant.count({ where: { tenantId: TENANT_ID } }),
  db.prisma.employee.count({ where: { tenantId: TENANT_ID } }),
  db.prisma.paymentType.count({ where: { tenantId: TENANT_ID } }),
  db.prisma.receipt.count({ where: { tenantId: TENANT_ID } }),
  db.prisma.shift.count({ where: { tenantId: TENANT_ID } }),
]);

console.log('\n📊  Banco após sync:');
console.log(`  Lojas:           ${counts[0]}`);
console.log(`  Categorias:      ${counts[1]}`);
console.log(`  Produtos:        ${counts[2]}`);
console.log(`  Variantes:       ${counts[3]}`);
console.log(`  Funcionários:    ${counts[4]}`);
console.log(`  Formas de pag.:  ${counts[5]}`);
console.log(`  Recibos:         ${counts[6]}`);
console.log(`  Turnos:          ${counts[7]}`);

await db.prisma.$disconnect();
