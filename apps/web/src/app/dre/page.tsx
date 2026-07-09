'use client';

import { useState, useEffect } from 'react';
import { Card } from '@tremor/react';
import { api } from '@/lib/api';
import { formatCurrency, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';
import { FileText, DollarSign } from '@/lib/icons';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

type DRePeriod = 'month' | 'lastmonth' | 'custom';

interface DreData {
  period: { from: string; to: string };
  dre: {
    grossRevenue: number; refundsTotal: number; discounts: number; taxes: number;
    netRevenue: number; cmv: number; grossProfit: number; grossMarginPct: number;
    expenses: Record<string, number>; totalExpenses: number;
    ebitda: number; netProfit: number; netMarginPct: number;
  };
  expensesList: { id: string; category: string; description: string; amount: number; referenceDate: string; recurrence: string }[];
  transactionsCount: number;
}

function DreRow({ label, value, indent = 0, bold = false, colorize = false, separator = false, positive = true }:
  { label: string; value: number; indent?: number; bold?: boolean; colorize?: boolean; separator?: boolean; positive?: boolean }) {
  return (
    <>
      {separator && <tr><td colSpan={2} className="py-1"><div className="border-t border-border/60" /></td></tr>}
      <tr className="transition-colors hover:bg-muted/40">
        <td className={cn('py-2 text-sm', bold ? 'font-semibold text-foreground' : 'text-muted-foreground')}
          style={{ paddingLeft: `${(indent + 1) * 16}px` }}>
          {label}
        </td>
        <td className={cn('py-2 text-sm text-right financial-value',
          bold ? 'font-semibold' : '',
          colorize && value > 0 && positive ? 'text-positive' : '',
          colorize && value < 0 ? 'text-negative' : '',
          colorize && value === 0 ? 'text-muted-foreground' : 'text-foreground',
        )}>
          {formatCurrency(value)}
        </td>
      </tr>
    </>
  );
}

export default function DrePage() {
  const [period, setPeriod]         = useState<DRePeriod>('month');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [data, setData]             = useState<DreData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [newExpense, setNewExpense]  = useState({ category: 'rent', description: '', amount: '', referenceDate: new Date().toISOString().slice(0,10) });
  const [saving, setSaving]         = useState(false);
  const t = useT();

  const expenseCategories: Record<string, string> = {
    rent: t.dre.catRent, salary: t.dre.catSalary,
    utilities: t.dre.catUtilities, other: t.dre.catOther,
  };

  const periodOptions = [
    { value: 'month' as DRePeriod,     label: t.dre.thisMonth },
    { value: 'lastmonth' as DRePeriod, label: t.dre.lastMonth },
  ];

  const fetchData = () => {
    if (period === 'custom' && !selectedMonth) return;
    setLoading(true);
    let qs = `period=${period}`;
    if (period === 'custom' && selectedMonth) {
      const [year, month] = selectedMonth.split('-').map(Number);
      const from = new Date(year, month - 1, 1).toISOString().slice(0, 10);
      const lastDay = new Date(year, month, 0).getDate();
      const to = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
      qs = `period=custom&from=${from}&to=${to}`;
    }
    fetch(`${API}/api/dre?${qs}`, { headers: { Authorization: `Bearer ${api.getToken()}` } })
      .then((r) => r.json()).then(setData).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [period, selectedMonth, t.locale]);

  const handleAddExpense = async () => {
    if (!newExpense.description || !newExpense.amount) return;
    setSaving(true);
    try {
      await fetch(`${API}/api/dre/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${api.getToken()}` },
        body: JSON.stringify({ ...newExpense, amount: Math.round(parseFloat(newExpense.amount) * 100) }),
      });
      setShowExpenseForm(false);
      setNewExpense({ category: 'rent', description: '', amount: '', referenceDate: new Date().toISOString().slice(0,10) });
      fetchData();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    await fetch(`${API}/api/dre/expenses/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${api.getToken()}` },
    });
    fetchData();
  };

  const d = data?.dre;

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t.dre.title}</h1>
          <p className="text-sm text-muted-foreground">{t.dre.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-0.5 bg-muted border border-border/60 rounded-lg p-1">
            {periodOptions.map((opt) => (
              <button key={opt.value} onClick={() => setPeriod(opt.value)}
                className={cn('px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                  period === opt.value ? 'bg-card text-foreground shadow-sm ring-1 ring-border/60' : 'text-muted-foreground hover:text-foreground hover:bg-background/60',
                )}>
                {opt.label}
              </button>
            ))}
            <button
              onClick={() => setPeriod('custom')}
              className={cn('px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                period === 'custom' ? 'bg-card text-foreground shadow-sm ring-1 ring-border/60' : 'text-muted-foreground hover:text-foreground hover:bg-background/60',
              )}
            >
              {t.dre.pickMonth}
            </button>
          </div>
          {period === 'custom' && (
            <input
              type="month"
              value={selectedMonth}
              max={new Date().toISOString().slice(0, 7)}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-sm border border-border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* DRE */}
        <div className="lg:col-span-2">
          <Card className="rounded-lg border border-border bg-card p-5 shadow-sm ring-0 transition-shadow duration-200 hover:shadow-md">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-muted shrink-0">
                <FileText className="h-[18px] w-[18px] text-brand" />
              </div>
              <p className="card-title">{t.dre.statement}</p>
              {data && (
                <span className="text-xs text-muted-foreground financial-value ml-auto">
                  {new Date(data.period.from).toLocaleDateString(t.locale)} – {new Date(data.period.to).toLocaleDateString(t.locale)}
                </span>
              )}
            </div>

            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-8 bg-muted animate-pulse rounded-md" />
                ))}
              </div>
            ) : d ? (
              <table className="w-full">
                <tbody>
                  <DreRow label={t.dre.grossRevenue}  value={d.grossRevenue}   bold />
                  <DreRow label={t.dre.refunds}        value={d.refundsTotal}   indent={1} />
                  <DreRow label={t.dre.discounts}      value={d.discounts}      indent={1} />
                  <DreRow label={t.dre.taxes}          value={d.taxes}          indent={1} />
                  <DreRow label={t.dre.netRevenue}     value={d.netRevenue}     bold separator colorize positive />
                  <DreRow label={t.dre.cmv}            value={d.cmv}            indent={1} />
                  <DreRow label={t.dre.grossProfit}    value={d.grossProfit}    bold separator colorize positive />
                  <tr>
                    <td className="py-1 text-xs text-muted-foreground pl-4">{t.dre.grossMargin}</td>
                    <td className="py-1 text-xs text-right text-muted-foreground financial-value">{formatPercent(d.grossMarginPct)}</td>
                  </tr>
                  {Object.entries(d.expenses).map(([cat, amt]) => (
                    <DreRow key={cat} label={`(-) ${expenseCategories[cat] ?? cat}`} value={amt} indent={1} />
                  ))}
                  {d.totalExpenses > 0 && (
                    <DreRow label={t.dre.totalExpenses} value={d.totalExpenses} bold separator />
                  )}
                  <DreRow label={t.dre.ebitda} value={d.netProfit} bold separator colorize positive />
                  <tr>
                    <td className="py-1 text-xs text-muted-foreground pl-4">{t.dre.netMargin}</td>
                    <td className="py-1 text-xs text-right text-muted-foreground financial-value">{formatPercent(d.netMarginPct)}</td>
                  </tr>
                </tbody>
              </table>
            ) : null}
          </Card>
        </div>

        {/* Despesas */}
        <div className="space-y-5">
          <Card className="rounded-lg border border-border bg-card p-5 shadow-sm ring-0 transition-shadow duration-200 hover:shadow-md">
            <div className="flex items-center justify-between mb-4">
              <p className="card-title">{t.dre.expenses}</p>
              <button onClick={() => setShowExpenseForm(!showExpenseForm)}
                className="rounded-md bg-brand-muted px-2.5 py-1 text-xs font-medium text-brand transition-colors hover:bg-brand/20">
                {t.dre.addExpense}
              </button>
            </div>

            {showExpenseForm && (
              <div className="space-y-3 mb-4 p-3.5 bg-muted/50 border border-border/60 rounded-lg">
                <select value={newExpense.category} onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                  className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary">
                  {Object.entries(expenseCategories).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <input type="text" placeholder={t.dre.description} value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
                <input type="number" placeholder={t.dre.amount} value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background financial-value focus:outline-none focus:ring-1 focus:ring-primary" />
                <input type="date" value={newExpense.referenceDate}
                  onChange={(e) => setNewExpense({ ...newExpense, referenceDate: e.target.value })}
                  className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
                <div className="flex gap-2">
                  <button onClick={handleAddExpense} disabled={saving}
                    className="flex-1 bg-primary text-primary-foreground text-sm font-medium py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50">
                    {saving ? t.dre.saving : t.dre.save}
                  </button>
                  <button onClick={() => setShowExpenseForm(false)}
                    className="flex-1 bg-muted text-foreground text-sm font-medium py-2 rounded-md hover:bg-muted/80 transition-colors">
                    {t.dre.cancel}
                  </button>
                </div>
              </div>
            )}

            {data?.expensesList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t.dre.noExpenses}</p>
            ) : (
              <div className="divide-y divide-border/60">
                {data?.expensesList.map((exp) => (
                  <div key={exp.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 group">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground truncate">{exp.description}</p>
                      <p className="text-xs text-muted-foreground">{expenseCategories[exp.category] ?? exp.category}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <span className="text-sm financial-value text-negative">{formatCurrency(exp.amount)}</span>
                      <button onClick={() => handleDeleteExpense(exp.id)}
                        className="opacity-0 group-hover:opacity-100 text-xs text-muted-foreground hover:text-negative transition-all">
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
