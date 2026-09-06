import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { storeUpload, isUploadKind, UPLOAD_KINDS, UPLOAD_MAX_BYTES } from '@/lib/uploads';

export const runtime = 'nodejs';

/**
 * POST /api/uploads — store an image and get back a URL that works on every
 * deployment, because the bytes go into Postgres rather than onto a disk.
 *
 * Multipart form with the file under `file` (or the older `blueprint`) and an
 * optional `kind` of "blueprint" (default) or "poster".
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const field = formData.get('file') ?? formData.get('blueprint');

    if (!field || typeof field === 'string' || !(field as File).size) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const kindField = formData.get('kind');
    const kind = typeof kindField === 'string' && kindField.trim() ? kindField.trim() : 'blueprint';
    if (!isUploadKind(kind)) {
      return NextResponse.json({ error: `kind must be one of: ${UPLOAD_KINDS.join(', ')}` }, { status: 400 });
    }

    const file = field as File;

    if (file.size > UPLOAD_MAX_BYTES) {
      return NextResponse.json(
        { error: `That image is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${UPLOAD_MAX_BYTES / 1024 / 1024} MB.` },
        { status: 413 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const stored = await storeUpload(bytes, file.name, kind);

    return NextResponse.json(stored, { status: stored.deduplicated ? 200 : 201 });
  } catch (err: any) {
    if (err?.status === 415) {
      return NextResponse.json(
        { error: 'That file is not a PNG, JPG, GIF, or WEBP image. Export your floor plan as PNG and try again.' },
        { status: 415 }
      );
    }
    console.error('Upload error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to store upload' }, { status: 500 });
  }
}
