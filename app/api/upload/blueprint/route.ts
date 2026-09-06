import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * SVG is deliberately absent. An uploaded .svg is served from our own origin
 * at /uploads/<name>.svg, and opening it there executes any <script> it
 * carries — a stored XSS with a live admin session attached. Raster only.
 */
const ACCEPTED: Record<string, { ext: string; sniff: (b: Buffer) => boolean }> = {
  png: {
    ext: '.png',
    sniff: (b) => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  jpeg: {
    ext: '.jpg',
    sniff: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  gif: {
    ext: '.gif',
    sniff: (b) => b.length > 6 && b.subarray(0, 4).toString('latin1') === 'GIF8',
  },
  webp: {
    ext: '.webp',
    sniff: (b) =>
      b.length > 12 &&
      b.subarray(0, 4).toString('latin1') === 'RIFF' &&
      b.subarray(8, 12).toString('latin1') === 'WEBP',
  },
};

/** Identify by content, not by the name the browser claimed. */
function detectFormat(bytes: Buffer): { key: string; ext: string } | null {
  for (const [key, spec] of Object.entries(ACCEPTED)) {
    if (spec.sniff(bytes)) return { key, ext: spec.ext };
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('blueprint');

    if (!file || typeof file === 'string' || !(file as File).size) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const upload = file as File;

    if (upload.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `That image is ${(upload.size / 1024 / 1024).toFixed(1)} MB. The limit is 10 MB.` },
        { status: 413 }
      );
    }

    const bytes = Buffer.from(await upload.arrayBuffer());
    const format = detectFormat(bytes);

    if (!format) {
      return NextResponse.json(
        { error: 'That file is not a PNG, JPG, GIF, or WEBP image. Export your floor plan as PNG and try again.' },
        { status: 415 }
      );
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const safeName = `blueprint_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${format.ext}`;

    try {
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true });
      }
      await writeFile(path.join(uploadsDir, safeName), bytes);
    } catch (err: any) {
      // Serverless filesystems (Vercel, Lambda) are read-only outside /tmp,
      // and /tmp does not survive a cold start. Say so instead of 500-ing.
      if (err?.code === 'EROFS' || err?.code === 'EACCES' || err?.code === 'EPERM') {
        return NextResponse.json(
          {
            error:
              'This deployment has a read-only filesystem, so uploads cannot be stored here. ' +
              'Host the blueprint image elsewhere and paste its URL instead.',
          },
          { status: 501 }
        );
      }
      throw err;
    }

    return NextResponse.json({
      url: `/uploads/${safeName}`,
      filename: safeName,
      format: format.key,
      bytes: bytes.length,
    });
  } catch (err: any) {
    console.error('Blueprint upload error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to upload blueprint' }, { status: 500 });
  }
}
