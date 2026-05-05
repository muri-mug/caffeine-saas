import { test, expect } from '@playwright/test';
import { setupAuth } from './helpers';

test.describe('Estoque', () => {
  test.beforeEach(async ({ page, request }) => {
    await setupAuth(page, request);
  });

  test('loads inventory table', async ({ page }) => {
    await page.goto('/estoque');
    await expect(page.getByRole('heading', { name: 'Estoque' })).toBeVisible();
    // Aguarda tabela ou estado vazio — nunca deve mostrar skeleton infinito
    await expect(
      page.locator('table').or(page.getByText('Nenhum produto encontrado'))
    ).toBeVisible({ timeout: 10000 });
  });

  test('shows summary status counters', async ({ page }) => {
    await page.goto('/estoque');
    // Aguarda dados carregarem
    await page.locator('table').or(page.getByText('Nenhum produto encontrado')).waitFor({ timeout: 10000 });
    // Os 4 cards de status ficam acima da tabela
    const cards = page.locator('button.rounded-lg.border');
    await expect(cards).toHaveCount(4, { timeout: 5000 });
    await expect(cards.nth(0)).toContainText('OK');
    await expect(cards.nth(1)).toContainText('Estoque baixo');
    await expect(cards.nth(2)).toContainText('Sem estoque');
    await expect(cards.nth(3)).toContainText('Não rastreado');
  });

  test('search input filters results', async ({ page }) => {
    await page.goto('/estoque');
    await page.locator('table').waitFor({ timeout: 10000 });

    const countBefore = await page.locator('tbody tr').count();
    await page.getByPlaceholder('Buscar produto ou SKU...').fill('zzz_produto_inexistente_zzz');
    await expect(page.getByText('Nenhum produto encontrado')).toBeVisible();

    // Limpa busca — itens voltam
    await page.getByPlaceholder('Buscar produto ou SKU...').clear();
    await expect(page.locator('tbody tr').first()).toBeVisible();
    const countAfter = await page.locator('tbody tr').count();
    expect(countAfter).toBeGreaterThanOrEqual(countBefore);
  });

  test('status filter highlights selected badge', async ({ page }) => {
    await page.goto('/estoque');
    await page.locator('table').or(page.getByText('Nenhum produto encontrado')).waitFor({ timeout: 10000 });
    // Clica no primeiro card de status (OK)
    const firstCard = page.locator('button.rounded-lg.border').first();
    await firstCard.click();
    // Depois do clique o card deve ter a classe ring (border-primary ring-1 ring-primary)
    await expect(firstCard).toHaveClass(/ring-primary/);
  });
});
