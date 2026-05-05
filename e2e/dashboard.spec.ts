import { test, expect } from '@playwright/test';
import { setupAuth } from './helpers';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page, request }) => {
    await setupAuth(page, request);
  });

  test('loads and shows KPI cards', async ({ page }) => {
    await page.goto('/dashboard');
    // Aguarda pelo menos um card KPI carregar (não skeleton)
    await expect(page.locator('text=Receita líquida').first()).toBeVisible({ timeout: 10000 });
  });

  test('period selector switches between periods', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('text=Este mês').or(page.locator('text=Hoje'))).toBeVisible();

    // Clica em "Hoje"
    await page.getByRole('button', { name: 'Hoje' }).click();
    await expect(page.getByRole('button', { name: 'Hoje' })).toHaveClass(/bg-background|shadow/);
  });

  test('custom date range filter shows date inputs and apply button', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Período' }).click();
    await expect(page.locator('input[type="date"]').first()).toBeVisible();
    await expect(page.locator('input[type="date"]').nth(1)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Aplicar' })).toBeVisible();
  });

  test('custom date range apply button is disabled until both dates filled', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Período' }).click();
    const applyBtn = page.getByRole('button', { name: 'Aplicar' });
    await expect(applyBtn).toBeDisabled();
    await page.locator('input[type="date"]').first().fill('2025-01-01');
    await expect(applyBtn).toBeDisabled();
    await page.locator('input[type="date"]').nth(1).fill('2025-01-31');
    await expect(applyBtn).toBeEnabled();
  });

  test('custom date range filter loads data on apply', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Período' }).click();
    await page.locator('input[type="date"]').first().fill('2025-01-01');
    await page.locator('input[type="date"]').nth(1).fill('2025-01-31');
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('period=custom') && r.url().includes('from='), { timeout: 10000 }),
      page.getByRole('button', { name: 'Aplicar' }).click(),
    ]);
    expect(response.status()).toBe(200);
  });

  test('sidebar navigation links are visible', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('link', { name: /estoque/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /caixa|fluxo/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /dre/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /vendas/i })).toBeVisible();
  });
});
