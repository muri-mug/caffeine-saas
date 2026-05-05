// Todos os valores chegam em centavos. Esta lib converte para exibição.
// Nunca formatar valores monetários inline — sempre usar estas funções.

const BRL = new Intl.NumberFormat('pt-BR', {
  style:                 'currency',
  currency:              'BRL',
  minimumFractionDigits: 2,
});

const NUMBER = new Intl.NumberFormat('pt-BR');

const PERCENT = new Intl.NumberFormat('pt-BR', {
  style:                 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Converte centavos para string BRL: 125000 → "R$ 1.250,00" */
export function formatCurrency(cents: number): string {
  return BRL.format(cents / 100);
}

/** Formata número inteiro com separador: 1234567 → "1.234.567" */
export function formatNumber(value: number): string {
  return NUMBER.format(value);
}

/** Formata percentual (já em %): 12.5 → "12,5%" */
export function formatPercent(value: number): string {
  return PERCENT.format(value / 100);
}

/** Delta colorido: +R$ 150,00 ou -R$ 50,00 */
export function formatDelta(cents: number): { text: string; positive: boolean } {
  const sign = cents >= 0 ? '+' : '';
  return {
    text: sign + formatCurrency(cents),
    positive: cents >= 0,
  };
}
