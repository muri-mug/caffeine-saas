// ─────────────────────────────────────────────────────────────────────────────
// Sarta SaaS — Provider-Agnostic Types
// Nenhum módulo de negócio deve importar tipos específicos de provider.
// Toda integração externa implementa PosProvider e retorna esses modelos.
// ─────────────────────────────────────────────────────────────────────────────

// ── Modelos normalizados ──────────────────────────────────────────────────────

export interface NormalizedStore {
  externalId: string;
  name: string;
  timezone: string;
  currencyCode: string;
  address?: string;
}

export interface NormalizedCategory {
  externalId: string;
  name: string;
  color?: string;
}

export interface NormalizedVariant {
  externalId: string;
  itemExternalId: string;
  sku?: string;
  name: string;
  price: number;        // em centavos
  cost?: number;        // CMV em centavos
  barcode?: string;
}

export interface NormalizedItem {
  externalId: string;
  name: string;
  categoryExternalId?: string;
  trackStock: boolean;
  variants: NormalizedVariant[];
  deletedAt?: Date;
}

export interface NormalizedInventoryLevel {
  variantExternalId: string;
  storeExternalId: string;
  inStock: number;
  lowStockThreshold?: number;
}

export interface NormalizedEmployee {
  externalId: string;
  name: string;
  role: 'owner' | 'manager' | 'cashier' | 'staff';
  email?: string;
  deletedAt?: Date;
}

export interface NormalizedCustomer {
  externalId: string;
  name?: string;
  email?: string;
  phone?: string;
  firstVisit?: Date;
  lastVisit?: Date;
  totalVisits?: number;
  totalSpent?: number;  // em centavos
  deletedAt?: Date;
}

export interface NormalizedPaymentType {
  externalId: string;
  name: string;
  type: 'cash' | 'credit_card' | 'debit_card' | 'pix' | 'voucher' | 'other';
}

export interface NormalizedLineItem {
  externalItemId?: string;
  externalVariantId?: string;
  itemName: string;         // denormalizado — preservado mesmo se produto for deletado
  variantName?: string;
  quantity: number;
  unitPrice: number;        // em centavos
  totalPrice: number;       // em centavos
  unitCost?: number;        // CMV em centavos
  totalCost?: number;
  discount?: number;
  tax?: number;
}

export interface NormalizedPayment {
  externalPaymentTypeId?: string;
  paymentTypeName: string;
  paymentTypeCategory: NormalizedPaymentType['type'];
  amount: number;           // em centavos
  paidAt?: Date;
}

export interface NormalizedReceipt {
  externalId: string;       // ID único no sistema de origem
  type: 'sale' | 'refund';
  storeExternalId: string;
  employeeExternalId?: string;
  customerExternalId?: string;
  lineItems: NormalizedLineItem[];
  payments: NormalizedPayment[];
  subtotal: number;         // em centavos (antes de tax e discount)
  totalDiscount: number;    // em centavos
  totalTax: number;         // em centavos
  totalAmount: number;      // em centavos (valor final pago)
  note?: string;
  diningOption?: 'dine_in' | 'to_go' | 'delivery';
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NormalizedShift {
  externalId: string;
  storeExternalId: string;
  employeeExternalId?: string;
  openedAt: Date;
  closedAt?: Date;
  openingCashAmount: number;    // fundo de caixa em centavos
  cashReceived: number;         // total em dinheiro recebido
  cashPaidIn: number;           // entradas manuais
  cashPaidOut: number;          // saídas manuais
  cashRefunds: number;          // estornos em dinheiro
  expectedCashAmount: number;   // esperado no caixa
  actualCashAmount?: number;    // contado fisicamente
  cashDifference?: number;      // diferença (sobra/falta)
  receiptsCount: number;
  netTotal: number;             // total vendido no turno em centavos
}

export interface NormalizedSupplier {
  externalId: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  note?: string;
}

// ── Eventos normalizados ──────────────────────────────────────────────────────

export type ProviderEventType =
  | 'receipt.created'
  | 'receipt.updated'
  | 'item.updated'
  | 'inventory.updated'
  | 'customer.created'
  | 'customer.updated'
  | 'shift.opened'
  | 'shift.closed'
  | 'employee.updated'
  | 'store.updated';

export interface ProviderEvent {
  providerId: string;           // ex: 'loyverse', 'square'
  tenantId: string;
  eventType: ProviderEventType;
  externalResourceId: string;   // ID do recurso afetado no sistema de origem
  rawPayload: unknown;          // payload original para auditoria
  receivedAt: Date;
}

// ── Opções de filtro genéricas ────────────────────────────────────────────────

export interface SyncOptions {
  storeExternalId?: string;
  updatedAfter?: Date;
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
}

// ── Interface principal do conector ──────────────────────────────────────────

export interface PosProvider {
  readonly providerId: string;   // ex: 'loyverse', 'square', 'ifood'
  readonly displayName: string;  // ex: 'Loyverse', 'Square', 'iFood'

  // Autenticação / healthcheck
  validateCredentials(): Promise<boolean>;

  // Recursos estáticos (sync inicial e periódico)
  getStores(): Promise<NormalizedStore[]>;
  getCategories(): Promise<NormalizedCategory[]>;
  getItems(options?: SyncOptions): Promise<NormalizedItem[]>;
  getInventoryLevels(options?: SyncOptions): Promise<NormalizedInventoryLevel[]>;
  getEmployees(): Promise<NormalizedEmployee[]>;
  getCustomers(options?: SyncOptions): Promise<NormalizedCustomer[]>;
  getPaymentTypes(): Promise<NormalizedPaymentType[]>;
  getSuppliers?(): Promise<NormalizedSupplier[]>;   // opcional

  // Transações
  getReceipts(options?: SyncOptions): Promise<NormalizedReceipt[]>;
  getReceiptById(externalId: string): Promise<NormalizedReceipt | null>;
  getShifts(options?: SyncOptions): Promise<NormalizedShift[]>;

  // Webhooks (opcional — nem todo provider suporta)
  supportsWebhooks: boolean;
  registerWebhook?(url: string, events: ProviderEventType[]): Promise<void>;
  unregisterWebhook?(webhookId: string): Promise<void>;
  validateWebhookSignature?(payload: string, headers: Record<string, string>): boolean;
  parseWebhookEvent?(payload: unknown, headers: Record<string, string>): ProviderEvent;
}

// ── Config genérica de provider ───────────────────────────────────────────────

export interface ProviderConfig {
  accessToken: string;
  webhookSecret?: string;
  [key: string]: unknown;
}
