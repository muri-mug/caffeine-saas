// Cliente HTTP para a API do Sarta SaaS
// Lê o token do localStorage e injeta no header Authorization.

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') localStorage.setItem('sarta_token', token);
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('sarta_token');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') localStorage.removeItem('sarta_token');
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const token = this.getToken();
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error ?? `HTTP ${res.status}`);
    }
    return res.json();
  }

  // ── Auth ────────────────────────────────────────────────────────────────

  async login(slug: string, password: string) {
    const data = await this.request<{ token: string; tenant: { id: string; name: string; slug: string } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ slug, password }) },
    );
    this.setToken(data.token);
    return data;
  }

  // ── Tenant ───────────────────────────────────────────────────────────────

  async getTenant() {
    return this.request<{ tenant: { id: string; name: string; slug: string }; connections: unknown[] }>(
      '/tenants/me',
    );
  }

  async updateTenantName(name: string) {
    return this.request<{ tenant: { id: string; name: string; slug: string } }>(
      '/tenants/me',
      { method: 'PUT', body: JSON.stringify({ name }) },
    );
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request<{ message: string }>(
      '/auth/password',
      { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) },
    );
  }

  // ── Dashboard ────────────────────────────────────────────────────────────

  async getOverview(params: { period?: string; from?: string; to?: string; storeId?: string } = {}) {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return this.request<{
      grossRevenue: number;     // preço cheio (subtotal, antes de descontos)
      revenue: number;          // após descontos (= totalAmount)
      revenueNet: number;       // após descontos e impostos
      costTotal: number;
      grossProfit: number;
      grossMarginPct: number;
      transactionsCount: number;
      avgTicket: number;
      refundsTotal: number;
      discountsTotal: number;
      taxTotal: number;
      revenueDelta?: number;
      transactionsDelta?: number;
      avgTicketDelta?: number;
    }>(`/api/dashboard/overview?${qs}`);
  }

  async getHourlyRevenue(params: { period?: string; from?: string; to?: string } = {}) {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return this.request<{ hour: string; receita: number; transacoes: number }[]>(
      `/api/dashboard/hourly?${qs}`,
    );
  }

  async getPayments(params: { period?: string; from?: string; to?: string } = {}) {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return this.request<{ name: string; amount: number; count: number; pct: number }[]>(
      `/api/dashboard/payments?${qs}`,
    );
  }

  async getTopProducts(params: { period?: string; limit?: number } = {}) {
    const qs = new URLSearchParams(params as unknown as Record<string, string>).toString();
    return this.request<{ name: string; revenue: number; quantity: number; orders: number }[]>(
      `/api/dashboard/top-products?${qs}`,
    );
  }
}

export const api = new ApiClient();
