const express = require('express');
const eventController = require('../controllers/eventController');
const bookingController = require('../controllers/bookingController');
const uploadController = require('../controllers/uploadController');

const router = express.Router();

// Public event routes
router.get('/events', eventController.getActiveEvents);
router.get('/events/:id', eventController.getEventWithTables);

// Public booking route
router.post('/bookings', bookingController.createBooking);

// Stored images (blueprints) — public so the visitor map can draw them
router.get('/uploads/:id', uploadController.serveUpload);

module.exports = router;
