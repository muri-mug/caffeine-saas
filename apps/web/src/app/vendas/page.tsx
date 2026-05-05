'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@tremor/react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';
import { PeriodSelector } from '@/components/financial/period-selector';
import { ShoppingBag, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from '@/lib/icons';
import type { Period } from '@/hooks/use-dashboard';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

interface Payment {
  paymentTypeName: string;
  paymentTypeCategory: string;
  amount: number;
}

interface LineItem {
  itemName: string;
  variantName: string;
  quantity: number;
  totalPrice: number;
}

interface Receipt {
  id: string;
  externalId: string;
  type: 'sale' | 'refund';
  totalMoney: number;
  totalDiscount: number;
  createdAt: string;
  employee: { id: string; name: string } | null;
  store: { id: string; name: string } | null;
  payments: Payment[];
  lineItems: LineItem[];
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface ReceiptsData {
  receipts: Receipt[];
  pagination: Pagination;
}

function ReceiptRow({ receipt, locale, paymentLabel, saleLabel, refundLabel, itemLabel, itemsLabel }:
  { receipt: Receipt; locale: string; paymentLabel: (cat: string, name: string) => string; saleLabel: string; refundLabel: string; itemLabel: string; itemsLabel: string }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(receipt.createdAt);
  const isRefund = receipt.type === 'refund';
  const primaryPayment = receipt.payments[0];

  return (
    <>
      <tr
        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3 whitespace-nowrap">
          <p className="text-sm text-foreground">
            {date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: '2-digit' })}
          </p>
          <p className="text-xs text-muted-foreground">
            {date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
          </p>
        </td>
        <td className="px-4 py-3">
          <span className={cn(
            'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
            isRefund ? 'bg-negative/10 text-negative' : 'bg-positive/10 text-positive',
          )}>
            {isRefund ? refundLabel : saleLabel}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <span className={cn('text-sm font-medium financial-value', isRefund ? 'text-negative' : 'text-foreground')}>
            {isRefund ? '-' : ''}{formatCurrency(receipt.totalMoney)}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-muted-foreground">
          {primaryPayment
            ? paymentLabel(primaryPayment.paymentTypeCategory, primaryPayment.paymentTypeName)
            : '—'}
          {receipt.payments.length > 1 && (
            <span className="text-xs ml-1">(+{receipt.payments.length - 1})</span>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-muted-foreground">
          {receipt.employee?.name ?? '—'}
        </td>
        <td className="px-4 py-3 text-right text-sm text-muted-foreground">
          {receipt.lineItems.length} {receipt.lineItems.length === 1 ? itemLabel : itemsLabel}
        </td>
        <td className="px-4 py-3">
          {expanded
            ? <ChevronUp className="h-4 w-4 text-muted-foreground ml-auto" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />}
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-border bg-muted/20">
          <td colSpan={7} className="px-6 py-3">
            <div className="space-y-1">
              {receipt.lineItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-foreground">
                    {item.itemName}
                    {item.variantName !== 'Padrão' && item.variantName !== 'Default' && (
                      <span className="text-muted-foreground ml-1">({item.variantName})</span>
                    )}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">×{item.quantity}</span>
                    <span className="financial-value text-foreground">{formatCurrency(item.totalPrice)}</span>
                  </div>
                </div>
              ))}
              {receipt.payments.length > 1 && (
                <div className="pt-2 mt-2 border-t border-border space-y-1">
                  {receipt.payments.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {paymentLabel(p.paymentTypeCategory, p.paymentTypeName)}
                      </span>
                      <span className="financial-value text-foreground">{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function VendasPage() {
  const [period, setPeriod]   = useState<Period>('today');
  const [customFrom, setFrom] = useState('');
  const [customTo,   setTo]   = useState('');
  const [data, setData]       = useState<ReceiptsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const t = useT();

  const paymentCategoryLabel: Record<string, string> = {
    cash: t.sales.cash, card: t.sales.card, voucher: t.sales.voucher, other: t.sales.other,
  };

  const getPaymentLabel = (cat: string, name: string) =>
    paymentCategoryLabel[cat] ?? name;

  const fetchData = useCallback((p: number) => {
    const isCustom = period === 'custom' && customFrom && customTo;
    if (period === 'custom' && !isCustom) return; // aguarda as datas serem preenchidas
    const qs = isCustom
      ? `period=custom&from=${customFrom}&to=${customTo}`
      : `period=${period}`;
    setLoading(true);
    fetch(`${API}/api/receipts?${qs}&page=${p}&pageSize=50`, {
      headers: { Authorization: `Bearer ${api.getToken()}` },
    })
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period, customFrom, customTo]);

  useEffect(() => {
    setPage(1);
    fetchData(1);
  }, [fetchData]);

  const handlePage = (next: number) => {
    setPage(next);
    fetchData(next);
  };

  const pg = data?.pagination;

  const tableHeaders = [
    t.sales.dateTime, t.sales.type, t.sales.total,
    t.sales.payment, t.sales.employee, t.sales.items, '',
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t.sales.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t.sales.subtitle}</p>
        </div>
        <PeriodSelector
          value={period}
          onChange={setPeriod}
          customFrom={customFrom}
          customTo={customTo}
          onCustomRange={(f, t) => { setFrom(f); setTo(t); }}
        />
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            <p className="text-base font-semibold text-foreground">{t.sales.receipts}</p>
          </div>
          {pg && (
            <p className="text-xs text-muted-foreground">
              {pg.total.toLocaleString(t.locale)} {t.sales.transactions}
            </p>
          )}
        </div>

        {loading ? (
          <div className="space-y-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 bg-muted animate-pulse border-b border-border last:border-0" />
            ))}
          </div>
        ) : !data?.receipts.length ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {t.sales.noTransactions}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {tableHeaders.map((h, i) => (
                      <th key={i} className={cn(
                        'text-xs font-medium text-muted-foreground px-4 py-3 whitespace-nowrap',
                        h === t.sales.total || h === t.sales.items ? 'text-right' : 'text-left',
                      )}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.receipts.map((receipt) => (
                    <ReceiptRow
                      key={receipt.id}
                      receipt={receipt}
                      locale={t.locale}
                      paymentLabel={getPaymentLabel}
                      saleLabel={t.sales.sale}
                      refundLabel={t.sales.refund}
                      itemLabel={t.sales.item}
                      itemsLabel={t.sales.items_plural}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {pg && pg.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  {t.sales.page} {pg.page} {t.sales.of} {pg.totalPages}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePage(page - 1)}
                    disabled={page <= 1}
                    className="p-1.5 rounded-md hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handlePage(page + 1)}
                    disabled={page >= pg.totalPages}
                    className="p-1.5 rounded-md hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
