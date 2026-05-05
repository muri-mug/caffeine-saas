// DatabaseService — toda persistência de modelos normalizados
// Usa upsert em todas as operações para garantir idempotência.
// Nunca importa código de provider — só recebe modelos normalizados.

import { PrismaClient } from '@prisma/client';
import type {
  NormalizedStore,
  NormalizedCategory,
  NormalizedItem,
  NormalizedInventoryLevel,
  NormalizedEmployee,
  NormalizedCustomer,
  NormalizedPaymentType,
  NormalizedReceipt,
  NormalizedShift,
  ProviderEvent,
} from '@sarta/shared';

export class DatabaseService {
  readonly prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  // ── Provider connections ──────────────────────────────────────────────────

  async getProviderConnection(tenantId: string) {
    return this.prisma.providerConnection.findFirstOrThrow({
      where: { tenantId, status: 'active' },
    });
  }

  async updateLastSync(tenantId: string) {
    await this.prisma.providerConnection.updateMany({
      where: { tenantId },
      data: { lastSyncAt: new Date(), lastSyncError: null },
    });
  }

  async setSyncError(tenantId: string, error: string) {
    await this.prisma.providerConnection.updateMany({
      where: { tenantId },
      data: { lastSyncError: error },
    });
  }

  // ── Stores ────────────────────────────────────────────────────────────────

  async upsertStore(tenantId: string, providerId: string, store: NormalizedStore) {
    return this.prisma.store.upsert({
      where: { tenantId_providerId_externalId: { tenantId, providerId, externalId: store.externalId } },
      update: {
        name: store.name,
        timezone: store.timezone,
        currencyCode: store.currencyCode,
        address: store.address ?? null,
        syncedAt: new Date(),
      },
      create: {
        tenantId,
        providerId,
        externalId: store.externalId,
        name: store.name,
        timezone: store.timezone,
        currencyCode: store.currencyCode,
        address: store.address ?? null,
        syncedAt: new Date(),
      },
    });
  }

  async findStore(tenantId: string, providerId: string, externalId: string) {
    return this.prisma.store.findUnique({
      where: { tenantId_providerId_externalId: { tenantId, providerId, externalId } },
    });
  }

  // ── Categories ────────────────────────────────────────────────────────────

  async upsertCategory(tenantId: string, providerId: string, cat: NormalizedCategory) {
    return this.prisma.category.upsert({
      where: { tenantId_providerId_externalId: { tenantId, providerId, externalId: cat.externalId } },
      update: { name: cat.name, color: cat.color ?? null },
      create: { tenantId, providerId, externalId: cat.externalId, name: cat.name, color: cat.color ?? null },
    });
  }

  // ── Items + Variants ──────────────────────────────────────────────────────

  async upsertItem(tenantId: string, providerId: string, item: NormalizedItem) {
    // Resolver category
    let categoryId: string | null = null;
    if (item.categoryExternalId) {
      const cat = await this.prisma.category.findUnique({
        where: { tenantId_providerId_externalId: { tenantId, providerId, externalId: item.categoryExternalId } },
      });
      categoryId = cat?.id ?? null;
    }

    const dbItem = await this.prisma.item.upsert({
      where: { tenantId_providerId_externalId: { tenantId, providerId, externalId: item.externalId } },
      update: {
        name: item.name,
        categoryId,
        trackStock: item.trackStock,
        deletedAt: item.deletedAt ?? null,
        updatedAt: new Date(),
      },
      create: {
        tenantId,
        providerId,
        externalId: item.externalId,
        name: item.name,
        categoryId,
        trackStock: item.trackStock,
        deletedAt: item.deletedAt ?? null,
        updatedAt: new Date(),
      },
    });

    for (const variant of item.variants) {
      await this.prisma.variant.upsert({
        where: { tenantId_providerId_externalId: { tenantId, providerId, externalId: variant.externalId } },
        update: {
          name: variant.name,
          sku: variant.sku ?? null,
          price: variant.price,
          cost: variant.cost ?? null,
        },
        create: {
          tenantId,
          providerId,
          externalId: variant.externalId,
          itemId: dbItem.id,
          name: variant.name,
          sku: variant.sku ?? null,
          price: variant.price,
          cost: variant.cost ?? null,
        },
      });
    }

    return dbItem;
  }

  // ── Inventory ─────────────────────────────────────────────────────────────

