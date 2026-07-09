# Sarta SaaS

Plataforma multi-tenant de gestão para negócios de varejo. Integra com sistemas POS (ponto de venda) via arquitetura provider-agnostic, normaliza os dados e entrega dashboards financeiros em tempo real.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 14 (App Router), React 18, TailwindCSS, shadcn/ui, Tremor, Lucide |
| Backend | Fastify 4, TypeScript, Prisma ORM |
| Banco de dados | PostgreSQL |
| Fila / Background jobs | BullMQ + Redis |
| Autenticação | JWT (jose, HS256, 7 dias) |
| Monorepo | pnpm workspaces + Turborepo |
| Testes unitários | Vitest |
| Testes E2E | Playwright |

---

## Estrutura do repositório

```
saas/
├── apps/
│   ├── api/          # Backend Fastify
│   └── web/          # Frontend Next.js
├── packages/
│   └── shared/       # Tipos TypeScript compartilhados
├── e2e/              # Testes Playwright
├── turbo.json
└── package.json      # Raiz do monorepo
```

### `apps/api`

```
src/
├── server.ts                  # Entry point: registro de rotas e plugins
├── lib/
│   ├── auth/                  # JWT sign/verify, hash de senha
│   ├── prisma/                # Cliente Prisma singleton
│   ├── queue/                 # BullMQ workers e cron
│   └── providers/
│       └── loyverse/          # Implementação Loyverse (V1)
│           ├── client.ts      # HTTP client paginado
│           ├── mappers.ts     # Raw → NormalizedX
│           └── index.ts       # LoyverseProvider implements PosProvider
├── modules/
│   └── sync/                  # Orquestração do sync (initial + incremental)
└── routes/
    ├── auth.ts
    ├── tenants.ts
    ├── providers.ts
    ├── dashboard.ts
    ├── inventory.ts
    ├── cashflow.ts
    ├── dre.ts
    ├── receipts.ts
    └── webhooks.ts
```

### `apps/web`

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── dashboard/page.tsx     # Visão geral e KPIs
│   ├── vendas/page.tsx        # Tabela de recibos com linhas expansíveis
│   ├── estoque/page.tsx       # Inventário e níveis de estoque
│   ├── dre/page.tsx           # Demonstrativo de resultado com seletor de mês
│   └── caixa/page.tsx         # Fluxo de caixa e turnos
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx        # Navegação lateral
│   │   └── topbar.tsx         # Barra superior com botão Sincronizar funcional
│   ├── charts/                # Componentes de gráfico (Tremor)
│   ├── financial/
│   │   └── period-selector.tsx  # Seletor de período: Hoje/Ontem/7d/30d/Mês/Período
│   └── shared/                # Componentes reutilizáveis
├── hooks/
│   └── use-dashboard.ts       # Hooks de fetch; Period = today|yesterday|week|days30|month|custom
├── lib/
│   ├── api.ts                 # Fetch wrapper com Bearer token + triggerSync()
│   ├── i18n.ts                # Traduções pt-BR / en (period.days30 incluído)
│   ├── icons.ts               # Re-exports centralizados de lucide-react
│   └── format.ts              # formatCurrency, formatNumber, formatPercent
└── __tests__/                 # Testes unitários Vitest
```

### `packages/shared`

Tipos normalizados e a interface `PosProvider`. Toda lógica de negócio usa esses tipos — sem dependência de estruturas específicas de provedores.

```typescript
interface PosProvider {
  providerId: string;
  displayName: string;
  supportsWebhooks: boolean;
  validateCredentials(): Promise<boolean>;
  getStores(): Promise<NormalizedStore[]>;
  getReceipts(options?: SyncOptions): Promise<NormalizedReceipt[]>;
  getShifts(options?: SyncOptions): Promise<NormalizedShift[]>;
  // ... getCategories, getItems, getInventoryLevels, getEmployees, ...
  validateWebhookSignature?(payload: string, headers: Record<string, string>): boolean;
  parseWebhookEvent?(payload: unknown, headers: Record<string, string>): ProviderEvent;
}
```

---

## Arquitetura

```
┌──────────────────────────────────────────────────────┐
│                    Next.js (web)                      │
│  dashboard  vendas  estoque  caixa  dre               │
└───────────────────────┬──────────────────────────────┘
                        │ HTTP + Bearer JWT
