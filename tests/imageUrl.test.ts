import { describe, it, expect } from 'vitest';
import { isSafeImageUrl, sanitizeImageUrl } from '@/lib/imageUrl';

describe('isSafeImageUrl', () => {
  it.each([
    '/api/uploads/12.jpg',
    '/uploads/legacy.png',
    'https://cdn.example.com/poster.jpg',
    'http://example.com/poster.jpg',
    'data:image/png;base64,iVBORw0KGgo=',
    'data:image/webp;base64,UklGRg==',
  ])('accepts %s', (url) => {
    expect(isSafeImageUrl(url)).toBe(true);
  });

  it.each([
    ['javascript:alert(1)', 'script execution'],
    ['JAVASCRIPT:alert(1)', 'script execution, uppercased'],
    ['vbscript:msgbox(1)', 'legacy script scheme'],
    ['file:///etc/passwd', 'local file read'],
    ['data:text/html;base64,PHNjcmlwdD4=', 'html masquerading as a data URL'],
    ['data:image/svg+xml;base64,PHN2Zz4=', 'svg, which can carry script'],
    ['//evil.example.com/x.png', 'protocol-relative, escapes our origin'],
  ])('rejects %s (%s)', (url) => {
    expect(isSafeImageUrl(url)).toBe(false);
  });

  it('rejects empty and non-string input', () => {
    expect(isSafeImageUrl('')).toBe(false);
    expect(isSafeImageUrl('   ')).toBe(false);
    expect(isSafeImageUrl(null)).toBe(false);
    expect(isSafeImageUrl(undefined)).toBe(false);
    expect(isSafeImageUrl(42)).toBe(false);
    expect(isSafeImageUrl({})).toBe(false);
  });
});

describe('sanitizeImageUrl', () => {
  it('trims surrounding whitespace', () => {
    expect(sanitizeImageUrl('  /api/uploads/3.png \n')).toBe('/api/uploads/3.png');
  });

  it('returns null instead of throwing on anything unsafe', () => {
    expect(sanitizeImageUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeImageUrl('')).toBeNull();
    expect(sanitizeImageUrl(null)).toBeNull();
    expect(sanitizeImageUrl(undefined)).toBeNull();
  });

  it('leaves a good URL untouched', () => {
    expect(sanitizeImageUrl('https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png');
  });
});
