/**
 * Image URLs we are willing to render — client-safe, no database imports.
 *
 * Anything that ends up in an <img src> or an SVG <image href> passes through
 * here first, so a `javascript:` URL can never be stored or drawn.
 */

export function isSafeImageUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  // Site-relative path, e.g. /api/uploads/12.jpg
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return true;

  if (/^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.test(trimmed)) return true;

  try {
    const proto = new URL(trimmed).protocol.toLowerCase();
    return proto === 'http:' || proto === 'https:';
  } catch {
    return false;
  }
}

/** Trim and validate down to something storable, or null. */
export function sanitizeImageUrl(url: unknown): string | null {
  if (url === null || url === undefined) return null;
  const trimmed = String(url).trim();
  if (!trimmed) return null;
  return isSafeImageUrl(trimmed) ? trimmed : null;
}
