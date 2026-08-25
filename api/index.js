/**
 * Vercel serverless entry point. All requests are rewritten here by
 * vercel.json; the Express app handles routing exactly as it does locally.
 */
module.exports = require('../src/app');
