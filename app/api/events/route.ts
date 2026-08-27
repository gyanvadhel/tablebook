import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbGet, dbRun } from '@/lib/db';
import { Units } from '@/lib/units';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    let sql = `
      SELECT e.*,
        COUNT(t.id) AS total_tables,
        COUNT(CASE WHEN t.status = 'booked' THEN 1 END) AS booked_tables,
        COUNT(CASE WHEN t.status = 'available' THEN 1 END) AS available_tables
      FROM events e
      LEFT JOIN tables t ON e.id = t.event_id
    `;
    const params: any[] = [];

    if (status) {
      sql += ` WHERE e.status = $1`;
      params.push(status);
    }

    sql += ` GROUP BY e.id ORDER BY e.created_at DESC`;

    const events = await dbAll(sql, params);
    return NextResponse.json(events);
  } catch (err: any) {
    console.error('Events GET error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description = '', venue = '', start_date = null, end_date = null, hall_width = 80, hall_height = 55 } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Event name is required' }, { status: 400 });
    }

    const w = Units.clampHallFt(hall_width, 80);
    const h = Units.clampHallFt(hall_height, 55);

    const initialBadge = [
      {
        id: 'room_badge_main',
        type: 'room_badge',
        label: name.trim(),
        x: 1.5,
        y: 1.5,
        width: 8,
        height: 3,
        rotation: 0,
      },
    ];

    const result = await dbRun(
      `
      INSERT INTO events (name, description, venue, start_date, end_date, hall_width, hall_height, hall_elements, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, 'draft')
      RETURNING *
    `,
      [name.trim(), description, venue, start_date || null, end_date || null, w, h, JSON.stringify(initialBadge)]
    );

    return NextResponse.json(result.row, { status: 201 });
  } catch (err: any) {
    console.error('Event POST error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create event' }, { status: 500 });
  }
}
