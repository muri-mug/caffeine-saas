// Script de desenvolvimento para testar o conector Loyverse
// Uso: pnpm --filter api sync:test
//
// Lê o token de LOYVERSE_ACCESS_TOKEN no .env e faz chamadas reais à API.
// Não persiste nada no banco — só imprime os dados normalizados.

import { config } from 'node:process';

// Carregar .env manualmente (sem dotenv, usando --env-file do Node 20)
const token = process.env['LOYVERSE_ACCESS_TOKEN'];

if (!token) {
  console.error('❌  LOYVERSE_ACCESS_TOKEN não definido. Adicione ao .env');
  process.exit(1);
}

import { LoyverseProvider } from '../lib/providers/loyverse/loyverse.provider.js';

const provider = new LoyverseProvider({ accessToken: token });

console.log('🔑  Validando credenciais...');
const valid = await provider.validateCredentials();
if (!valid) {
  console.error('❌  Token inválido');
  process.exit(1);
}
console.log('✅  Credenciais OK\n');

console.log('🏪  Lojas:');
const stores = await provider.getStores();
console.log(JSON.stringify(stores, null, 2));

console.log('\n📦  Categorias:');
const categories = await provider.getCategories();
console.log(JSON.stringify(categories, null, 2));

console.log('\n💳  Formas de pagamento:');
const paymentTypes = await provider.getPaymentTypes();
console.log(JSON.stringify(paymentTypes, null, 2));

console.log('\n👥  Funcionários:');
const employees = await provider.getEmployees();
console.log(JSON.stringify(employees, null, 2));

console.log('\n🧾  Últimos 10 recibos:');
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const receipts = await provider.getReceipts({ createdAfter: yesterday, limit: 10 });
console.log(JSON.stringify(receipts.slice(0, 3), null, 2));
console.log(`... total: ${receipts.length} recibos`);

console.log('\n✅  Teste concluído!');
