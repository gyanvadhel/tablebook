const { dbAll, dbGet, dbRun, withTransaction } = require('../config/database');
const { generateReferenceCode, isValidPhone, isValidEmail } = require('../utils/helpers');

const bookingController = {
  /**
   * Public: reserve a stall.
   *
   * The claim runs in one transaction and flips the stall with a conditional
   * UPDATE, so two people clicking the same stall at the same moment cannot
   * both walk away with it.
   */
  async createBooking(req, res) {
    try {
      const { table_id, event_id, customer_name, customer_phone, customer_email, business_name, notes } = req.body;

      if (!table_id || !event_id || !customer_name || !customer_phone) {
        return res.status(400).json({ error: 'Table, event, name, and phone are required' });
      }
      if (!isValidPhone(customer_phone)) {
        return res.status(400).json({ error: 'Please enter a valid phone number' });
      }
      if (customer_email && !isValidEmail(customer_email)) {
        return res.status(400).json({ error: 'Please enter a valid email address' });
      }

      const tableId = parseInt(table_id);
      const eventId = parseInt(event_id);

      const event = await dbGet(
        "SELECT * FROM events WHERE id = $1 AND status = 'active'", [eventId]
      );
      if (!event) {
        return res.status(400).json({ error: 'Event is not available for booking' });
      }

      const table = await dbGet(
        'SELECT * FROM tables WHERE id = $1 AND event_id = $2', [tableId, eventId]
      );
      if (!table) {
        return res.status(404).json({ error: 'Table not found' });
      }

      const result = await withTransaction(async client => {
        // Only succeeds if the stall is still free at this instant
        const claim = await client.query(
          "UPDATE tables SET status = 'booked' WHERE id = $1 AND status = 'available' RETURNING *",
          [tableId]
        );
        if (claim.rowCount === 0) return { taken: true };

        const claimed = claim.rows[0];

        // reference_code is UNIQUE, so a collision just means trying again
        let booking = null;
        for (let attempt = 0; attempt < 10 && !booking; attempt++) {
          try {
            const inserted = await client.query(`
              INSERT INTO bookings (table_id, event_id, reference_code, customer_name,
                                    customer_phone, customer_email, business_name, notes, status)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
              RETURNING *
            `, [
              tableId, eventId, generateReferenceCode(), customer_name,
              customer_phone, customer_email || '', business_name || '', notes || ''
            ]);
            booking = inserted.rows[0];
          } catch (err) {
            if (err.code !== '23505') throw err; // 23505 = unique_violation
          }
        }

        if (!booking) throw new Error('Could not allocate a unique reference code');

        return { booking, table: claimed };
      });

      if (result.taken) {
        return res.status(409).json({
          error: 'This table is no longer available. Someone may have just booked it. Please select another table.'
        });
      }

      res.status(201).json({
        message: 'Booking confirmed!',
        booking: {
          id: result.booking.id,
          reference_code: result.booking.reference_code,
          table_number: result.table.table_number,
          table_label: result.table.label,
          price: result.table.price,
          customer_name,
          customer_phone,
          customer_email: customer_email || '',
          business_name: business_name || '',
          event_name: event.name,
          event_venue: event.venue,
          event_date: event.start_date
        }
      });
    } catch (err) {
      console.error('Error creating booking:', err);
      res.status(500).json({ error: 'Failed to create booking' });
    }
  },

  // Admin: Get all bookings with filters
  async getAllBookings(req, res) {
    try {
      const { event_id, status, search } = req.query;

      let query = `
        SELECT b.*, t.table_number, t.label AS table_label, t.price AS table_price,
               t.width AS table_width, t.height AS table_height,
               e.name AS event_name, e.venue AS event_venue
        FROM bookings b
        JOIN tables t ON t.id = b.table_id
        JOIN events e ON e.id = b.event_id
        WHERE TRUE
      `;
      const params = [];

      if (event_id) {
        params.push(parseInt(event_id));
        query += ` AND b.event_id = $${params.length}`;
      }
      if (status) {
        params.push(status);
        query += ` AND b.status = $${params.length}`;
      }
      if (search) {
        params.push(`%${search}%`);
        const p = `$${params.length}`;
        query += ` AND (b.customer_name ILIKE ${p} OR b.business_name ILIKE ${p}
                     OR b.reference_code ILIKE ${p} OR t.table_number ILIKE ${p})`;
      }

      query += ' ORDER BY b.booked_at DESC';

      res.json(await dbAll(query, params));
    } catch (err) {
      console.error('Error fetching bookings:', err);
      res.status(500).json({ error: 'Failed to fetch bookings' });
    }
  },

  // Admin: Update booking status
  async updateBooking(req, res) {
    try {
      const { status } = req.body;
      const id = parseInt(req.params.id);

      if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const booking = await dbGet('SELECT * FROM bookings WHERE id = $1', [id]);
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      await withTransaction(async client => {
        await client.query('UPDATE bookings SET status = $1 WHERE id = $2', [status, id]);

        // Cancelling releases the stall back to the floor plan
        if (status === 'cancelled') {
          await client.query(
            "UPDATE tables SET status = 'available' WHERE id = $1", [booking.table_id]
          );
        }
      });

      res.json({ message: `Booking ${status === 'cancelled' ? 'cancelled' : 'updated'} successfully` });
    } catch (err) {
      console.error('Error updating booking:', err);
      res.status(500).json({ error: 'Failed to update booking' });
    }
  },

  // Admin: Delete booking
  async deleteBooking(req, res) {
    try {
      const id = parseInt(req.params.id);
      const booking = await dbGet('SELECT * FROM bookings WHERE id = $1', [id]);
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      await withTransaction(async client => {
        await client.query('DELETE FROM bookings WHERE id = $1', [id]);
        await client.query(
          "UPDATE tables SET status = 'available' WHERE id = $1", [booking.table_id]
        );
      });

      res.json({ message: 'Booking deleted successfully' });
    } catch (err) {
      console.error('Error deleting booking:', err);
      res.status(500).json({ error: 'Failed to delete booking' });
    }
  },

  // Admin: Export bookings as CSV
  async exportBookings(req, res) {
    try {
      const { event_id } = req.query;

      let query = `
        SELECT b.reference_code, b.customer_name, b.customer_phone, b.customer_email,
               b.business_name, b.notes, b.status, b.booked_at,
               t.table_number, t.label AS table_label, t.price AS table_price,
               t.width AS table_width, t.height AS table_height,
               e.name AS event_name
        FROM bookings b
        JOIN tables t ON t.id = b.table_id
        JOIN events e ON e.id = b.event_id
      `;
      const params = [];

      if (event_id) {
        params.push(parseInt(event_id));
        query += ` WHERE b.event_id = $${params.length}`;
      }

      query += ' ORDER BY b.booked_at DESC';

      const bookings = await dbAll(query, params);

      const headers = [
        'Reference', 'Name', 'Phone', 'Email', 'Business', 'Stall #', 'Stall Type',
        'Stall Size (ft)', 'Price', 'Status', 'Booked At', 'Event', 'Notes'
      ];
      const rows = bookings.map(b => [
        b.reference_code, b.customer_name, b.customer_phone, b.customer_email,
        b.business_name, b.table_number, b.table_label,
        `${b.table_width} x ${b.table_height}`,
        b.table_price, b.status, b.booked_at, b.event_name, b.notes
      ]);

      let csv = headers.join(',') + '\n';
      for (const row of rows) {
        csv += row.map(val => `"${(val === null || val === undefined ? '' : val).toString().replace(/"/g, '""')}"`).join(',') + '\n';
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=bookings_${Date.now()}.csv`);
      res.send(csv);
    } catch (err) {
      console.error('Error exporting bookings:', err);
      res.status(500).json({ error: 'Failed to export bookings' });
    }
  },

  // Admin: Dashboard stats
  async getDashboardStats(req, res) {
    try {
      const stats = await dbGet(`
        SELECT
          (SELECT COUNT(*)::int FROM events) AS "totalEvents",
          (SELECT COUNT(*)::int FROM events WHERE status = 'active') AS "activeEvents",
          (SELECT COUNT(*)::int FROM bookings WHERE status <> 'cancelled') AS "totalBookings",
          (SELECT COUNT(*)::int FROM bookings WHERE status = 'pending') AS "pendingBookings",
          (SELECT COALESCE(SUM(t.price), 0) FROM bookings b
             JOIN tables t ON t.id = b.table_id
            WHERE b.status <> 'cancelled') AS "totalRevenue"
      `);

      const recentBookings = await dbAll(`
        SELECT b.*, t.table_number, e.name AS event_name
        FROM bookings b
        JOIN tables t ON t.id = b.table_id
        JOIN events e ON e.id = b.event_id
        WHERE b.status <> 'cancelled'
        ORDER BY b.booked_at DESC
        LIMIT 10
      `);

      res.json({ ...stats, recentBookings });
    } catch (err) {
      console.error('Error fetching stats:', err);
      res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
  }
};

module.exports = bookingController;
