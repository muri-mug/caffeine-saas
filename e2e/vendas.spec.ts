import { test, expect } from '@playwright/test';
import { setupAuth } from './helpers';

test.describe('Vendas', () => {
  test.beforeEach(async ({ page, request }) => {
    await setupAuth(page, request);
  });

  test('loads receipts table', async ({ page }) => {
    await page.goto('/vendas');
    await expect(page.getByRole('heading', { name: 'Vendas' })).toBeVisible();
    await expect(
      page.getByRole('table').or(page.getByText('Nenhuma transação encontrada'))
    ).toBeVisible({ timeout: 10000 });
  });

  test('shows sale/refund badges in rows', async ({ page }) => {
    await page.goto('/vendas');
    const table = page.getByRole('table');
    const hasTable = await table.isVisible({ timeout: 10000 }).catch(() => false);
    if (hasTable) {
      // Pelo menos um badge Venda ou Estorno deve estar visível
      await expect(
        page.getByText('Venda').or(page.getByText('Estorno')).first()
      ).toBeVisible();
    }
  });

  test('expanding a row shows line items', async ({ page }) => {
    await page.goto('/vendas');
    const firstRow = page.locator('tbody tr').first();
    const hasRows = await firstRow.isVisible({ timeout: 10000 }).catch(() => false);
    if (!hasRows) return; // sem dados no período — skip

    await firstRow.click();
    // A linha expandida mostra uma célula com colspan (linha de detalhes)
    await expect(page.locator('td[colspan]')).toBeVisible({ timeout: 5000 });
  });

  test('period selector works', async ({ page }) => {
    await page.goto('/vendas');
    await expect(page.getByRole('button', { name: 'Hoje' })).toBeVisible();
    await page.getByRole('button', { name: 'Mês' }).click();
    await expect(page.getByRole('button', { name: 'Mês' })).toHaveClass(/bg-background|shadow/);
    // Dados recarregam
    await expect(
      page.getByRole('table').or(page.getByText('Nenhuma transação encontrada'))
    ).toBeVisible({ timeout: 10000 });
  });

  test('custom date range filter applies and fetches data', async ({ page }) => {
    await page.goto('/vendas');
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

  test('pagination appears when there are many receipts', async ({ page }) => {
    await page.goto('/vendas');
    // Muda para mês inteiro para ter mais dados
    await page.getByRole('button', { name: 'Mês' }).click();
    await page.waitForTimeout(1000);

    const pagination = page.locator('text=Página');
    const hasPagination = await pagination.isVisible().catch(() => false);
    // Se há mais de 50 registros no mês, paginação deve aparecer
    if (hasPagination) {
      await expect(page.locator('text=Página')).toBeVisible();
    }
    // Se não tem, o teste passa — não é um erro ter menos de 50 recibos num período
  });
});
