import type { Page, APIRequestContext } from '@playwright/test';

export const API_URL  = 'http://localhost:3001';
export const BASE_URL = 'http://localhost:3000';
export const CREDS    = { slug: 'sarta-coffee', password: 'sarta123' };

/** Faz login via API e injeta o token no localStorage da página antes de qualquer navegação. */
export async function setupAuth(page: Page, request: APIRequestContext) {
  const res = await request.post(`${API_URL}/auth/login`, {
    data: CREDS,
    headers: { 'Content-Type': 'application/json' },
  });
  const { token } = await res.json() as { token: string };

  await page.addInitScript((t: string) => {
    localStorage.setItem('sarta_token', t);
  }, token);
}
