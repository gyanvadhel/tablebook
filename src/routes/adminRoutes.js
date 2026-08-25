const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const eventController = require('../controllers/eventController');
const tableController = require('../controllers/tableController');
const bookingController = require('../controllers/bookingController');

const router = express.Router();

// All admin routes require authentication
router.use(requireAdmin);

// Dashboard
router.get('/dashboard', bookingController.getDashboardStats);

// Event management
router.get('/events', eventController.getAllEvents);
router.post('/events', eventController.createEvent);
router.put('/events/:id', eventController.updateEvent);
router.delete('/events/:id', eventController.deleteEvent);

// Table/layout management
router.get('/events/:eventId/tables', tableController.getTablesForEvent);
router.post('/events/:eventId/tables', tableController.saveLayout);
router.put('/tables/:id/status', tableController.updateTableStatus);

// Booking management
router.get('/bookings', bookingController.getAllBookings);
router.put('/bookings/:id', bookingController.updateBooking);
router.delete('/bookings/:id', bookingController.deleteBooking);
router.get('/bookings/export', bookingController.exportBookings);

module.exports = router;
