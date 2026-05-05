'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@tremor/react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
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

const paymentCategoryLabel: Record<string, string> = {
  cash: 'Dinheiro', card: 'Cartão', voucher: 'Voucher', other: 'Outro',
};

function ReceiptRow({ receipt }: { receipt: Receipt }) {
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
            {date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
          </p>
          <p className="text-xs text-muted-foreground">
            {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </td>
        <td className="px-4 py-3">
          <span className={cn(
            'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
            isRefund ? 'bg-negative/10 text-negative' : 'bg-positive/10 text-positive',
          )}>
            {isRefund ? 'Estorno' : 'Venda'}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <span className={cn('text-sm font-medium financial-value', isRefund ? 'text-negative' : 'text-foreground')}>
            {isRefund ? '-' : ''}{formatCurrency(receipt.totalMoney)}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-muted-foreground">
          {primaryPayment
            ? paymentCategoryLabel[primaryPayment.paymentTypeCategory] ?? primaryPayment.paymentTypeName
            : '—'}
          {receipt.payments.length > 1 && (
            <span className="text-xs ml-1">(+{receipt.payments.length - 1})</span>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-muted-foreground">
          {receipt.employee?.name ?? '—'}
        </td>
        <td className="px-4 py-3 text-right text-sm text-muted-foreground">
          {receipt.lineItems.length} {receipt.lineItems.length === 1 ? 'item' : 'itens'}
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
                    {item.variantName !== 'Padrão' && (
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
                        {paymentCategoryLabel[p.paymentTypeCategory] ?? p.paymentTypeName}
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
  const [data, setData]       = useState<ReceiptsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);

  const fetchData = useCallback((p: number) => {
    setLoading(true);
    fetch(`${API}/api/receipts?period=${period}&page=${p}&pageSize=50`, {
      headers: { Authorization: `Bearer ${api.getToken()}` },
    })
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

  useEffect(() => {
    setPage(1);
    fetchData(1);
  }, [period]);

  const handlePage = (next: number) => {
    setPage(next);
    fetchData(next);
  };

  const pg = data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Vendas</h1>
          <p className="text-sm text-muted-foreground mt-1">Histórico de transações</p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            <p className="text-base font-semibold text-foreground">Recibos</p>
          </div>
          {pg && (
            <p className="text-xs text-muted-foreground">
              {pg.total.toLocaleString('pt-BR')} transações
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
            Nenhuma transação encontrada neste período
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {['Data/Hora', 'Tipo', 'Total', 'Pagamento', 'Funcionário', 'Itens', ''].map((h) => (
                      <th key={h} className={cn(
                        'text-xs font-medium text-muted-foreground px-4 py-3 whitespace-nowrap',
                        h === 'Total' || h === 'Itens' ? 'text-right' : 'text-left',
                      )}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.receipts.map((receipt) => (
                    <ReceiptRow key={receipt.id} receipt={receipt} />
                  ))}
                </tbody>
              </table>
            </div>

            {pg && pg.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Página {pg.page} de {pg.totalPages}
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
