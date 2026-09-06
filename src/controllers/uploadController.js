/**
 * Uploaded images live in Postgres (the `uploads` table) and are served from
 * /api/uploads/:id. Files on disk do not survive a serverless deploy; rows do.
 */
const crypto = require('crypto');
const { dbGet, dbRun } = require('../config/database');
const { detectImageFormat, sanitizeFilename } = require('../utils/imageFormat');

const uploadController = {
  // Admin: store a blueprint image (multer has already buffered it into req.file)
  async uploadBlueprint(req, res) {
    try {
      if (!req.file || !req.file.buffer || !req.file.buffer.length) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const bytes = req.file.buffer;
      const format = detectImageFormat(bytes);
      if (!format) {
        return res.status(415).json({
          error: 'That file is not a PNG, JPG, GIF, or WEBP image. Export your floor plan as PNG and try again.'
        });
      }

      const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
      const filename = sanitizeFilename(req.file.originalname, format.ext);

      // Identical bytes already on file? Reuse the row.
      const existing = await dbGet('SELECT id FROM uploads WHERE sha256 = $1 AND kind = $2 LIMIT 1', [sha256, 'blueprint']);
      if (existing) {
        return res.json({
          id: existing.id,
          url: `/api/uploads/${existing.id}${format.ext}`,
          filename,
          format: format.key,
          bytes: bytes.length,
          deduplicated: true
        });
      }

      const { row } = await dbRun(
        `
        INSERT INTO uploads (kind, filename, mime_type, byte_size, sha256, data)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `,
        ['blueprint', filename, format.mime, bytes.length, sha256, bytes]
      );

      res.status(201).json({
        id: row.id,
        url: `/api/uploads/${row.id}${format.ext}`,
        filename,
        format: format.key,
        bytes: bytes.length,
        deduplicated: false
      });
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).json({ error: err.message || 'Failed to store upload' });
    }
  },

  // Public: serve a stored image. "12.jpg" resolves by its leading id.
  async serveUpload(req, res) {
    try {
      const match = /^(\d+)/.exec(String(req.params.id || ''));
      const id = match ? parseInt(match[1], 10) : NaN;
      if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(404).json({ error: 'Not found' });
      }

      const row = await dbGet('SELECT filename, mime_type, byte_size, sha256, data FROM uploads WHERE id = $1', [id]);
      if (!row) {
        return res.status(404).json({ error: 'Not found' });
      }

      const etag = `"${row.sha256}"`;
      res.set({
        'Cache-Control': 'public, max-age=31536000, immutable',
        ETag: etag,
        'X-Content-Type-Options': 'nosniff'
      });

      if (req.headers['if-none-match'] === etag) {
        return res.status(304).end();
      }

      res
        .type(row.mime_type)
        .set('Content-Length', String(row.byte_size))
        .set('Content-Disposition', `inline; filename="${String(row.filename).replace(/"/g, '')}"`)
        .send(row.data);
    } catch (err) {
      console.error('Upload fetch error:', err);
      res.status(500).json({ error: err.message || 'Failed to load upload' });
    }
  }
};

module.exports = uploadController;
