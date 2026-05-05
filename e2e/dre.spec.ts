import { test, expect } from '@playwright/test';
import { setupAuth } from './helpers';

test.describe('DRE', () => {
  test.beforeEach(async ({ page, request }) => {
    await setupAuth(page, request);
  });

  test('loads DRE demonstrativo', async ({ page }) => {
    await page.goto('/dre');
    await expect(page.getByRole('heading', { name: 'DRE' })).toBeVisible();
    // Aguarda skeleton desaparecer (tabela com linhas do DRE)
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('(+) Receita Bruta')).toBeVisible();
    await expect(page.getByText('(=) Receita Líquida')).toBeVisible();
    await expect(page.getByText('(=) Lucro Bruto')).toBeVisible();
  });

  test('period selector switches month / last month', async ({ page }) => {
    await page.goto('/dre');
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Este mês' })).toBeVisible();
    await page.getByRole('button', { name: 'Mês anterior' }).click();
    await expect(page.getByRole('button', { name: 'Mês anterior' })).toHaveClass(/bg-background|shadow/);
    // Novo período carrega
    await expect(page.getByText('(+) Receita Bruta')).toBeVisible({ timeout: 15000 });
  });

  test('add and delete a manual expense', async ({ page }) => {
    await page.goto('/dre');
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

    // Abre formulário
    await page.getByText('+ Lançar').click();
    await expect(page.getByPlaceholder('Descrição')).toBeVisible();

    const desc = `Despesa E2E ${Date.now()}`;
    await page.getByPlaceholder('Descrição').fill(desc);
    await page.getByPlaceholder('Valor (R$)').fill('99.90');

    // Aguarda o POST completar antes de checar a lista
    const [postResponse] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/dre/expenses') && r.request().method() === 'POST'),
      page.getByRole('button', { name: 'Salvar' }).click(),
    ]);
    expect(postResponse.status()).toBe(200);

    // Aguarda o re-fetch do DRE e a despesa aparecer
    await page.waitForResponse((r) => r.url().includes('/api/dre') && r.request().method() === 'GET');
    await expect(page.getByText(desc)).toBeVisible({ timeout: 10000 });

    // Deleta — hover no .group para revelar ✕
    const expenseRow = page.locator('.group', { hasText: desc }).last();
    await expenseRow.hover();
    const deleteBtn = expenseRow.locator('button').filter({ hasText: '✕' });

    const [deleteResponse] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/dre/expenses') && r.request().method() === 'DELETE'),
      deleteBtn.click({ force: true }),
    ]);
    expect(deleteResponse.status()).toBe(200);

    await page.waitForResponse((r) => r.url().includes('/api/dre') && r.request().method() === 'GET');
    await expect(page.getByText(desc)).not.toBeVisible({ timeout: 5000 });
  });

  test('shows Despesas card', async ({ page }) => {
    await page.goto('/dre');
    await expect(page.getByText('Despesas', { exact: true })).toBeVisible({ timeout: 10000 });
  });
});
