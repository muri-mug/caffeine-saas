import { describe, it, expect } from 'vitest';
import {
  mapStore,
  mapCategory,
  mapItem,
  mapReceipt,
  mapShift,
  type LoyverseStore,
  type LoyverseCategory,
  type LoyverseItem,
  type LoyverseReceipt,
  type LoyverseShift,
} from '../lib/providers/loyverse/loyverse.mappers.js';

// ── mapStore ──────────────────────────────────────────────────────────────────

describe('mapStore', () => {
  const raw: LoyverseStore = {
    id: 'store-1',
    name: 'Sarta Coffee',
    time_zone: 'America/Sao_Paulo',
    currency_code: 'BRL',
    address: 'Rua das Flores, 123',
  };

  it('maps all fields correctly', () => {
    const result = mapStore(raw);
    expect(result.externalId).toBe('store-1');
    expect(result.name).toBe('Sarta Coffee');
    expect(result.timezone).toBe('America/Sao_Paulo');
    expect(result.currencyCode).toBe('BRL');
    expect(result.address).toBe('Rua das Flores, 123');
  });

  it('defaults timezone to America/Sao_Paulo when missing', () => {
    const result = mapStore({ ...raw, time_zone: undefined as any });
    expect(result.timezone).toBe('America/Sao_Paulo');
  });

  it('defaults currencyCode to BRL when missing', () => {
    const result = mapStore({ ...raw, currency_code: undefined as any });
    expect(result.currencyCode).toBe('BRL');
  });
});

// ── mapCategory ───────────────────────────────────────────────────────────────

describe('mapCategory', () => {
  it('maps id, name and color', () => {
    const result = mapCategory({ id: 'cat-1', name: 'Bebidas', color: '#FF0000' });
    expect(result).toEqual({ externalId: 'cat-1', name: 'Bebidas', color: '#FF0000' });
  });

  it('allows undefined color', () => {
    const result = mapCategory({ id: 'cat-2', name: 'Doces' });
    expect(result.color).toBeUndefined();
  });
});

// ── mapItem (with toCents via variants) ───────────────────────────────────────

describe('mapItem', () => {
  const raw: LoyverseItem = {
    id: 'item-1',
    item_name: 'Cappuccino',
    category_id: 'cat-1',
    track_stock: true,
    variants: [
      { variant_id: 'v-1', item_id: 'item-1', price: 12.9, cost: 5.5 },
    ],
  };

  it('maps item fields', () => {
    const result = mapItem(raw);
    expect(result.externalId).toBe('item-1');
    expect(result.name).toBe('Cappuccino');
    expect(result.categoryExternalId).toBe('cat-1');
    expect(result.trackStock).toBe(true);
  });

  it('converts variant price from reais to centavos (toCents)', () => {
    const result = mapItem(raw);
    expect(result.variants[0]!.price).toBe(1290); // 12.90 → 1290
  });

  it('converts variant cost from reais to centavos', () => {
    const result = mapItem(raw);
    expect(result.variants[0]!.cost).toBe(550); // 5.50 → 550
  });

  it('handles floating point precision (R$0.10 → 10 centavos)', () => {
    const item = mapItem({ ...raw, variants: [{ variant_id: 'v-2', item_id: 'item-1', price: 0.1 }] });
    expect(item.variants[0]!.price).toBe(10);
  });

  it('handles deletedAt when present', () => {
    const deleted = mapItem({ ...raw, deleted_at: '2024-01-15T10:00:00Z' });
    expect(deleted.deletedAt).toBeInstanceOf(Date);
  });

  it('deletedAt is undefined when not set', () => {
    const result = mapItem(raw);
    expect(result.deletedAt).toBeUndefined();
  });
});

// ── mapReceipt ────────────────────────────────────────────────────────────────

describe('mapReceipt', () => {
  const raw: LoyverseReceipt = {
    receipt_number: 'RCP-001',
    receipt_type: 'SALE',
    store_id: 'store-1',
    employee_id: 'emp-1',
    total_money: 25.80,
    total_discount: 0,
    total_tax: 0,
    created_at: '2024-05-01T10:00:00Z',
    updated_at: '2024-05-01T10:00:00Z',
    line_items: [
      {
        item_name: 'Cappuccino',
        variant_name: 'Grande',
        quantity: 2,
        price: 12.90,
        total_money: 25.80,
        cost: 5.50,
        cost_total: 11.00,
      },
    ],
    payments: [
      { name: 'Cartão', type: 'CREDIT_CARD', money_amount: 25.80 },
    ],
  };

  it('maps receipt type to lowercase', () => {
    const result = mapReceipt(raw);
    expect(result.type).toBe('sale');
  });

  it('maps refund type correctly', () => {
    const result = mapReceipt({ ...raw, receipt_type: 'REFUND' });
    expect(result.type).toBe('refund');
  });

  it('converts totalAmount from reais to centavos', () => {
    const result = mapReceipt(raw);
    expect(result.totalAmount).toBe(2580); // 25.80 → 2580
  });

  it('maps externalId to receipt_number', () => {
    const result = mapReceipt(raw);
    expect(result.externalId).toBe('RCP-001');
  });

  it('maps line item totalCost to centavos', () => {
    const result = mapReceipt(raw);
    expect(result.lineItems[0]!.totalCost).toBe(1100); // 11.00 → 1100
  });

  it('maps payment amount to centavos', () => {
    const result = mapReceipt(raw);
    expect(result.payments[0]!.amount).toBe(2580);
  });
});

// ── mapShift ──────────────────────────────────────────────────────────────────

describe('mapShift', () => {
  const raw: LoyverseShift = {
    id: 'shift-1',
    store_id: 'store-1',
    employee_id: 'emp-1',
    opened_at: '2024-05-01T08:00:00Z',
    closed_at: '2024-05-01T17:00:00Z',
    cash_opening_amount: 100.00,
    cash_paid_in: 500.00,
    cash_paid_out: 50.00,
    cash_refunds: 0,
    expected_cash_amount: 550.00,
    actual_cash_amount: 550.00,
    cash_difference: 0,
    receipts_count: 20,
    net_total: 450.00,
  };

  it('converts all monetary fields from reais to centavos', () => {
    const result = mapShift(raw);
    expect(result.openingCashAmount).toBe(10000);   // 100.00 → 10000
    expect(result.cashReceived).toBe(45000);         // net_total 450.00 → 45000
    expect(result.expectedCashAmount).toBe(55000);   // 550.00 → 55000
    expect(result.actualCashAmount).toBe(55000);     // 550.00 → 55000
    expect(result.netTotal).toBe(45000);             // net_total 450.00 → 45000
  });

  it('maps cashDifference = 0 correctly', () => {
    const result = mapShift(raw);
    expect(result.cashDifference).toBe(0);
  });

  it('handles open shift (no closedAt)', () => {
    const result = mapShift({ ...raw, closed_at: undefined, actual_cash_amount: undefined });
    expect(result.closedAt).toBeUndefined();
    expect(result.actualCashAmount).toBeUndefined();
  });
});
