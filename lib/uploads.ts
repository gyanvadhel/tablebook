/**
 * Uploaded images live in Postgres, in the `uploads` table, and are served
 * back by /api/uploads/[id]. That is deliberate: this app deploys to Vercel,
 * whose filesystem is read-only and thrown away on every cold start, so a
 * file written to public/uploads/ simply does not exist in production.
 *
 * Keeping the bytes next to the rest of the data means one DATABASE_URL is
 * the whole configuration, locally and in production alike.
 */
import { createHash } from 'crypto';
import { dbGet, dbRun } from '@/lib/db';

export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

/** What an upload is for. Dedup is per kind, so a poster and a blueprint never share a row. */
export const UPLOAD_KINDS = ['blueprint', 'poster'] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];

export function isUploadKind(value: unknown): value is UploadKind {
  return typeof value === 'string' && (UPLOAD_KINDS as readonly string[]).includes(value);
}

export interface ImageFormat {
  key: 'png' | 'jpeg' | 'gif' | 'webp';
  ext: string;
  mime: string;
}

/**
 * SVG is deliberately absent. Served from our own origin, an uploaded .svg
 * executes any <script> it carries with a live admin session attached — a
 * stored XSS. Raster formats only.
 */
const FORMATS: Array<ImageFormat & { sniff: (b: Buffer) => boolean }> = [
  {
    key: 'png',
    ext: '.png',
    mime: 'image/png',
    sniff: (b) => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    key: 'jpeg',
    ext: '.jpg',
    mime: 'image/jpeg',
    sniff: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    key: 'gif',
    ext: '.gif',
    mime: 'image/gif',
    sniff: (b) => b.length > 6 && b.subarray(0, 4).toString('latin1') === 'GIF8',
  },
  {
    key: 'webp',
    ext: '.webp',
    mime: 'image/webp',
    sniff: (b) =>
      b.length > 12 &&
      b.subarray(0, 4).toString('latin1') === 'RIFF' &&
      b.subarray(8, 12).toString('latin1') === 'WEBP',
  },
];

/** Identify an image by its content, never by the name the browser claimed. */
export function detectImageFormat(bytes: Buffer): ImageFormat | null {
  for (const f of FORMATS) {
    if (f.sniff(bytes)) return { key: f.key, ext: f.ext, mime: f.mime };
  }
  return null;
}

/** Keep a display-friendly version of the original name; never trust it as a path. */
export function sanitizeFilename(original: string | undefined, fallbackExt: string): string {
  const cleaned = (original || '')
    .split(/[\\/]/)
    .pop()!
    .replace(/[^A-Za-z0-9._ -]+/g, '_')
    .replace(/^\.+/, '')
    .trim()
    .slice(0, 80);
  // Falling back here rather than earlier keeps the extension on the default
  // name; defaulting to a bare "blueprint" up front skipped it entirely.
  return cleaned || `blueprint${fallbackExt}`;
}

/** Public URL for a stored upload. The extension is cosmetic — the id is what resolves. */
export function uploadUrl(id: number, ext: string): string {
  return `/api/uploads/${id}${ext}`;
}

/** "12.jpg" → 12. Anything that does not start with digits is not an id. */
export function parseUploadId(segment: string | undefined): number | null {
  const match = /^(\d+)/.exec(segment || '');
  if (!match) return null;
  const id = parseInt(match[1], 10);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export interface StoredUpload {
  id: number;
  url: string;
  filename: string;
  format: ImageFormat['key'];
  bytes: number;
  /** True when identical bytes were already on file and were reused. */
  deduplicated: boolean;
}

/**
 * Persist an image, or hand back the existing row if these exact bytes are
 * already stored. Re-uploading the same floor plan five times should cost one
 * row, not five.
 */
export async function storeUpload(bytes: Buffer, originalName: string | undefined, kind: UploadKind = 'blueprint'): Promise<StoredUpload> {
  const format = detectImageFormat(bytes);
  if (!format) {
    throw Object.assign(new Error('Not a PNG, JPG, GIF, or WEBP image'), { status: 415 });
  }

  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const filename = sanitizeFilename(originalName, format.ext);

  const existing = await dbGet<{ id: number }>('SELECT id FROM uploads WHERE sha256 = $1 AND kind = $2 LIMIT 1', [sha256, kind]);
  if (existing) {
    return { id: existing.id, url: uploadUrl(existing.id, format.ext), filename, format: format.key, bytes: bytes.length, deduplicated: true };
  }

  const { row } = await dbRun(
    `
    INSERT INTO uploads (kind, filename, mime_type, byte_size, sha256, data)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id
  `,
    [kind, filename, format.mime, bytes.length, sha256, bytes]
  );

  return { id: row.id, url: uploadUrl(row.id, format.ext), filename, format: format.key, bytes: bytes.length, deduplicated: false };
}

export interface LoadedUpload {
  filename: string;
  mime_type: string;
  byte_size: number;
  sha256: string;
  data: Buffer;
}

export async function loadUpload(id: number): Promise<LoadedUpload | null> {
  return dbGet<LoadedUpload>('SELECT filename, mime_type, byte_size, sha256, data FROM uploads WHERE id = $1', [id]);
}
