/**
 * TableBook — local development / self-hosted entry point.
 *
 * On Vercel the same app is served by api/index.js instead.
 */
require('dotenv').config();

const app = require('./src/app');
const { initializeDatabase } = require('./src/config/database');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`TableBook server running at http://localhost:${PORT}`);
      console.log(`Admin panel: http://localhost:${PORT}/admin/login.html`);
      console.log(`Admin login: ${process.env.ADMIN_USERNAME || 'admin'} / ${process.env.ADMIN_PASSWORD || 'admin123'}\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
