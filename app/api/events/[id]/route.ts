import { NextRequest, NextResponse } from 'next/server';
import { dbGet, dbRun, withTransaction } from '@/lib/db';
import { Units } from '@/lib/units';
import { normalizeBlueprint, sanitizeBlueprintUrl } from '@/lib/blueprint';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: any }) {
  try {
    const rawParams = params && typeof params.then === 'function' ? await params : params;
    const eventId = parseInt(rawParams?.id);
    if (isNaN(eventId)) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    const event = await dbGet('SELECT * FROM events WHERE id = $1', [eventId]);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch event' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: any }) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawParams = params && typeof params.then === 'function' ? await params : params;
    const eventId = parseInt(rawParams?.id);
    if (isNaN(eventId)) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    const body = await req.json();
    const {
      name,
      description,
      venue,
      start_date,
      end_date,
      status,
      hall_width,
      hall_height,
      hall_background_image,
      hall_blueprint,
    } = body;

    const existing = await dbGet('SELECT * FROM events WHERE id = $1', [eventId]);
    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const w = hall_width ? Units.clampHallFt(hall_width, existing.hall_width) : existing.hall_width;
    const h = hall_height ? Units.clampHallFt(hall_height, existing.hall_height) : existing.hall_height;

    const bgImg =
      hall_background_image !== undefined
        ? sanitizeBlueprintUrl(hall_background_image)
        : sanitizeBlueprintUrl(existing.hall_background_image);

    const blueprintJson = bgImg
      ? JSON.stringify(
          normalizeBlueprint(hall_blueprint !== undefined ? hall_blueprint : existing.hall_blueprint, w, h)
        )
      : null;

    const result = await dbRun(
      `
      UPDATE events SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        venue = COALESCE($3, venue),
        start_date = $4,
        end_date = $5,
        status = COALESCE($6, status),
        hall_width = $7,
        hall_height = $8,
        hall_background_image = $9,
        hall_blueprint = $10::jsonb
      WHERE id = $11
      RETURNING *
    `,
      [name, description, venue, start_date || null, end_date || null, status, w, h, bgImg, blueprintJson, eventId]
    );

    return NextResponse.json(result.row);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: any }) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawParams = params && typeof params.then === 'function' ? await params : params;
    const eventId = parseInt(rawParams?.id);
    if (isNaN(eventId)) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    await withTransaction(async (client) => {
      await client.query('DELETE FROM bookings WHERE event_id = $1', [eventId]);
      await client.query('DELETE FROM tables WHERE event_id = $1', [eventId]);
      await client.query('DELETE FROM events WHERE id = $1', [eventId]);
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Delete event error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete event' }, { status: 500 });
  }
}
