/**
 * TableBook — Express application.
 *
 * Kept free of any `listen` call so the same app can run as a long-lived
 * server (server.js) or as a serverless function (api/index.js).
 */
require('dotenv').config();

const express = require('express');
const cookieSession = require('cookie-session');
const cors = require('cors');
const path = require('path');

const { initializeDatabase } = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const publicRoutes = require('./routes/publicRoutes');
const adminRoutes = require('./routes/adminRoutes');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const isProduction = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET || process.env.JWT_SECRET || 'tablebook-secure-session-fallback-secret-2026';

const app = express();

// Behind Vercel's proxy, so secure cookies and req.protocol resolve correctly
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// The admin session holds nothing but a login flag, so it lives in a signed
// cookie. That keeps it stateless — no shared session store needed across
// serverless instances.
app.use(cookieSession({
  name: 'tablebook.sid',
  keys: [sessionSecret],
  maxAge: 24 * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: 'lax',
  secure: isProduction
}));

// Static assets first, so pages and styles still load when the database is
// unreachable. Vercel serves these directly in production; this keeps local
// development and any non-Vercel host behaving the same way.
app.use(express.static(PUBLIC_DIR));

/**
 * Make sure the schema exists and the first admin is seeded before any API
 * route touches the database. Memoised inside initializeDatabase(), so this
 * costs one cheap lookup per cold start.
 */
app.use('/api', (req, res, next) => {
  initializeDatabase().then(() => next()).catch(next);
});

// API
app.use('/api/auth', authRoutes);
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.status(404).sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Server error:', err.stack || err);
  const errorMessage = err.message || 'Something went wrong!';
  res.status(500).json({ error: errorMessage });
});

module.exports = app;
