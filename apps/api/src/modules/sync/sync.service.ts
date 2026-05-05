// SyncService — agnóstico ao provider
// Só conhece PosProvider (interface) e DatabaseService.
// Nunca importa LoyverseProvider diretamente.

import { subDays, subMinutes } from 'date-fns';
import type { PosProvider, ProviderEvent, SyncOptions } from '@sarta/shared';
import { DatabaseService } from '../../lib/db/database.service.js';

export class SyncService {
  constructor(
    private readonly provider: PosProvider,
    private readonly db: DatabaseService,
  ) {}

  // ── Sync inicial completo (ao conectar uma nova conta) ────────────────────

  async initialSync(tenantId: string): Promise<void> {
    console.log(`[SyncService] Iniciando sync completo para tenant ${tenantId}`);
    const providerId = this.provider.providerId;

    await this.step('stores',       () => this.syncStores(tenantId, providerId));
    await this.step('categories',   () => this.syncCategories(tenantId, providerId));
    await this.step('items',        () => this.syncItems(tenantId, providerId));
    await this.step('inventory',    () => this.syncInventory(tenantId, providerId));
    await this.step('employees',    () => this.syncEmployees(tenantId, providerId));
    await this.step('paymentTypes', () => this.syncPaymentTypes(tenantId, providerId));
    await this.step('receipts',     () => this.syncReceipts(tenantId, providerId, { createdAfter: subDays(new Date(), 90) }));
    await this.step('shifts',       () => this.syncShifts(tenantId, providerId, { createdAfter: subDays(new Date(), 90) }));

    await this.db.updateLastSync(tenantId);
    console.log(`[SyncService] Sync completo finalizado para tenant ${tenantId}`);
  }

  // ── Sync incremental (cron fallback a cada 15 min) ────────────────────────

  async incrementalSync(tenantId: string): Promise<void> {
    const conn = await this.db.getProviderConnection(tenantId);
    const since = conn.lastSyncAt ?? subDays(new Date(), 1);
    const providerId = this.provider.providerId;

    console.log(`[SyncService] Sync incremental desde ${since.toISOString()}`);

    await this.step('receipts',  () => this.syncReceipts(tenantId, providerId, { updatedAfter: since }));
    await this.step('items',     () => this.syncItems(tenantId, providerId, { updatedAfter: since }));
    await this.step('inventory', () => this.syncInventory(tenantId, providerId, { updatedAfter: since }));
    await this.step('shifts',    () => this.syncShifts(tenantId, providerId, { updatedAfter: since }));

    await this.db.updateLastSync(tenantId);
  }

  // ── Processar evento de webhook ───────────────────────────────────────────

  async processEvent(event: ProviderEvent): Promise<void> {
    await this.db.insertSyncEvent(event);
    const providerId = this.provider.providerId;

    switch (event.eventType) {
      case 'receipt.created':
      case 'receipt.updated': {
        const receipt = await this.provider.getReceiptById(event.externalResourceId);
        if (receipt) await this.db.upsertReceipt(event.tenantId, providerId, receipt);
        break;
      }
      case 'item.updated':
      case 'inventory.updated': {
        const items = await this.provider.getItems({ updatedAfter: subMinutes(new Date(), 5) });
        for (const item of items) await this.db.upsertItem(event.tenantId, providerId, item);
        const levels = await this.provider.getInventoryLevels({ updatedAfter: subMinutes(new Date(), 5) });
        for (const level of levels) await this.db.upsertInventoryLevel(event.tenantId, providerId, level);
        break;
      }
      case 'shift.closed': {
        const shifts = await this.provider.getShifts({ updatedAfter: subMinutes(new Date(), 5) });
        for (const shift of shifts) await this.db.upsertShift(event.tenantId, providerId, shift);
        break;
      }
      case 'customer.created':
      case 'customer.updated': {
        const customers = await this.provider.getCustomers({ updatedAfter: subMinutes(new Date(), 5) });
        for (const c of customers) await this.db.upsertCustomer(event.tenantId, providerId, c);
        break;
      }
    }
  }

  // ── Helpers privados ──────────────────────────────────────────────────────

  private async syncStores(tenantId: string, providerId: string) {
    const stores = await this.provider.getStores();
    for (const s of stores) await this.db.upsertStore(tenantId, providerId, s);
    return stores.length;
  }

  private async syncCategories(tenantId: string, providerId: string) {
    const cats = await this.provider.getCategories();
    for (const c of cats) await this.db.upsertCategory(tenantId, providerId, c);
    return cats.length;
  }

  private async syncItems(tenantId: string, providerId: string, options?: SyncOptions) {
    const items = await this.provider.getItems(options);
    for (const item of items) await this.db.upsertItem(tenantId, providerId, item);
    return items.length;
  }

  private async syncInventory(tenantId: string, providerId: string, options?: SyncOptions) {
    const levels = await this.provider.getInventoryLevels(options);
    for (const l of levels) await this.db.upsertInventoryLevel(tenantId, providerId, l);
    return levels.length;
  }

  private async syncEmployees(tenantId: string, providerId: string) {
    const emps = await this.provider.getEmployees();
    for (const e of emps) await this.db.upsertEmployee(tenantId, providerId, e);
    return emps.length;
  }

  private async syncPaymentTypes(tenantId: string, providerId: string) {
    const pts = await this.provider.getPaymentTypes();
    for (const p of pts) await this.db.upsertPaymentType(tenantId, providerId, p);
    return pts.length;
  }

  private async syncReceipts(tenantId: string, providerId: string, options?: SyncOptions) {
    const receipts = await this.provider.getReceipts(options);
    for (const r of receipts) await this.db.upsertReceipt(tenantId, providerId, r);
    return receipts.length;
  }

  private async syncShifts(tenantId: string, providerId: string, options?: SyncOptions) {
    const shifts = await this.provider.getShifts(options);
    for (const s of shifts) await this.db.upsertShift(tenantId, providerId, s);
    return shifts.length;
  }

  private async step(name: string, fn: () => Promise<number>) {
    const start = Date.now();
    try {
      const count = await fn();
      console.log(`  ✓ ${name}: ${count} registros (${Date.now() - start}ms)`);
    } catch (err) {
      console.error(`  ✗ ${name}: ${err}`);
      throw err;
    }
  }
}
