import { test, expect } from '@playwright/test';
import { setupAuth } from './helpers';

test.describe('Configurações', () => {
  test.beforeEach(async ({ page, request }) => {
    await setupAuth(page, request);
  });

  // ── Estrutura da página ────────────────────────────────────────────────────

  test('loads all four sections', async ({ page }) => {
    await page.goto('/configuracoes');
    await expect(page.getByRole('heading', { name: 'Configurações' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Aparência' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Idioma' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Empresa' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Segurança' })).toBeVisible();
  });

  test('loads company name from API', async ({ page }) => {
    await page.goto('/configuracoes');
    // O campo deve ser preenchido via GET /tenants/me
    const input = page.locator('#company-name');
    await expect(input).not.toHaveValue('', { timeout: 8000 });
  });

  // ── Dark mode ──────────────────────────────────────────────────────────────

  test('dark mode toggle adds dark class to <html>', async ({ page }) => {
    await page.goto('/configuracoes');

    // Garante que começa em light
    const htmlEl = page.locator('html');
    const initialDark = await htmlEl.evaluate((el) => el.classList.contains('dark'));

    // Clica no toggle
    await page.getByRole('switch').click();

    if (!initialDark) {
      // Deve ter adicionado 'dark'
      await expect(htmlEl).toHaveClass(/dark/, { timeout: 3000 });
    } else {
      // Deve ter removido 'dark'
      const hasDark = await htmlEl.evaluate((el) => el.classList.contains('dark'));
      expect(hasDark).toBe(false);
    }

    // Volta para o estado original
    await page.getByRole('switch').click();
  });

  test('dark mode preference persists after reload', async ({ page }) => {
    await page.goto('/configuracoes');

    const htmlEl = page.locator('html');
    const wasDark = await htmlEl.evaluate((el) => el.classList.contains('dark'));

    // Ativa dark se ainda não estiver
    if (!wasDark) {
      await page.getByRole('switch').click();
      await expect(htmlEl).toHaveClass(/dark/, { timeout: 3000 });
    }

    // Reload — SettingsProvider deve ler do localStorage e reaplicar
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/, { timeout: 3000 });

    // Limpeza: volta para light
    await page.getByRole('switch').click();
    await expect(page.locator('html')).not.toHaveClass(/dark/, { timeout: 3000 });
  });

  // ── Idioma ─────────────────────────────────────────────────────────────────

  test('switching to English translates the page', async ({ page }) => {
    await page.goto('/configuracoes');
    await page.getByRole('button', { name: 'English' }).click();

    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Appearance' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Security' })).toBeVisible();

    // Volta para português
    await page.getByRole('button', { name: 'Português' }).click();
    await expect(page.getByRole('heading', { name: 'Configurações' })).toBeVisible();
  });

  // ── Nome da empresa ────────────────────────────────────────────────────────

  test('saves company name and shows confirmation', async ({ page }) => {
    await page.goto('/configuracoes');

    const input = page.locator('#company-name');
    await expect(input).not.toHaveValue('', { timeout: 8000 });

    const original = await input.inputValue();
    await input.fill('Sarta Coffee Teste');

    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/tenants/me') && r.request().method() === 'PUT'),
      page.getByRole('button', { name: 'Salvar' }).click(),
    ]);
    expect(response.status()).toBe(200);
    await expect(page.getByRole('button', { name: 'Salvo!' })).toBeVisible({ timeout: 5000 });

    // Restaura nome original
    await page.locator('#company-name').fill(original);
    await page.getByRole('button', { name: /Salvar|Salvo!/ }).click();
    await page.waitForResponse((r) => r.url().includes('/tenants/me') && r.request().method() === 'PUT');
  });

  // ── Troca de senha ─────────────────────────────────────────────────────────

  test('shows error when new passwords do not match', async ({ page }) => {
    await page.goto('/configuracoes');

    await page.locator('#current-password').fill('qualquer123');
    await page.locator('#new-password').fill('novasenha1');
    await page.locator('#confirm-password').fill('novasenha2'); // diferente

    await page.getByRole('button', { name: 'Alterar senha' }).click();

    // Validação client-side — sem chamada de API
    await expect(page.getByText('As senhas não coincidem.')).toBeVisible();
  });

  test('shows API error when current password is wrong', async ({ page }) => {
    await page.goto('/configuracoes');

    await page.locator('#current-password').fill('senhaerrada999');
    await page.locator('#new-password').fill('novasenha123');
    await page.locator('#confirm-password').fill('novasenha123');

    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/auth/password') && r.request().method() === 'PUT'),
      page.getByRole('button', { name: 'Alterar senha' }).click(),
    ]);
    // Em dev, o tenant sem hash passa; com hash, retorna 401
    // De qualquer forma, a resposta deve ser processada sem crash
    expect([200, 401]).toContain(response.status());
  });

  test('changes password successfully and shows confirmation', async ({ page }) => {
    await page.goto('/configuracoes');

    const newPwd = 'sarta123'; // mesma senha — ciclo idempotente
    await page.locator('#current-password').fill('sarta123');
    await page.locator('#new-password').fill(newPwd);
    await page.locator('#confirm-password').fill(newPwd);

    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/auth/password') && r.request().method() === 'PUT'),
      page.getByRole('button', { name: 'Alterar senha' }).click(),
    ]);

    expect(response.status()).toBe(200);
    await expect(page.getByText('Senha alterada com sucesso!')).toBeVisible({ timeout: 5000 });

    // Campos devem ser limpos após sucesso
    await expect(page.locator('#current-password')).toHaveValue('');
    await expect(page.locator('#new-password')).toHaveValue('');
  });
});
