// Mapeamento Loyverse API → Modelos Normalizados
// Todo conhecimento de campos específicos do Loyverse fica aqui.
// Fora deste arquivo, ninguém sabe que Loyverse existe.

import type {
  NormalizedStore,
  NormalizedCategory,
  NormalizedItem,
  NormalizedVariant,
  NormalizedInventoryLevel,
  NormalizedEmployee,
  NormalizedCustomer,
  NormalizedPaymentType,
  NormalizedReceipt,
  NormalizedLineItem,
  NormalizedPayment,
  NormalizedShift,
  NormalizedSupplier,
} from '@sarta/shared';

// ── Tipos raw da API Loyverse ─────────────────────────────────────────────────

export interface LoyverseStore {
  id: string;
  name: string;
  time_zone: string;
  currency_code: string;
  address?: string;
}

export interface LoyverseCategory {
  id: string;
  name: string;
  color?: string;
}

export interface LoyverseVariant {
  variant_id: string;
  item_id: string;
  sku?: string;
  option1_value?: string;
  barcode?: string;
  price: number;    // em reais
  cost?: number;    // em reais
}

export interface LoyverseItem {
  id: string;
  item_name: string;
  category_id?: string;
  track_stock: boolean;
  variants: LoyverseVariant[];
  deleted_at?: string;
}

export interface LoyverseInventoryLevel {
  variant_id: string;
  store_id: string;
  in_stock: number;
  low_stock?: number;
}

export interface LoyverseEmployee {
  id: string;
  name: string;
  role: 'OWNER' | 'MANAGER' | 'CASHIER';
  email?: string;
  deleted_at?: string;
}

export interface LoyverseCustomer {
  id: string;
  name?: string;
  email?: string;
  phone_number?: string;
  first_visit?: string;
  last_visit?: string;
  total_visits?: number;
  total_spent?: number;
  deleted_at?: string;
}

export interface LoyversePaymentType {
  id: string;
  name: string;
  type: 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'PAYMENT_APP' | string;
}

export interface LoyverseLineItem {
  item_id?: string;
  variant_id?: string;
  item_name: string;
  variant_name?: string;
  quantity: number;
  price: number;
  total_money: number;
  cost?: number;
  cost_total?: number;
  gross_total_money?: number;
  line_note?: string;
}

export interface LoyversePayment {
  payment_type_id?: string;
  name: string;
  type: string;
  money_amount: number;
  paid_at?: string;
}

export interface LoyverseReceipt {
  receipt_number: string;
  receipt_type: 'SALE' | 'REFUND';
  store_id: string;
  employee_id?: string;
  customer_id?: string;
  shift_id?: string;
  total_money: number;
  total_discount?: number;
  total_tax?: number;
  note?: string;
  dining_option?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
  line_items: LoyverseLineItem[];
  payments: LoyversePayment[];
}

export interface LoyverseShift {
  id: string;
  store_id: string;
  employee_id?: string;
  opened_at: string;
  closed_at?: string;
  cash_opening_amount: number;
  cash_paid_in: number;
  cash_paid_out: number;
  cash_refunds: number;
  expected_cash_amount: number;
  actual_cash_amount?: number;
  cash_difference?: number;
  receipts_count: number;
  net_total: number;
  gross_total?: number;
}

export interface LoyverseSupplier {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  note?: string;
}

// ── Conversão de moeda ────────────────────────────────────────────────────────
// A API do Loyverse retorna valores em reais (float). Nosso modelo usa centavos (integer).

function toCents(reais: number | undefined | null): number {
  if (reais == null) return 0;
  return Math.round(reais * 100);
}

// ── Funções de mapeamento ─────────────────────────────────────────────────────

export function mapStore(raw: LoyverseStore): NormalizedStore {
  return {
    externalId: raw.id,
    name: raw.name,
    timezone: raw.time_zone ?? 'America/Sao_Paulo',
    currencyCode: raw.currency_code ?? 'BRL',
    address: raw.address,
  };
}

export function mapCategory(raw: LoyverseCategory): NormalizedCategory {
  return {
    externalId: raw.id,
    name: raw.name,
    color: raw.color,
  };
}

export function mapItem(raw: LoyverseItem): NormalizedItem {
  return {
    externalId: raw.id,
    name: raw.item_name,
    categoryExternalId: raw.category_id,
    trackStock: raw.track_stock ?? false,
    variants: raw.variants.map(mapVariant),
    deletedAt: raw.deleted_at ? new Date(raw.deleted_at) : undefined,
  };
}

function mapVariant(raw: LoyverseVariant): NormalizedVariant {
  return {
    externalId: raw.variant_id,
    itemExternalId: raw.item_id,
    sku: raw.sku,
    name: raw.option1_value ?? 'Padrão',
    price: toCents(raw.price),
    cost: raw.cost != null ? toCents(raw.cost) : undefined,
    barcode: raw.barcode,
  };
}

export function mapInventoryLevel(raw: LoyverseInventoryLevel): NormalizedInventoryLevel {
  return {
    variantExternalId: raw.variant_id,
    storeExternalId: raw.store_id,
    inStock: raw.in_stock ?? 0,
    lowStockThreshold: raw.low_stock,
  };
}