  async upsertInventoryLevel(tenantId: string, providerId: string, level: NormalizedInventoryLevel) {
    const variant = await this.prisma.variant.findUnique({
      where: { tenantId_providerId_externalId: { tenantId, providerId, externalId: level.variantExternalId } },
    });
    const store = await this.prisma.store.findUnique({
      where: { tenantId_providerId_externalId: { tenantId, providerId, externalId: level.storeExternalId } },
    });
    if (!variant || !store) return;

    await this.prisma.inventoryLevel.upsert({
      where: { variantId_storeId: { variantId: variant.id, storeId: store.id } },
      update: {
        inStock: level.inStock,
        lowStockThreshold: level.lowStockThreshold ?? null,
        updatedAt: new Date(),
      },
      create: {
        variantId: variant.id,
        storeId: store.id,
        inStock: level.inStock,
        lowStockThreshold: level.lowStockThreshold ?? null,
      },
    });
  }

  // ── Employees ─────────────────────────────────────────────────────────────

  async upsertEmployee(tenantId: string, providerId: string, emp: NormalizedEmployee) {
    return this.prisma.employee.upsert({
      where: { tenantId_providerId_externalId: { tenantId, providerId, externalId: emp.externalId } },
      update: { name: emp.name, role: emp.role, email: emp.email ?? null, deletedAt: emp.deletedAt ?? null },
      create: { tenantId, providerId, externalId: emp.externalId, name: emp.name, role: emp.role, email: emp.email ?? null },
    });
  }

  // ── Customers ─────────────────────────────────────────────────────────────

  async upsertCustomer(tenantId: string, providerId: string, cust: NormalizedCustomer) {
    return this.prisma.customer.upsert({
      where: { tenantId_providerId_externalId: { tenantId, providerId, externalId: cust.externalId } },
      update: {
        name: cust.name ?? null,
        email: cust.email ?? null,
        phone: cust.phone ?? null,
        firstVisit: cust.firstVisit ?? null,
        lastVisit: cust.lastVisit ?? null,
        totalVisits: cust.totalVisits ?? null,
        totalSpent: cust.totalSpent ?? null,
        deletedAt: cust.deletedAt ?? null,
      },
      create: {
        tenantId,
        providerId,
        externalId: cust.externalId,
        name: cust.name ?? null,
        email: cust.email ?? null,
        phone: cust.phone ?? null,
        firstVisit: cust.firstVisit ?? null,
        lastVisit: cust.lastVisit ?? null,
        totalVisits: cust.totalVisits ?? null,
        totalSpent: cust.totalSpent ?? null,
      },
    });
  }

  // ── Payment Types ─────────────────────────────────────────────────────────

  async upsertPaymentType(tenantId: string, providerId: string, pt: NormalizedPaymentType) {
    return this.prisma.paymentType.upsert({
      where: { tenantId_providerId_externalId: { tenantId, providerId, externalId: pt.externalId } },
      update: { name: pt.name, type: pt.type },
      create: { tenantId, providerId, externalId: pt.externalId, name: pt.name, type: pt.type },
    });
  }

  // ── Shifts ────────────────────────────────────────────────────────────────

  async upsertShift(tenantId: string, providerId: string, shift: NormalizedShift) {
    const store = await this.findStore(tenantId, providerId, shift.storeExternalId);
    if (!store) return null;

    let employeeId: string | null = null;
    if (shift.employeeExternalId) {
      const emp = await this.prisma.employee.findUnique({
        where: { tenantId_providerId_externalId: { tenantId, providerId, externalId: shift.employeeExternalId } },
      });
      employeeId = emp?.id ?? null;
    }

    return this.prisma.shift.upsert({
      where: { tenantId_providerId_externalId: { tenantId, providerId, externalId: shift.externalId } },
      update: {
        closedAt: shift.closedAt ?? null,
        openingCashAmount: shift.openingCashAmount,
        cashReceived: shift.cashReceived,
        cashPaidIn: shift.cashPaidIn,
        cashPaidOut: shift.cashPaidOut,
        cashRefunds: shift.cashRefunds,
        expectedCashAmount: shift.expectedCashAmount,
        actualCashAmount: shift.actualCashAmount ?? null,
        cashDifference: shift.cashDifference ?? null,
        receiptsCount: shift.receiptsCount,
        netTotal: shift.netTotal,
      },
      create: {
        tenantId,
        providerId,
        externalId: shift.externalId,
        storeId: store.id,
        employeeId,
        openedAt: shift.openedAt,
        closedAt: shift.closedAt ?? null,
        openingCashAmount: shift.openingCashAmount,
        cashReceived: shift.cashReceived,
        cashPaidIn: shift.cashPaidIn,
        cashPaidOut: shift.cashPaidOut,
        cashRefunds: shift.cashRefunds,
        expectedCashAmount: shift.expectedCashAmount,
        actualCashAmount: shift.actualCashAmount ?? null,
        cashDifference: shift.cashDifference ?? null,
        receiptsCount: shift.receiptsCount,
        netTotal: shift.netTotal,
      },
    });
  }

