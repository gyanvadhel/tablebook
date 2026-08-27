import { NextRequest, NextResponse } from 'next/server';
import { withTransaction } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bookingId = parseInt(params.id);
    const { status } = await req.json();

    if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updated = await withTransaction(async (client) => {
      const bRes = await client.query('SELECT * FROM bookings WHERE id = $1', [bookingId]);
      if (bRes.rows.length === 0) {
        throw new Error('Booking not found');
      }
      const booking = bRes.rows[0];

      const updateRes = await client.query(
        'UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *',
        [status, bookingId]
      );

      if (status === 'cancelled') {
        await client.query("UPDATE tables SET status = 'available' WHERE id = $1", [booking.table_id]);
      } else if (status === 'confirmed') {
        await client.query("UPDATE tables SET status = 'booked' WHERE id = $1", [booking.table_id]);
      }

      return updateRes.rows[0];
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update booking' }, { status: 500 });
  }
}
