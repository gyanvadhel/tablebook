const express = require('express');
const multer = require('multer');
const { requireAdmin } = require('../middleware/auth');
const eventController = require('../controllers/eventController');
const tableController = require('../controllers/tableController');
const bookingController = require('../controllers/bookingController');
const uploadController = require('../controllers/uploadController');

const router = express.Router();

// Blueprint uploads are buffered in memory and stored in Postgres by the
// controller — nothing is written to disk, so they survive a serverless deploy.
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const uploadBuffer = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES } });

function acceptBlueprint(req, res, next) {
  uploadBuffer.single('blueprint')(req, res, err => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: `That image is over the ${MAX_UPLOAD_BYTES / 1024 / 1024} MB limit.` });
    }
    next(err);
  });
}

// All admin routes require authentication
router.use(requireAdmin);

// Blueprint image upload
router.post('/upload/blueprint', acceptBlueprint, uploadController.uploadBlueprint);

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

