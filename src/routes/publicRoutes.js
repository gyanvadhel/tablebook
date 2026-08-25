const express = require('express');
const eventController = require('../controllers/eventController');
const bookingController = require('../controllers/bookingController');

const router = express.Router();

// Public event routes
router.get('/events', eventController.getActiveEvents);
router.get('/events/:id', eventController.getEventWithTables);

// Public booking route
router.post('/bookings', bookingController.createBooking);

module.exports = router;
