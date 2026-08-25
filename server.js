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
  // Connect up front so problems surface at boot rather than on first request,
  // but still serve the site if the database is unreachable — the pages load
  // and the API reports the failure, which beats a blank screen.
  try {
    await initializeDatabase();
  } catch (err) {
    console.error('\nDatabase unavailable:', err.message);
    console.error('The site will start, but anything touching data will fail.\n');
  }

  app.listen(PORT, () => {
    console.log(`TableBook server running at http://localhost:${PORT}`);
    console.log(`Admin panel: http://localhost:${PORT}/admin/login.html`);
    console.log(`Admin login: ${process.env.ADMIN_USERNAME || 'admin'} / ${process.env.ADMIN_PASSWORD || 'admin123'}\n`);
  });
}

start();
