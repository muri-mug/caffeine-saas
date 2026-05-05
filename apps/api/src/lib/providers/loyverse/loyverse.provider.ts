// Conector Loyverse — implementa PosProvider
// Todo o conhecimento específico de Loyverse está neste arquivo e nos seus irmãos.
// O resto do sistema não importa nada daqui.

import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  PosProvider,
  ProviderConfig,
  ProviderEvent,
  ProviderEventType,
  NormalizedStore,
  NormalizedCategory,
  NormalizedItem,
  NormalizedInventoryLevel,
  NormalizedEmployee,
  NormalizedCustomer,
  NormalizedPaymentType,
  NormalizedReceipt,
  NormalizedShift,
  NormalizedSupplier,
  SyncOptions,
} from '@sarta/shared';

import { LoyverseClient } from './loyverse.client.js';
import {
  mapStore,
  mapCategory,
  mapItem,
  mapInventoryLevel,
  mapEmployee,
  mapCustomer,
  mapPaymentType,
  mapReceipt,
  mapShift,
  mapSupplier,
  type LoyverseStore,
  type LoyverseCategory,
  type LoyverseItem,
  type LoyverseInventoryLevel,
  type LoyverseEmployee,
  type LoyverseCustomer,
  type LoyversePaymentType,
  type LoyverseReceipt,
  type LoyverseShift,
  type LoyverseSupplier,
} from './loyverse.mappers.js';

export class LoyverseProvider implements PosProvider {
  readonly providerId = 'loyverse';
  readonly displayName = 'Loyverse';
  readonly supportsWebhooks = true;

  private readonly client: LoyverseClient;
  private readonly webhookSecret?: string;

  constructor(config: ProviderConfig) {
    this.client = new LoyverseClient(config.accessToken);
    this.webhookSecret = config.webhookSecret as string | undefined;
  }

  async validateCredentials(): Promise<boolean> {
    try {
      await this.client.get('/stores');
      return true;
    } catch {
      return false;
    }
  }

  async getStores(): Promise<NormalizedStore[]> {
    const res = await this.client.get<{ stores: LoyverseStore[] }>('/stores');
    return (res.stores ?? []).map(mapStore);
  }

  async getCategories(): Promise<NormalizedCategory[]> {
    const res = await this.client.get<{ categories: LoyverseCategory[] }>('/categories');
    return (res.categories ?? []).map(mapCategory);
  }

  async getItems(options?: SyncOptions): Promise<NormalizedItem[]> {
    const params = this.buildParams(options);
    const items: NormalizedItem[] = [];
    for await (const raw of this.client.paginate<LoyverseItem>('/items', 'items', params)) {
      items.push(mapItem(raw));
    }
    return items;
  }

  async getInventoryLevels(options?: SyncOptions): Promise<NormalizedInventoryLevel[]> {
    const params = this.buildParams(options);
    const levels: NormalizedInventoryLevel[] = [];
    for await (const raw of this.client.paginate<LoyverseInventoryLevel>(
      '/inventory',
      'inventory_levels',
      params,
    )) {
      levels.push(mapInventoryLevel(raw));
    }
    return levels;
  }

  async getEmployees(): Promise<NormalizedEmployee[]> {
    const res = await this.client.get<{ employees: LoyverseEmployee[] }>('/employees');
    return (res.employees ?? []).map(mapEmployee);
  }

  async getCustomers(options?: SyncOptions): Promise<NormalizedCustomer[]> {
    const params = this.buildParams(options);
    const customers: NormalizedCustomer[] = [];
    for await (const raw of this.client.paginate<LoyverseCustomer>(
      '/customers',
      'customers',
      params,
    )) {
      customers.push(mapCustomer(raw));
    }
    return customers;
  }

  async getPaymentTypes(): Promise<NormalizedPaymentType[]> {
    const res = await this.client.get<{ payment_types: LoyversePaymentType[] }>('/payment_types');
    return (res.payment_types ?? []).map(mapPaymentType);
  }

