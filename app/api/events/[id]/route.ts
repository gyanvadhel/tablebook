import { NextRequest, NextResponse } from 'next/server';
import { dbGet, dbRun } from '@/lib/db';
import { Units } from '@/lib/units';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const eventId = parseInt(params.id);
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

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const eventId = parseInt(params.id);
    const body = await req.json();
    const { name, description, venue, start_date, end_date, status, hall_width, hall_height } = body;

    const existing = await dbGet('SELECT * FROM events WHERE id = $1', [eventId]);
    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const w = hall_width ? Units.clampHallFt(hall_width, existing.hall_width) : existing.hall_width;
    const h = hall_height ? Units.clampHallFt(hall_height, existing.hall_height) : existing.hall_height;

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
        hall_height = $8
      WHERE id = $9
      RETURNING *
    `,
      [name, description, venue, start_date || null, end_date || null, status, w, h, eventId]
    );

    return NextResponse.json(result.row);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const eventId = parseInt(params.id);
    await dbRun('DELETE FROM events WHERE id = $1', [eventId]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete event' }, { status: 500 });
  }
}
