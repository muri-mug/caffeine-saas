import { describe, it, expect } from 'vitest';
import { formatCurrency, formatNumber, formatPercent, formatDelta } from '../lib/format';

describe('formatCurrency', () => {
  it('converts centavos to BRL string', () => {
    expect(formatCurrency(125000)).toBe('R$\u00a01.250,00');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('R$\u00a00,00');
  });

  it('formats single cent', () => {
    expect(formatCurrency(1)).toBe('R$\u00a00,01');
  });

  it('formats negative value', () => {
    expect(formatCurrency(-500)).toBe('-R$\u00a05,00');
  });

  it('rounds correctly (no floating point drift)', () => {
    // 10 cents = R$ 0,10
    expect(formatCurrency(10)).toBe('R$\u00a00,10');
  });
});

describe('formatNumber', () => {
  it('formats with pt-BR thousand separator', () => {
    expect(formatNumber(1234567)).toBe('1.234.567');
  });

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('formats small number', () => {
    expect(formatNumber(42)).toBe('42');
  });
});

describe('formatPercent', () => {
  it('formats a percentage value already in %', () => {
    // 12.5 → "12,5%"
    expect(formatPercent(12.5)).toBe('12,5%');
  });

  it('formats 100%', () => {
    expect(formatPercent(100)).toBe('100,0%');
  });

  it('formats 0%', () => {
    expect(formatPercent(0)).toBe('0,0%');
  });

  it('formats negative margin', () => {
    expect(formatPercent(-5.3)).toBe('-5,3%');
  });
});

describe('formatDelta', () => {
  it('positive delta has + prefix and positive=true', () => {
    const result = formatDelta(15000);
    expect(result.positive).toBe(true);
    expect(result.text).toMatch(/^\+/);
  });

  it('negative delta has no + prefix and positive=false', () => {
    const result = formatDelta(-500);
    expect(result.positive).toBe(false);
    expect(result.text).not.toMatch(/^\+/);
  });

  it('zero delta is considered positive', () => {
    const result = formatDelta(0);
    expect(result.positive).toBe(true);
    expect(result.text).toMatch(/^\+/);
  });
});
