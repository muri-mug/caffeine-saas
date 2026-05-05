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

  test('sidebar navigation links are visible', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('link', { name: /estoque/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /caixa|fluxo/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /dre/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /vendas/i })).toBeVisible();
  });
});
