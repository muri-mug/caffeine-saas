// HTTP client para a API Loyverse com rate limiting e retry
// Encapsula todos os detalhes HTTP — só o LoyverseProvider usa este arquivo

const BASE_URL = 'https://api.loyverse.com/v1.0';
const RATE_LIMIT_DELAY_MS = 1100; // ~54 req/min (seguro abaixo do limite de 60)
const MAX_RETRIES = 3;

export interface LoyversePaginatedResponse<T> {
  cursor?: string;
  [key: string]: unknown;
  // O campo de dados varia por endpoint (receipts, items, shifts, etc.)
}

export class LoyverseClient {
  private lastRequestAt = 0;

  constructor(private readonly accessToken: string) {}

  async get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') url.searchParams.set(k, v);
    }

    await this.throttle();

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.status === 429) {
        // Rate limit — esperar e tentar de novo
        const retryAfter = parseInt(res.headers.get('Retry-After') ?? '60', 10);
        await sleep(retryAfter * 1000);
        continue;
      }

      if (!res.ok) {
        const body = await res.text();
        throw new LoyverseApiError(res.status, path, body);
      }

      return res.json() as Promise<T>;
    }

    throw new LoyverseApiError(429, path, 'Rate limit excedido após retries');
  }

  /** Itera automaticamente sobre páginas usando cursor */
  async *paginate<T>(
    path: string,
    dataKey: string,
    params: Record<string, string> = {},
  ): AsyncGenerator<T> {
    let cursor: string | undefined;

    do {
      const queryParams = { ...params, ...(cursor ? { cursor } : {}) };
      const page = await this.get<Record<string, unknown>>(path, queryParams);
      const items = (page[dataKey] as T[]) ?? [];

      for (const item of items) {
        yield item;
      }

      cursor = page['cursor'] as string | undefined;
    } while (cursor);
  }

  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestAt;
    if (elapsed < RATE_LIMIT_DELAY_MS) {
      await sleep(RATE_LIMIT_DELAY_MS - elapsed);
    }
    this.lastRequestAt = Date.now();
  }
}

export class LoyverseApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly path: string,
    public readonly body: string,
  ) {
    super(`Loyverse API ${statusCode} em ${path}: ${body}`);
    this.name = 'LoyverseApiError';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