┌───────────────────────▼──────────────────────────────┐
│                  Fastify API                          │
│  /auth  /api/dashboard  /api/receipts  /api/dre ...   │
│  requireAuth middleware (addHook preHandler)          │
└──────┬─────────────────────────┬────────────────────-┘
       │ Prisma ORM              │ BullMQ
┌──────▼────────┐    ┌───────────▼──────────────────┐
│  PostgreSQL   │    │  Redis                        │
│  (schema abaixo)   │  provider-events queue        │
└───────────────┘    │  incremental-sync queue       │
                     │  cron: 15 min incremental sync│
                     └──────────────────────────────┘
                                 │
              ┌──────────────────▼──────────────────┐
              │         PosProvider (interface)       │
              │  ┌───────────────────────────────┐   │
              │  │  LoyverseProvider (V1)         │   │
              │  │  SquareProvider (planejado)    │   │
              │  │  IFoodProvider (planejado)     │   │
              │  └───────────────────────────────┘   │
              └─────────────────────────────────────-┘
```

---

## Banco de dados (Prisma / PostgreSQL)

Todos os valores monetários são armazenados em **centavos** (inteiros). Todos os modelos têm `tenantId` para isolamento multi-tenant.

```
Tenant               — slug, passwordHash
ProviderConnection   — tenantId, provider (loyverse|square|ifood), credentials

Store                — nome, timezone, currency
Category             — nome, cor
Item                 — nome, categoryId, custo, deletedAt
Variant              — SKU, preço, custo, itemId
InventoryLevel       — variantId, storeId, quantidade

Employee             — nome, role (owner|manager|cashier|staff)
Customer             — nome, visitas, totalGasto
PaymentType          — nome (cash|credit|debit|pix…)

Shift                — storeId, employeeId, openedAt, closedAt, saldo
Receipt              — tipo (sale|refund), total, storeId, employeeId, customerId
ReceiptLineItem      — receiptId, itemId, qty, preço, custo (desnormalizado)
ReceiptPayment       — receiptId, paymentTypeId, valor

Expense              — tenantId, descrição, valor, categoria, data
SyncEvent            — log de webhooks recebidos
```

Constraint de unicidade composta em todos os registros sincronizados: `(tenantId, providerId, externalId)`.

---

## Módulos

### Dashboard (`/dashboard`)
KPIs financeiros com seletor de período: **Hoje / Ontem / 7 dias / 30 dias / Mês / Período personalizado**.
- Receita bruta, Nº de vendas, Ticket médio, Margem bruta
- Gráfico de receita por hora (Tremor AreaChart)
- Formas de pagamento (DonutChart)
- Top 8 produtos por receita
- Resumo financeiro: descontos, receita líquida, CMV, lucro bruto, devoluções

### Vendas (`/vendas`)
Tabela paginada (50/página) de recibos com:
- Badge Venda / Estorno
- Expandir linha para ver itens e forma de pagamento
- Seletor de período: Hoje / Ontem / 7 dias / 30 dias / Mês / Período personalizado
- Valores monetários em `totalAmount` (centavos, convertidos na exibição)

### Estoque (`/estoque`)
Lista de produtos com nível de estoque por loja. Alertas de estoque baixo.

### DRE (`/dre`)
Demonstrativo de Resultado do Exercício com seletor de mês:
- **Este mês** / **Mês anterior** — atalhos rápidos
- **Escolher mês** — `<input type="month">` para selecionar qualquer mês/ano
- Receita bruta → Devoluções → Descontos → Impostos → Receita líquida → CMV → Lucro bruto → EBITDA
- Lançamento manual de despesas operacionais por categoria (aluguel, salário, utilidades, outros)

### Caixa (`/caixa`)
Análise de fluxo de caixa por turno e período. Saldo de abertura/fechamento.

---

## Sistema de provedores

A integração com POS segue o padrão **Strategy**:

1. `PosProvider` (interface em `packages/shared`) define o contrato.
2. Cada provedor implementa a interface com seu cliente HTTP e mappers.
3. O `ProviderRegistry` resolve o provedor correto pelo `providerId`.
4. O `SyncService` opera exclusivamente com tipos normalizados.

**Loyverse (V1 — implementado)**:
- Autenticação via API token
- Paginação automática
- Webhooks com validação HMAC-SHA256
- Mappers testados com Vitest (20+ casos)

**Square / iFood** — planejados para V2.

---

## Autenticação

Fluxo stateless com JWT:

```
POST /auth/login { slug, password }
→ 200 { token: "eyJ..." }

