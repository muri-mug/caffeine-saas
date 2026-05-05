import { describe, it, expect } from 'vitest';
import { cn } from '../lib/utils';

describe('cn (class name merger)', () => {
  it('merges multiple class strings', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('deduplicates conflicting Tailwind classes (last wins)', () => {
    // tailwind-merge: text-sm wins over text-lg when both are passed
    const result = cn('text-lg', 'text-sm');
    expect(result).toBe('text-sm');
  });

  it('ignores falsy values', () => {
    expect(cn('foo', false && 'bar', undefined, null, 'baz')).toBe('foo baz');
  });

  it('handles conditional class objects', () => {
    const active = true;
    const result = cn('base', active ? 'active' : 'inactive');
    expect(result).toBe('base active');
  });

  it('returns empty string when all args are falsy', () => {
    expect(cn(false, undefined, null)).toBe('');
  });
});
