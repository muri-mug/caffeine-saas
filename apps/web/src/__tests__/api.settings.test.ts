import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Importamos a classe diretamente para poder instanciar com estado limpo
// (evitamos o singleton `api` que pode ter token de outros testes)
import { api } from '../lib/api';

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  // Injeta token direto na instância singleton (env node não tem window/localStorage)
  api.setToken('test-token');
});

afterEach(() => {
  api.clearToken();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function mockOk(body: unknown) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(body),
  } as Response);
}

function mockErr(status: number, body: unknown) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

// ── updateTenantName ─────────────────────────────────────────────────────────

describe('api.updateTenantName', () => {
  it('sends PUT /tenants/me with correct body', async () => {
    mockFetch.mockReturnValueOnce(
      mockOk({ tenant: { id: '1', name: 'Novo Nome', slug: 'sarta-coffee' } }),
    );

    const result = await api.updateTenantName('Novo Nome');

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/tenants\/me$/);
    expect(opts.method).toBe('PUT');
    expect(JSON.parse(opts.body as string)).toEqual({ name: 'Novo Nome' });
    expect(result.tenant.name).toBe('Novo Nome');
  });

  it('includes Bearer token in Authorization header', async () => {
    mockFetch.mockReturnValueOnce(
      mockOk({ tenant: { id: '1', name: 'X', slug: 'x' } }),
    );

    await api.updateTenantName('X');

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((opts.headers as Record<string, string>)['Authorization']).toBe('Bearer test-token');
  });

  it('throws when API returns error', async () => {
    mockFetch.mockReturnValueOnce(mockErr(400, { error: 'Nome é obrigatório' }));

    await expect(api.updateTenantName('')).rejects.toThrow('Nome é obrigatório');
  });
});

// ── changePassword ───────────────────────────────────────────────────────────

describe('api.changePassword', () => {
  it('sends PUT /auth/password with currentPassword and newPassword', async () => {
    mockFetch.mockReturnValueOnce(
      mockOk({ message: 'Senha atualizada com sucesso' }),
    );

    const result = await api.changePassword('velha123', 'nova456');

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/auth\/password$/);
    expect(opts.method).toBe('PUT');
    expect(JSON.parse(opts.body as string)).toEqual({
      currentPassword: 'velha123',
      newPassword: 'nova456',
    });
    expect(result.message).toBe('Senha atualizada com sucesso');
  });

  it('includes Bearer token in Authorization header', async () => {
    mockFetch.mockReturnValueOnce(mockOk({ message: 'ok' }));

    await api.changePassword('a', 'b');

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((opts.headers as Record<string, string>)['Authorization']).toBe('Bearer test-token');
  });

  it('throws with "Senha atual incorreta" on 401', async () => {
    mockFetch.mockReturnValueOnce(mockErr(401, { error: 'Senha atual incorreta' }));

    await expect(api.changePassword('errada', 'nova456')).rejects.toThrow('Senha atual incorreta');
  });

  it('throws with validation message on 400', async () => {
    mockFetch.mockReturnValueOnce(
      mockErr(400, { error: 'A nova senha deve ter pelo menos 6 caracteres' }),
    );

    await expect(api.changePassword('velha123', '123')).rejects.toThrow(
      'A nova senha deve ter pelo menos 6 caracteres',
    );
  });

  it('throws when fields are missing', async () => {
    mockFetch.mockReturnValueOnce(
      mockErr(400, { error: 'Senha atual e nova senha são obrigatórias' }),
    );

    await expect(api.changePassword('', '')).rejects.toThrow(
      'Senha atual e nova senha são obrigatórias',
    );
  });
});

// ── getTenant ────────────────────────────────────────────────────────────────

describe('api.getTenant', () => {
  it('sends GET /tenants/me and returns tenant + connections', async () => {
    const payload = {
      tenant: { id: '1', name: 'Sarta Coffee', slug: 'sarta-coffee' },
      connections: [],
    };
    mockFetch.mockReturnValueOnce(mockOk(payload));

    const result = await api.getTenant();

    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/tenants\/me$/);
    expect(opts?.method).toBeUndefined(); // GET não define method explicitamente
    expect(result.tenant.slug).toBe('sarta-coffee');
  });
});
