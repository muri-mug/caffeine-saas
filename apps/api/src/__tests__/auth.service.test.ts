import { describe, it, expect } from 'vitest';
import { AuthService } from '../lib/auth/auth.service.js';

const auth = new AuthService();

describe('AuthService — password hashing', () => {
  it('hashPassword produces a salt:hash string', () => {
    const stored = auth.hashPassword('mypassword');
    const parts = stored.split(':');
    expect(parts).toHaveLength(2);
    expect(parts[0]).toHaveLength(32); // salt hex (16 bytes)
    expect(parts[1]).toHaveLength(64); // sha256 hex
  });

  it('verifyPassword returns true for the correct password', () => {
    const stored = auth.hashPassword('sarta123');
    expect(auth.verifyPassword('sarta123', stored)).toBe(true);
  });

  it('verifyPassword returns false for a wrong password', () => {
    const stored = auth.hashPassword('sarta123');
    expect(auth.verifyPassword('wrongpassword', stored)).toBe(false);
  });

  it('same password produces different hashes (random salt)', () => {
    const h1 = auth.hashPassword('samepassword');
    const h2 = auth.hashPassword('samepassword');
    expect(h1).not.toBe(h2);
    // Both must still verify correctly
    expect(auth.verifyPassword('samepassword', h1)).toBe(true);
    expect(auth.verifyPassword('samepassword', h2)).toBe(true);
  });
});

describe('AuthService — JWT', () => {
  it('signToken returns a JWT string', async () => {
    const token = await auth.signToken({ sub: 'tenant-id-123', slug: 'sarta-coffee' });
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // header.payload.signature
  });

  it('verifyToken returns the original payload', async () => {
    const payload = { sub: 'tenant-id-123', slug: 'sarta-coffee' };
    const token = await auth.signToken(payload);
    const decoded = await auth.verifyToken(token);
    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.slug).toBe(payload.slug);
  });

  it('verifyToken throws for a tampered token', async () => {
    const token = await auth.signToken({ sub: 'abc', slug: 'test' });
    const tampered = token.slice(0, -4) + 'XXXX';
    await expect(auth.verifyToken(tampered)).rejects.toThrow();
  });

  it('verifyToken throws for a completely invalid token', async () => {
    await expect(auth.verifyToken('not.a.token')).rejects.toThrow();
  });
});