export function mapEmployee(raw: LoyverseEmployee): NormalizedEmployee {
  return {
    externalId: raw.id,
    name: raw.name,
    role: mapEmployeeRole(raw.role),
    email: raw.email,
    deletedAt: raw.deleted_at ? new Date(raw.deleted_at) : undefined,
  };
}

function mapEmployeeRole(role: string): NormalizedEmployee['role'] {
  switch (role) {
    case 'OWNER':   return 'owner';
    case 'MANAGER': return 'manager';
    case 'CASHIER': return 'cashier';
    default:        return 'staff';
  }
}

export function mapCustomer(raw: LoyverseCustomer): NormalizedCustomer {
  return {
    externalId: raw.id,
    name: raw.name,
    email: raw.email,
    phone: raw.phone_number,
    firstVisit: raw.first_visit ? new Date(raw.first_visit) : undefined,
    lastVisit: raw.last_visit ? new Date(raw.last_visit) : undefined,
    totalVisits: raw.total_visits,
    totalSpent: raw.total_spent,
    deletedAt: raw.deleted_at ? new Date(raw.deleted_at) : undefined,
  };
}

export function mapPaymentType(raw: LoyversePaymentType): NormalizedPaymentType {
  return {
    externalId: raw.id,
    name: raw.name,
    type: mapPaymentTypeCategory(raw.type),
  };
}

export function mapPaymentTypeCategory(type: string): NormalizedPaymentType['type'] {
  switch (type) {
    case 'CASH':         return 'cash';
    case 'CREDIT_CARD':  return 'credit_card';
    case 'DEBIT_CARD':   return 'debit_card';
    case 'PAYMENT_APP':  return 'pix';   // Loyverse usa PAYMENT_APP para Pix/apps
    default:             return 'other';
  }
}

export function mapReceipt(raw: LoyverseReceipt): NormalizedReceipt {
  const totalAmount   = toCents(raw.total_money);
  const totalDiscount = toCents(raw.total_discount);
  const totalTax      = toCents(raw.total_tax);
  return {
    externalId: raw.receipt_number,
    type: raw.receipt_type === 'SALE' ? 'sale' : 'refund',
    storeExternalId: raw.store_id,
    employeeExternalId: raw.employee_id,
    customerExternalId: raw.customer_id,
    totalAmount,
    totalDiscount,
    totalTax,
    subtotal: totalAmount + totalDiscount,
    note: raw.note,
    diningOption: mapDiningOption(raw.dining_option),
    cancelledAt: raw.cancelled_at ? new Date(raw.cancelled_at) : undefined,
    createdAt: new Date(raw.created_at),
    updatedAt: new Date(raw.updated_at),
    lineItems: raw.line_items?.map(mapLineItem) ?? [],
    payments: raw.payments?.map(mapPayment) ?? [],
  };
}

function mapLineItem(raw: LoyverseLineItem): NormalizedLineItem {
  return {
    externalItemId: raw.item_id,
    externalVariantId: raw.variant_id,
    itemName: raw.item_name,
    variantName: raw.variant_name,
    quantity: raw.quantity,
    unitPrice: toCents(raw.price),
    totalPrice: toCents(raw.total_money),
    unitCost: raw.cost != null ? toCents(raw.cost) : undefined,
    totalCost: raw.cost_total != null ? toCents(raw.cost_total) : undefined,
  };
}

function mapPayment(raw: LoyversePayment): NormalizedPayment {
  return {
    externalPaymentTypeId: raw.payment_type_id,
    paymentTypeName: raw.name,
    paymentTypeCategory: mapPaymentTypeCategory(raw.type),
    amount: toCents(raw.money_amount),
    paidAt: raw.paid_at ? new Date(raw.paid_at) : undefined,
  };
}

function mapDiningOption(option?: string): NormalizedReceipt['diningOption'] {
  switch (option) {
    case 'DINING_OPTION_DINE_IN': return 'dine_in';
    case 'DINING_OPTION_TO_GO':   return 'to_go';
    case 'DINING_OPTION_DELIVERY': return 'delivery';
    default: return undefined;
  }
}

export function mapShift(raw: LoyverseShift): NormalizedShift {
  return {
    externalId: raw.id,
    storeExternalId: raw.store_id,
    employeeExternalId: raw.employee_id,
    openedAt: new Date(raw.opened_at),
    closedAt: raw.closed_at ? new Date(raw.closed_at) : undefined,
    openingCashAmount: toCents(raw.cash_opening_amount),
    cashReceived: toCents(raw.net_total),
    cashPaidIn: toCents(raw.cash_paid_in),
    cashPaidOut: toCents(raw.cash_paid_out),
    cashRefunds: toCents(raw.cash_refunds),
    expectedCashAmount: toCents(raw.expected_cash_amount),
    actualCashAmount: raw.actual_cash_amount != null ? toCents(raw.actual_cash_amount) : undefined,
    cashDifference: raw.cash_difference != null ? toCents(raw.cash_difference) : undefined,
    receiptsCount: raw.receipts_count ?? 0,
    netTotal: toCents(raw.net_total),
  };
}

export function mapSupplier(raw: LoyverseSupplier): NormalizedSupplier {
  return {
    externalId: raw.id,
    name: raw.name,
    contactPerson: raw.contact_person,
    email: raw.email,
    phone: raw.phone,
    note: raw.note,
  };
}
