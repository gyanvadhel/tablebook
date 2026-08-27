const { dbAll, dbGet, withTransaction } = require('../config/database');
const Units = require('../../public/js/units');

const tableController = {
  // Admin: Get tables for an event (layout editor)
  async getTablesForEvent(req, res) {
    try {
      const eventId = parseInt(req.params.eventId);

      const tables = await dbAll(`
        SELECT t.*,
          b.customer_name AS booked_by,
          b.business_name AS booked_business,
          b.reference_code AS booking_ref
        FROM tables t
        LEFT JOIN bookings b ON b.table_id = t.id AND b.status <> 'cancelled'
        WHERE t.event_id = $1
        ORDER BY NULLIF(regexp_replace(t.table_number, '\\D', '', 'g'), '')::bigint NULLS LAST,
                 t.table_number
      `, [eventId]);

      res.json(tables);
    } catch (err) {
      console.error('Error fetching tables:', err);
      res.status(500).json({ error: 'Failed to fetch tables' });
    }
  },

  /**
   * Admin: replace an event's whole floor plan.
   *
   * Geometry arrives in feet. Stalls are matched on (event_id, table_number),
   * so the unique constraint does the de-duplicating that used to need manual
   * cleanup passes. Anything missing from the payload is removed, except
   * stalls that are already booked.
   */
  async saveLayout(req, res) {
    try {
      const { tables, hall_elements, hall_width, hall_height, hall_rotation } = req.body;
      const eventId = parseInt(req.params.eventId);

      if (!Array.isArray(tables)) {
        return res.status(400).json({ error: 'Tables array is required' });
      }

      const event = await dbGet('SELECT * FROM events WHERE id = $1', [eventId]);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      const currentHallW = hall_width ? Units.clampHallFt(hall_width, event.hall_width) : event.hall_width;
      const currentHallH = hall_height ? Units.clampHallFt(hall_height, event.hall_height) : event.hall_height;
      const currentRotation = Number.isInteger(hall_rotation) ? (hall_rotation % 360) : (event.hall_rotation || 0);
      const elementsJson = Array.isArray(hall_elements) ? JSON.stringify(hall_elements) : (event.hall_elements ? JSON.stringify(event.hall_elements) : '[]');

      // If room_badge or name is provided with a custom name, sync event name
      const roomBadge = Array.isArray(hall_elements) ? hall_elements.find(el => el.type === 'room_badge') : null;
      const eventName = (req.body.name && req.body.name.trim()) || (roomBadge && (roomBadge.label || roomBadge.text) ? String(roomBadge.label || roomBadge.text).trim() : event.name);
      const venue = req.body.venue !== undefined ? req.body.venue : event.venue;

      const updated = await withTransaction(async client => {
        // Update event name, venue, hall dimensions, rotation and architectural elements
        await client.query(`
          UPDATE events SET
            name = $1,
            venue = $2,
            hall_width = $3,
            hall_height = $4,
            hall_rotation = $5,
            hall_elements = $6::jsonb
          WHERE id = $7
        `, [eventName, venue, currentHallW, currentHallH, currentRotation, elementsJson, eventId]);

        const keptNumbers = [];
        let maxCanvasW = currentHallW;
        let maxCanvasH = currentHallH;
        let minCanvasX = 0;
        let minCanvasY = 0;

        if (Array.isArray(hall_elements)) {
          hall_elements.forEach(el => {
            if (el.type === 'hall_room') {
              const ex = parseFloat(el.x) || 0;
              const ey = parseFloat(el.y) || 0;
              const ew = parseFloat(el.width) || 30;
              const eh = parseFloat(el.height) || 20;
              if (ex < minCanvasX) minCanvasX = ex;
              if (ey < minCanvasY) minCanvasY = ey;
              if (ex + ew > maxCanvasW) maxCanvasW = ex + ew;
              if (ey + eh > maxCanvasH) maxCanvasH = ey + eh;
            }
          });
        }

        for (const t of tables) {
          const tableNumber = String(t.table_number);
          keptNumbers.push(tableNumber);

          // Clamp to the hall canvas so stalls can be placed inside any hall
          const widthFt = Units.clampStallFt(t.width, Units.DEFAULT_STALL_WIDTH_FT);
          const heightFt = Units.clampStallFt(t.height, Units.DEFAULT_STALL_HEIGHT_FT);
          const rot = ((parseInt(t.rotation, 10) || 0) % 360 + 360) % 360;
          const isRot90 = rot === 90 || rot === 270;

          const minX = isRot90 ? (heightFt - widthFt) / 2 + minCanvasX - 30 : minCanvasX - 30;
          const maxX = maxCanvasW + 30 - (isRot90 ? (widthFt + heightFt) / 2 : widthFt);
          const minY = isRot90 ? (widthFt - heightFt) / 2 + minCanvasY - 30 : minCanvasY - 30;
          const maxY = maxCanvasH + 30 - (isRot90 ? (widthFt + heightFt) / 2 : heightFt);

          const xFt = Units.roundFt(Units.clamp(Units.toFeet(t.x, 0), minX, maxX));
          const yFt = Units.roundFt(Units.clamp(Units.toFeet(t.y, 0), minY, maxY));

          await client.query(`
            INSERT INTO tables (event_id, table_number, label, size, price, x, y, width, height, rotation, shape, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (event_id, table_number) DO UPDATE SET
              label = EXCLUDED.label,
              size = EXCLUDED.size,
              price = EXCLUDED.price,
              x = EXCLUDED.x,
              y = EXCLUDED.y,
              width = EXCLUDED.width,
              height = EXCLUDED.height,
              rotation = EXCLUDED.rotation,
              shape = EXCLUDED.shape,
              -- A booked stall keeps its status no matter what the editor sends
              status = CASE WHEN tables.status = 'booked' THEN tables.status ELSE EXCLUDED.status END
          `, [
            eventId, tableNumber, t.label || '', t.size || 'medium', t.price || 0,
            xFt, yFt, widthFt, heightFt, t.rotation || 0, t.shape || 'rect',
            t.status || 'available'
          ]);
        }

        await client.query(`
          DELETE FROM tables
          WHERE event_id = $1
            AND status <> 'booked'
            AND NOT (table_number = ANY($2::text[]))
        `, [eventId, keptNumbers]);

        const { rows } = await client.query(`
          SELECT * FROM tables WHERE event_id = $1
          ORDER BY NULLIF(regexp_replace(table_number, '\\D', '', 'g'), '')::bigint NULLS LAST,
                   table_number
        `, [eventId]);

        return rows;
      });

      const updatedEvent = await dbGet('SELECT * FROM events WHERE id = $1', [eventId]);

      res.json({ message: 'Layout saved successfully', tables: updated, event: updatedEvent });
    } catch (err) {
      console.error('Error saving layout:', err);
      res.status(500).json({ error: 'Failed to save layout' });
    }
  },

  // Admin: Update single table status (block/unblock)
  async updateTableStatus(req, res) {
    try {
      const { status } = req.body;
      const id = parseInt(req.params.id);

      if (!['available', 'blocked'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Use "available" or "blocked".' });
      }

      const table = await dbGet('SELECT * FROM tables WHERE id = $1', [id]);
      if (!table) {
        return res.status(404).json({ error: 'Table not found' });
      }

      if (table.status === 'booked') {
        return res.status(400).json({ error: 'Cannot change status of a booked table. Cancel the booking first.' });
      }

      await dbGet('UPDATE tables SET status = $1 WHERE id = $2 RETURNING id', [status, id]);
      res.json({ message: 'Table status updated' });
    } catch (err) {
      console.error('Error updating table status:', err);
      res.status(500).json({ error: 'Failed to update table status' });
    }
  }
};

module.exports = tableController;
