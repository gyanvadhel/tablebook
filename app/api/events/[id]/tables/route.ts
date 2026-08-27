import { NextRequest, NextResponse } from 'next/server';
import { dbGet, dbAll, withTransaction } from '@/lib/db';
import { Units } from '@/lib/units';
import { ELEMENT_OUTSIDE_MARGIN_FT } from '@/lib/constants';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const eventId = parseInt(params.id);
    if (isNaN(eventId)) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    const tables = await dbAll('SELECT * FROM tables WHERE event_id = $1 ORDER BY id ASC', [eventId]);
    return NextResponse.json(tables);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch tables' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const eventId = parseInt(params.id);
    const body = await req.json();
    const { tables, hall_elements, hall_width, hall_height, hall_rotation, name, venue } = body;

    if (!Array.isArray(tables)) {
      return NextResponse.json({ error: 'Tables array is required' }, { status: 400 });
    }

    const event = await dbGet('SELECT * FROM events WHERE id = $1', [eventId]);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const currentHallW = hall_width ? Units.clampHallFt(hall_width, event.hall_width) : event.hall_width;
    const currentHallH = hall_height ? Units.clampHallFt(hall_height, event.hall_height) : event.hall_height;
    const currentRotation = Number.isInteger(hall_rotation) ? (hall_rotation % 360) : (event.hall_rotation || 0);
    const elementsJson = Array.isArray(hall_elements)
      ? JSON.stringify(hall_elements)
      : event.hall_elements
      ? JSON.stringify(event.hall_elements)
      : '[]';

    const roomBadge = Array.isArray(hall_elements) ? hall_elements.find((el: any) => el.type === 'room_badge') : null;
    const eventName =
      (name && name.trim()) ||
      (roomBadge && (roomBadge.label || roomBadge.text) ? String(roomBadge.label || roomBadge.text).trim() : event.name);
    const eventVenue = venue !== undefined ? venue : event.venue;

    const updated = await withTransaction(async (client) => {
      await client.query(
        `
        UPDATE events SET
          name = $1,
          venue = $2,
          hall_width = $3,
          hall_height = $4,
          hall_rotation = $5,
          hall_elements = $6::jsonb
        WHERE id = $7
      `,
        [eventName, eventVenue, currentHallW, currentHallH, currentRotation, elementsJson, eventId]
      );

      const keptNumbers: string[] = [];
      let maxCanvasW = currentHallW;
      let maxCanvasH = currentHallH;
      let minCanvasX = 0;

      if (Array.isArray(hall_elements)) {
        hall_elements.forEach((el: any) => {
          if (el.type === 'hall_room' && el.x !== undefined && el.width !== undefined) {
            const rightEdge = (el.x || 0) + (el.width || 30);
            const bottomEdge = (el.y || 0) + (el.height || 20);
            if (rightEdge > maxCanvasW) maxCanvasW = rightEdge;
            if (bottomEdge > maxCanvasH) maxCanvasH = bottomEdge;
            if (el.x < minCanvasX) minCanvasX = el.x;
          }
        });
      }

      for (const t of tables) {
        const tableNum = String(t.table_number || '').trim();
        if (!tableNum) continue;

        const width = Units.clampStallFt(t.width, Units.DEFAULT_STALL_WIDTH_FT);
        const height = Units.clampStallFt(t.height, Units.DEFAULT_STALL_HEIGHT_FT);
        const rot = Number(t.rotation || 0) % 360;
        const isRot90 = rot === 90 || rot === 270;

        const effectiveW = isRot90 ? height : width;
        const effectiveH = isRot90 ? width : height;

        const clampedX = Math.max(minCanvasX - ELEMENT_OUTSIDE_MARGIN_FT, Math.min(maxCanvasW + ELEMENT_OUTSIDE_MARGIN_FT - effectiveW, Number(t.x) || 0));
        const clampedY = Math.max(-ELEMENT_OUTSIDE_MARGIN_FT, Math.min(maxCanvasH + ELEMENT_OUTSIDE_MARGIN_FT - effectiveH, Number(t.y) || 0));

        const existing = await client.query('SELECT * FROM tables WHERE event_id = $1 AND table_number = $2', [eventId, tableNum]);

        if (existing.rows.length > 0) {
          const current = existing.rows[0];
          const status = current.status === 'booked' ? 'booked' : t.status || 'available';

          await client.query(
            `
            UPDATE tables SET
              label = $1,
              size = $2,
              price = $3,
              x = $4,
              y = $5,
              width = $6,
              height = $7,
              rotation = $8,
              shape = $9,
              status = $10
            WHERE id = $11
          `,
            [
              t.label || '',
              t.size || 'medium',
              parseFloat(t.price) || 0,
              Units.roundFt(clampedX),
              Units.roundFt(clampedY),
              width,
              height,
              rot,
              t.shape || 'rect',
              status,
              current.id,
            ]
          );
        } else {
          await client.query(
            `
            INSERT INTO tables (
              event_id, table_number, label, size, price, x, y, width, height, rotation, shape, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          `,
            [
              eventId,
              tableNum,
              t.label || '',
              t.size || 'medium',
              parseFloat(t.price) || 0,
              Units.roundFt(clampedX),
              Units.roundFt(clampedY),
              width,
              height,
              rot,
              t.shape || 'rect',
              t.status || 'available',
            ]
          );
        }

        keptNumbers.push(tableNum);
      }

      if (keptNumbers.length > 0) {
        await client.query(
          `
          DELETE FROM tables
          WHERE event_id = $1
            AND table_number != ALL($2::text[])
            AND status != 'booked'
        `,
          [eventId, keptNumbers]
        );
      } else {
        await client.query("DELETE FROM tables WHERE event_id = $1 AND status != 'booked'", [eventId]);
      }

      const allTables = await client.query('SELECT * FROM tables WHERE event_id = $1 ORDER BY id ASC', [eventId]);
      const updatedEvent = await client.query('SELECT * FROM events WHERE id = $1', [eventId]);

      return {
        tables: allTables.rows,
        event: updatedEvent.rows[0],
      };
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error('Tables POST save error:', err);
    return NextResponse.json({ error: err.message || 'Failed to save layout' }, { status: 500 });
  }
}