Todas as rotas protegidas:
GET  /api/dashboard/overview?period=today|yesterday|week|days30|month|custom&from=&to=
GET  /api/dashboard/hourly
GET  /api/dashboard/payments
GET  /api/dashboard/top-products
GET  /api/dre?period=month|lastmonth|custom&from=&to=
GET  /api/receipts?period=...&page=&pageSize=
POST /providers/sync              # dispara sync incremental em background
Authorization: Bearer eyJ...
```

- Algoritmo HS256, expiração 7 dias
- Middleware via `addHook('preHandler', requireAuth)` em plugin Fastify scoped
- Frontend armazena token em `localStorage` (`sarta_token`)
- `lib/api.ts` injeta header automaticamente em todas as requisições

---

## Sincronização

### Sync inicial (ao conectar provedor)
Pull completo: stores, categories, items, inventory, employees, payment types, últimos 90 dias de receipts e shifts.

### Sync incremental
- Agendado a cada 15 minutos via cron (BullMQ)
- Filtra por `updated_at > lastSyncAt`
- Disponível manualmente via `POST /providers/sync` (autenticado)
- Botão **Sincronizar** na topbar dispara o sync incremental e exibe ícone giratório durante execução

### Webhooks
- `POST /api/webhooks/:providerId`
- Valida assinatura HMAC
- Enfileira evento no BullMQ
- Worker processa: `receipt.created`, `item.updated`, `inventory.updated`, `shift.closed`, etc.

---

## Testes

### Unitários (Vitest)

```bash
pnpm --filter api test       # testes da API
pnpm --filter web test       # testes do frontend
```

Cobertos:
- `auth.service.test.ts` — hash, verify, signToken, verifyToken (8 casos)
- `loyverse.mappers.test.ts` — todos os mappers normalizados (20+ casos)
- `format.test.ts` — formatCurrency, formatNumber, formatPercent, formatDelta (12 casos)
- `utils.test.ts` — cn() merges de classe Tailwind (5 casos)

> Sem `globals: true` no vitest.config.ts — conflita com o `expect` do Playwright.

### E2E (Playwright)

```bash
pnpm test:e2e                # roda da raiz do monorepo
```

Specs:
- `dashboard.spec.ts` — KPIs, gráficos
- `vendas.spec.ts` — tabela, badges, expand, paginação
- `estoque.spec.ts` — lista de produtos, baixo estoque
- `dre.spec.ts` — visualização, adicionar/remover despesa
- `caixa.spec.ts` — fluxo de caixa

Auth nos testes: `setupAuth` injeta o JWT no `localStorage` via `addInitScript` antes de qualquer navegação — sem depender de página de login.

---

## Rodando localmente

### Pré-requisitos
- Node >= 20, pnpm >= 9
- PostgreSQL rodando
- Redis rodando

### Setup

```bash
# Instalar dependências
pnpm install

# Variáveis de ambiente
cp .env.example .env          # editar DATABASE_URL, REDIS_URL, JWT_SECRET
cp .env apps/api/.env         # Prisma precisa do .env na raiz do pacote

# Banco de dados
pnpm db:migrate

# Desenvolvimento
pnpm dev                      # sobe API (porta 3001) + Web (porta 3000)
```

### Scripts disponíveis

```bash
pnpm dev              # API + Web em modo watch
pnpm build            # Build de produção (turbo)
pnpm lint             # ESLint em todos os pacotes
pnpm typecheck        # tsc em todos os pacotes
pnpm test             # Vitest em todos os pacotes
pnpm test:e2e         # Playwright (requer dev rodando)
pnpm db:generate      # prisma generate
pnpm db:migrate       # prisma migrate dev
pnpm db:studio        # Prisma Studio
```

---

## Variáveis de ambiente

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | Connection string PostgreSQL | `postgresql://user:pass@localhost:5432/sarta` |
| `REDIS_URL` | Connection string Redis | `redis://localhost:6379` |
| `JWT_SECRET` | Segredo para assinar tokens | string aleatória longa |
| `CORS_ORIGIN` | Origem permitida pelo CORS | `http://localhost:3000` |
| `PORT` | Porta da API | `3001` |
