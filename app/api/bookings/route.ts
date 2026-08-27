import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbGet, withTransaction } from '@/lib/db';
import { getSession } from '@/lib/auth';

function generateReferenceCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'TB-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');
    const status = searchParams.get('status');

    let sql = `
      SELECT b.*,
             t.table_number, t.label AS table_label, t.price AS table_price,
             t.size AS table_size, t.width AS table_width, t.height AS table_height,
             e.name AS event_name, e.venue AS event_venue, e.start_date AS event_date
      FROM bookings b
      JOIN tables t ON b.table_id = t.id
      JOIN events e ON b.event_id = e.id
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (eventId) {
      conditions.push(`b.event_id = $${params.length + 1}`);
      params.push(parseInt(eventId));
    }
    if (status) {
      conditions.push(`b.status = $${params.length + 1}`);
      params.push(status);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(' AND ');
    }

    sql += ` ORDER BY b.booked_at DESC`;

    const bookings = await dbAll(sql, params);
    return NextResponse.json(bookings);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch bookings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { table_id, customer_name, customer_phone, customer_email = '', business_name = '', notes = '' } = body;

    if (!table_id || !customer_name || !customer_phone) {
      return NextResponse.json({ error: 'Table ID, customer name, and phone number are required' }, { status: 400 });
    }

    const booking = await withTransaction(async (client) => {
      const tableRes = await client.query('SELECT * FROM tables WHERE id = $1 FOR UPDATE', [table_id]);
      if (tableRes.rows.length === 0) {
        throw new Error('Table not found');
      }

      const table = tableRes.rows[0];
      if (table.status !== 'available') {
        throw new Error('This stall is no longer available');
      }

      let code = generateReferenceCode();
      let isUnique = false;
      while (!isUnique) {
        const existing = await client.query('SELECT id FROM bookings WHERE reference_code = $1', [code]);
        if (existing.rows.length === 0) isUnique = true;
        else code = generateReferenceCode();
      }

      const insertRes = await client.query(
        `
        INSERT INTO bookings (
          table_id, event_id, reference_code, customer_name,
          customer_phone, customer_email, business_name, notes, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'confirmed')
        RETURNING *
      `,
        [table.id, table.event_id, code, customer_name.trim(), customer_phone.trim(), customer_email.trim(), business_name.trim(), notes.trim()]
      );

      await client.query("UPDATE tables SET status = 'booked' WHERE id = $1", [table.id]);

      const eventRes = await client.query('SELECT name, venue, start_date FROM events WHERE id = $1', [table.event_id]);
      const event = eventRes.rows[0] || {};

      return {
        ...insertRes.rows[0],
        table_number: table.table_number,
        table_label: table.label,
        table_price: table.price,
        table_width: table.width,
        table_height: table.height,
        event_name: event.name,
        venue: event.venue,
        event_date: event.start_date,
      };
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to complete reservation' }, { status: 400 });
  }
}
