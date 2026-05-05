import { test, expect } from '@playwright/test';
import { setupAuth } from './helpers';

test.describe('Caixa — Fluxo de Caixa', () => {
  test.beforeEach(async ({ page, request }) => {
    await setupAuth(page, request);
  });

  test('loads cashflow page with summary cards', async ({ page }) => {
    await page.goto('/caixa');
    await expect(page.getByRole('heading', { name: 'Fluxo de Caixa' })).toBeVisible();
    await expect(page.getByText('Receita líquida')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Entradas em caixa')).toBeVisible();
    await expect(page.getByText('Saídas de caixa')).toBeVisible();
    await expect(page.getByText('Diferença total')).toBeVisible();
  });

  test('shows shift table or empty state', async ({ page }) => {
    await page.goto('/caixa');
    await expect(
      page.getByRole('table').or(page.getByText('Nenhum turno encontrado'))
    ).toBeVisible({ timeout: 10000 });
  });

  test('period selector changes the period', async ({ page }) => {
    await page.goto('/caixa');
    await expect(page.getByRole('button', { name: 'Hoje' })).toBeVisible();
    await page.getByRole('button', { name: 'Ontem' }).click();
    await expect(page.getByRole('button', { name: 'Ontem' })).toHaveClass(/bg-background|shadow/);
  });

  test('custom date range filter applies and fetches data', async ({ page }) => {
    await page.goto('/caixa');
    await page.getByRole('button', { name: 'Período' }).click();
    await expect(page.locator('input[type="date"]').first()).toBeVisible();
    await page.locator('input[type="date"]').first().fill('2025-01-01');
    await page.locator('input[type="date"]').nth(1).fill('2025-01-31');
    const applyBtn = page.getByRole('button', { name: 'Aplicar' });
    await expect(applyBtn).toBeEnabled();
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('period=custom') && r.url().includes('from='), { timeout: 10000 }),
      applyBtn.click(),
    ]);
    expect(response.status()).toBe(200);
  });

  test('shift table has correct columns', async ({ page }) => {
    await page.goto('/caixa');
    const table = page.getByRole('table');
    // Se tiver tabela, verifica headers
    const hasTable = await table.isVisible().catch(() => false);
    if (hasTable) {
      await expect(page.getByRole('columnheader', { name: 'Turno' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    }
  });
});
