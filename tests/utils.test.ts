import { describe, it, expect } from 'vitest';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

describe('formatCurrency', () => {
  it('formats rupees without decimals', () => {
    expect(formatCurrency(8000)).toMatch(/8,000/);
    expect(formatCurrency(8000)).toContain('₹');
  });

  it('treats missing or NaN amounts as zero rather than printing NaN', () => {
    expect(formatCurrency(0)).toContain('0');
    expect(formatCurrency(undefined as any)).toContain('0');
    expect(formatCurrency(NaN)).toContain('0');
  });
});

describe('formatDate', () => {
  it('formats an ISO date', () => {
    expect(formatDate('2026-09-08')).toMatch(/2026/);
  });

  it('returns an empty string for no date', () => {
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('')).toBe('');
  });

  it('passes through something it cannot parse, rather than showing "Invalid Date"', () => {
    expect(formatDate('not a date')).toBe('not a date');
  });
});

describe('cn', () => {
  it('merges conflicting tailwind classes, last one winning', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('drops falsy values', () => {
    expect(cn('a', false && 'b', undefined, 'c')).toBe('a c');
  });
});
