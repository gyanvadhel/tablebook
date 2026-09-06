import { NextRequest, NextResponse } from 'next/server';
import { loadUpload, parseUploadId } from '@/lib/uploads';

export const runtime = 'nodejs';

/**
 * GET /api/uploads/12.jpg — serve a stored image.
 *
 * Public, because the visitor map needs it. Content-Type comes from the
 * magic bytes we verified at upload time, so it is safe to serve inline with
 * sniffing disabled. Bytes under a given id never change, so the response is
 * cacheable forever and revalidates by ETag.
 */
export async function GET(req: NextRequest, { params }: { params: any }) {
  try {
    const rawParams = params && typeof params.then === 'function' ? await params : params;
    const id = parseUploadId(rawParams?.id);
    if (id === null) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const upload = await loadUpload(id);
    if (!upload) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const etag = `"${upload.sha256}"`;
    const headers: Record<string, string> = {
      'Cache-Control': 'public, max-age=31536000, immutable',
      ETag: etag,
      'X-Content-Type-Options': 'nosniff',
    };

    if (req.headers.get('if-none-match') === etag) {
      return new NextResponse(null, { status: 304, headers });
    }

    return new NextResponse(new Uint8Array(upload.data), {
      status: 200,
      headers: {
        ...headers,
        'Content-Type': upload.mime_type,
        'Content-Length': String(upload.byte_size),
        'Content-Disposition': `inline; filename="${upload.filename.replace(/"/g, '')}"`,
      },
    });
  } catch (err: any) {
    console.error('Upload fetch error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to load upload' }, { status: 500 });
  }
}
