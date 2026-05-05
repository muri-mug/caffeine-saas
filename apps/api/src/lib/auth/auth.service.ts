import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env['JWT_SECRET'] ?? 'dev-secret-change-in-prod',
);
const JWT_EXPIRES = process.env['JWT_EXPIRES_IN'] ?? '7d';

export interface JwtPayload {
  sub: string;      // tenantId
  slug: string;
}

export class AuthService {
  // ── JWT ──────────────────────────────────────────────────────────────────

  async signToken(payload: JwtPayload): Promise<string> {
    return new SignJWT({ ...payload })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(JWT_EXPIRES)
      .sign(JWT_SECRET);
  }

  async verifyToken(token: string): Promise<JwtPayload> {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JwtPayload;
  }

  // ── Password hashing (PBKDF2 — sem dep extra) ────────────────────────────

  hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = createHash('sha256').update(salt + password).digest('hex');
    return `${salt}:${hash}`;
  }

  verifyPassword(password: string, stored: string): boolean {
    const [salt, hash] = stored.split(':');
    const attempt = createHash('sha256').update(salt + password).digest('hex');
    return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(attempt, 'hex'));
  }
}