  async getSuppliers(): Promise<NormalizedSupplier[]> {
    const res = await this.client.get<{ suppliers: LoyverseSupplier[] }>('/suppliers');
    return (res.suppliers ?? []).map(mapSupplier);
  }

  async getReceipts(options?: SyncOptions): Promise<NormalizedReceipt[]> {
    const params = this.buildParams(options);
    const receipts: NormalizedReceipt[] = [];
    for await (const raw of this.client.paginate<LoyverseReceipt>(
      '/receipts',
      'receipts',
      params,
    )) {
      receipts.push(mapReceipt(raw));
    }
    return receipts;
  }

  async getReceiptById(externalId: string): Promise<NormalizedReceipt | null> {
    try {
      const raw = await this.client.get<LoyverseReceipt>(`/receipts/${externalId}`);
      return mapReceipt(raw);
    } catch {
      return null;
    }
  }

  async getShifts(options?: SyncOptions): Promise<NormalizedShift[]> {
    const params = this.buildParams(options);
    const shifts: NormalizedShift[] = [];
    for await (const raw of this.client.paginate<LoyverseShift>('/shifts', 'shifts', params)) {
      shifts.push(mapShift(raw));
    }
    return shifts;
  }

  // ── Webhooks ────────────────────────────────────────────────────────────────

  async registerWebhook(url: string, events: ProviderEventType[]): Promise<void> {
    await this.client.get('/webhooks');
    // Loyverse usa POST para registrar — implementar quando necessário
    console.log(`[Loyverse] Registrar webhook: ${url} para eventos ${events.join(', ')}`);
  }

  async unregisterWebhook(webhookId: string): Promise<void> {
    console.log(`[Loyverse] Remover webhook: ${webhookId}`);
  }

  validateWebhookSignature(payload: string, headers: Record<string, string>): boolean {
    if (!this.webhookSecret) return true; // sem secret configurado, aceita tudo em dev
    const signature = headers['x-loyverse-webhook-signature'];
    if (!signature) return false;
    const expected = createHmac('sha256', this.webhookSecret).update(payload).digest('hex');
    try {
      return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
    } catch {
      return false;
    }
  }

  parseWebhookEvent(payload: unknown, headers: Record<string, string>): ProviderEvent {
    const body = payload as Record<string, unknown>;
    return {
      providerId: this.providerId,
      tenantId: '',  // preenchido pelo SyncService
      eventType: this.mapEventType(body['type'] as string),
      externalResourceId:
        (body['receipt_number'] as string) ??
        (body['item_id'] as string) ??
        (body['customer_id'] as string) ??
        (body['shift_id'] as string) ??
        '',
      rawPayload: payload,
      receivedAt: new Date(),
    };
  }

  // ── Helpers privados ────────────────────────────────────────────────────────

  private buildParams(options?: SyncOptions): Record<string, string> {
    const params: Record<string, string> = {};
    if (options?.updatedAfter) params['updated_at_min'] = options.updatedAfter.toISOString();
    if (options?.createdAfter) params['created_at_min'] = options.createdAfter.toISOString();
    if (options?.createdBefore) params['created_at_max'] = options.createdBefore.toISOString();
    if (options?.storeExternalId) params['store_id'] = options.storeExternalId;
    if (options?.limit) params['limit'] = String(Math.min(options.limit, 250));
    return params;
  }

  private mapEventType(type: string): ProviderEventType {
    const mapping: Record<string, ProviderEventType> = {
      'receipt.created':  'receipt.created',
      'receipt.updated':  'receipt.updated',
      'item.updated':     'item.updated',
      'customer.created': 'customer.created',
      'customer.updated': 'customer.updated',
      'shift.opened':     'shift.opened',
      'shift.closed':     'shift.closed',
    };
    return mapping[type] ?? 'receipt.created';
  }
}
