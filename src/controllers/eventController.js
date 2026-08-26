const { dbAll, dbGet, dbRun } = require('../config/database');
const Units = require('../../public/js/units');

// Hall sizes are stored and exchanged in feet
const EVENT_COUNTS = `
  (SELECT COUNT(*) FROM tables WHERE event_id = e.id) AS total_tables,
  (SELECT COUNT(*) FROM tables WHERE event_id = e.id AND status = 'available') AS available_tables
`;

const eventController = {
  // Public: Get all active events
  async getActiveEvents(req, res) {
    try {
      const events = await dbAll(`
        SELECT e.*, ${EVENT_COUNTS}
        FROM events e
        WHERE e.status = 'active'
        ORDER BY e.start_date ASC NULLS LAST
      `);
      res.json(events);
    } catch (err) {
      console.error('Error fetching events:', err);
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  },

  // Public: Get single event with tables
  async getEventWithTables(req, res) {
    try {
      const id = parseInt(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid event id' });
      }

      const event = await dbGet(`
        SELECT e.*, ${EVENT_COUNTS}
        FROM events e WHERE e.id = $1
      `, [id]);

      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Sort numerically when the stall number is a number, alphabetically otherwise
      const tables = await dbAll(`
        SELECT t.*,
          b.customer_name AS booked_by,
          b.business_name AS booked_business
        FROM tables t
        LEFT JOIN bookings b ON b.table_id = t.id AND b.status <> 'cancelled'
        WHERE t.event_id = $1
        ORDER BY NULLIF(regexp_replace(t.table_number, '\\D', '', 'g'), '')::bigint NULLS LAST,
                 t.table_number
      `, [id]);

      res.json({ event, tables });
    } catch (err) {
      console.error('Error fetching event:', err);
      res.status(500).json({ error: 'Failed to fetch event' });
    }
  },

  // Admin: Get all events (any status)
  async getAllEvents(req, res) {
    try {
      const events = await dbAll(`
        SELECT e.*, ${EVENT_COUNTS},
          (SELECT COUNT(*) FROM bookings WHERE event_id = e.id AND status <> 'cancelled') AS total_bookings
        FROM events e
        ORDER BY e.created_at DESC
      `);
      res.json(events);
    } catch (err) {
      console.error('Error fetching all events:', err);
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  },

  // Admin: Create event
  async createEvent(req, res) {
    try {
      const { name, description, venue, start_date, end_date, status, hall_width, hall_height, hall_elements, hall_rotation } = req.body;

      if (!name || !String(name).trim()) {
        return res.status(400).json({ error: 'Event name is required' });
      }

      // hall_width / hall_height arrive in feet
      const hallWidthFt = Units.clampHallFt(hall_width, Units.DEFAULT_HALL_WIDTH_FT);
      const hallHeightFt = Units.clampHallFt(hall_height, Units.DEFAULT_HALL_HEIGHT_FT);
      const elementsJson = Array.isArray(hall_elements) ? JSON.stringify(hall_elements) : '[]';
      const rotation = Number.isInteger(hall_rotation) ? (hall_rotation % 360) : 0;

      const { row } = await dbRun(`
        INSERT INTO events (name, description, venue, start_date, end_date, status, hall_width, hall_height, hall_elements, hall_rotation)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
        RETURNING *
      `, [
        String(name).trim(), description || '', venue || '',
        start_date || null, end_date || null, status || 'draft',
        hallWidthFt, hallHeightFt, elementsJson, rotation
      ]);

      res.status(201).json(row);
    } catch (err) {
      console.error('Error creating event:', err);
      res.status(500).json({ error: 'Failed to create event' });
    }
  },

  // Admin: Update event
  async updateEvent(req, res) {
    try {
      const { name, description, venue, start_date, end_date, status, hall_width, hall_height, hall_elements, hall_rotation } = req.body;
      const id = parseInt(req.params.id);

      const existing = await dbGet('SELECT * FROM events WHERE id = $1', [id]);
      if (!existing) {
        return res.status(404).json({ error: 'Event not found' });
      }

      const elementsJson = hall_elements !== undefined ? (Array.isArray(hall_elements) ? JSON.stringify(hall_elements) : '[]') : (existing.hall_elements ? JSON.stringify(existing.hall_elements) : '[]');
      const rotation = hall_rotation !== undefined ? (Number(hall_rotation) % 360) : (existing.hall_rotation || 0);

      const { row } = await dbRun(`
        UPDATE events SET
          name = $1, description = $2, venue = $3, start_date = $4, end_date = $5,
          status = $6, hall_width = $7, hall_height = $8,
          hall_elements = $9::jsonb, hall_rotation = $10
        WHERE id = $11
        RETURNING *
      `, [
        name || existing.name,
        description !== undefined ? description : existing.description,
        venue !== undefined ? venue : existing.venue,
        start_date || existing.start_date,
        end_date || existing.end_date,
        status || existing.status,
        Units.clampHallFt(hall_width, existing.hall_width),
        Units.clampHallFt(hall_height, existing.hall_height),
        elementsJson,
        rotation,
        id
      ]);

      res.json(row);
    } catch (err) {
      console.error('Error updating event:', err);
      res.status(500).json({ error: 'Failed to update event' });
    }
  },

  // Admin: Delete event — tables and bookings cascade
  async deleteEvent(req, res) {
    try {
      const id = parseInt(req.params.id);
      const { rowCount } = await dbRun('DELETE FROM events WHERE id = $1', [id]);

      if (!rowCount) {
        return res.status(404).json({ error: 'Event not found' });
      }

      res.json({ message: 'Event deleted successfully' });
    } catch (err) {
      console.error('Error deleting event:', err);
      res.status(500).json({ error: 'Failed to delete event' });
    }
  }
};

module.exports = eventController;
