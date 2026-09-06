const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAdmin } = require('../middleware/auth');
const eventController = require('../controllers/eventController');
const tableController = require('../controllers/tableController');
const bookingController = require('../controllers/bookingController');

const router = express.Router();

// Blueprint image upload storage config
const uploadsDir = path.join(__dirname, '..', '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const safeName = `blueprint_${Date.now()}${ext}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (PNG, JPG, WEBP, SVG) are allowed'));
    }
  }
});

// All admin routes require authentication
router.use(requireAdmin);

// Blueprint image upload
router.post('/upload/blueprint', upload.single('blueprint'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const publicUrl = `/uploads/${req.file.filename}`;
  res.json({ url: publicUrl, filename: req.file.filename });
});

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

