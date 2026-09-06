/**
 * Identify a raster image by its magic bytes. CommonJS twin of the sniffer in
 * lib/uploads.ts, for the legacy Express stack.
 *
 * SVG is deliberately absent: served from our own origin it would execute any
 * script it carries against a live admin session.
 */
const FORMATS = [
  {
    key: 'png',
    ext: '.png',
    mime: 'image/png',
    sniff: b => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  },
  {
    key: 'jpeg',
    ext: '.jpg',
    mime: 'image/jpeg',
    sniff: b => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
  },
  {
    key: 'gif',
    ext: '.gif',
    mime: 'image/gif',
    sniff: b => b.length > 6 && b.subarray(0, 4).toString('latin1') === 'GIF8'
  },
  {
    key: 'webp',
    ext: '.webp',
    mime: 'image/webp',
    sniff: b =>
      b.length > 12 &&
      b.subarray(0, 4).toString('latin1') === 'RIFF' &&
      b.subarray(8, 12).toString('latin1') === 'WEBP'
  }
];

function detectImageFormat(bytes) {
  for (const f of FORMATS) {
    if (f.sniff(bytes)) return { key: f.key, ext: f.ext, mime: f.mime };
  }
  return null;
}

function sanitizeFilename(original, fallbackExt) {
  const base = String(original || 'blueprint')
    .split(/[\\/]/)
    .pop()
    .replace(/[^A-Za-z0-9._ -]+/g, '_')
    .replace(/^\.+/, '')
    .trim()
    .slice(0, 80);
  return base || `blueprint${fallbackExt}`;
}

module.exports = { detectImageFormat, sanitizeFilename };