  // ── Receipts ──────────────────────────────────────────────────────────────

  async upsertReceipt(tenantId: string, providerId: string, receipt: NormalizedReceipt) {
    const store = await this.findStore(tenantId, providerId, receipt.storeExternalId);
    if (!store) return null;

    let employeeId: string | null = null;
    if (receipt.employeeExternalId) {
      const emp = await this.prisma.employee.findUnique({
        where: { tenantId_providerId_externalId: { tenantId, providerId, externalId: receipt.employeeExternalId } },
      });
      employeeId = emp?.id ?? null;
    }

    let customerId: string | null = null;
    if (receipt.customerExternalId) {
      const cust = await this.prisma.customer.findUnique({
        where: { tenantId_providerId_externalId: { tenantId, providerId, externalId: receipt.customerExternalId } },
      });
      customerId = cust?.id ?? null;
    }

    // Upsert receipt
    const dbReceipt = await this.prisma.receipt.upsert({
      where: { tenantId_providerId_externalId: { tenantId, providerId, externalId: receipt.externalId } },
      update: {
        type: receipt.type,
        subtotal: receipt.subtotal,
        totalDiscount: receipt.totalDiscount,
        totalTax: receipt.totalTax,
        totalAmount: receipt.totalAmount,
        diningOption: receipt.diningOption ?? null,
        note: receipt.note ?? null,
        cancelledAt: receipt.cancelledAt ?? null,
        updatedAt: receipt.updatedAt,
        syncedAt: new Date(),
      },
      create: {
        tenantId,
        providerId,
        externalId: receipt.externalId,
        type: receipt.type,
        storeId: store.id,
        employeeId,
        customerId,
        subtotal: receipt.subtotal,
        totalDiscount: receipt.totalDiscount,
        totalTax: receipt.totalTax,
        totalAmount: receipt.totalAmount,
        diningOption: receipt.diningOption ?? null,
        note: receipt.note ?? null,
        cancelledAt: receipt.cancelledAt ?? null,
        createdAt: receipt.createdAt,
        updatedAt: receipt.updatedAt,
      },
    });

    // Recriar line items (delete + insert para simplicidade no MVP)
    await this.prisma.receiptLineItem.deleteMany({ where: { receiptId: dbReceipt.id } });
    for (const li of receipt.lineItems) {
      let variantId: string | null = null;
      if (li.externalVariantId) {
        const v = await this.prisma.variant.findUnique({
          where: { tenantId_providerId_externalId: { tenantId, providerId, externalId: li.externalVariantId } },
        });
        variantId = v?.id ?? null;
      }

      await this.prisma.receiptLineItem.create({
        data: {
          receiptId: dbReceipt.id,
          variantId,
          itemName: li.itemName,
          variantName: li.variantName ?? null,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          totalPrice: li.totalPrice,
          unitCost: li.unitCost ?? null,
          totalCost: li.totalCost ?? null,
          discount: li.discount ?? null,
          tax: li.tax ?? null,
        },
      });
    }

    // Recriar payments
    await this.prisma.receiptPayment.deleteMany({ where: { receiptId: dbReceipt.id } });
    for (const p of receipt.payments) {
      let paymentTypeId: string | null = null;
      if (p.externalPaymentTypeId) {
        const pt = await this.prisma.paymentType.findUnique({
          where: { tenantId_providerId_externalId: { tenantId, providerId, externalId: p.externalPaymentTypeId } },
        });
        paymentTypeId = pt?.id ?? null;
      }

      await this.prisma.receiptPayment.create({
        data: {
          receiptId: dbReceipt.id,
          paymentTypeId,
          paymentTypeName: p.paymentTypeName,
          paymentTypeCategory: p.paymentTypeCategory,
          amount: p.amount,
          paidAt: p.paidAt ?? null,
        },
      });
    }

    return dbReceipt;
  }

  // ── Sync events ───────────────────────────────────────────────────────────

  async insertSyncEvent(event: ProviderEvent) {
    return this.prisma.syncEvent.create({
      data: {
        tenantId: event.tenantId,
        providerId: event.providerId,
        eventType: event.eventType,
        externalResourceId: event.externalResourceId,
        rawPayload: event.rawPayload as object,
        receivedAt: event.receivedAt,
      },
    });
  }
}
