const express = require('express');
const bcrypt = require('bcryptjs');
const { dbGet } = require('../config/database');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const admin = await dbGet('SELECT * FROM admins WHERE username = $1', [username]);

    if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    req.session.isAdmin = true;
    req.session.adminId = admin.id;
    req.session.adminUsername = admin.username;

    res.json({ message: 'Login successful', username: admin.username });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  // The session lives entirely in a signed cookie, so clearing it is enough
  req.session = null;
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/check
router.get('/check', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.json({ authenticated: true, username: req.session.adminUsername });
  }
  res.json({ authenticated: false });
});

module.exports = router;
