/**
 * TableBook — Postgres data access.
 *
 * The app talks to Postgres (Supabase) through a small promise-based helper
 * layer. Every call is async; controllers await them.
 *
 * All spatial columns hold FEET — see public/js/units.js.
 */
const { Pool, types } = require('pg');
const bcrypt = require('bcryptjs');

// Parse PostgreSQL BIGINT (OID 20) into Javascript Numbers
types.setTypeParser(20, val => (val === null ? null : parseInt(val, 10)));

let pool = null;
let schemaReady = null;

function sanitizeDatabaseUrl(url) {
  let str = (url || '').trim();
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1).trim();
  }
  // If password contains an unencoded '@', encode it as %40 so URL parser doesn't throw Invalid URL
  const protoEnd = str.indexOf('://');
  if (protoEnd !== -1) {
    const firstColon = str.indexOf(':', protoEnd + 3);
    const lastAt = str.lastIndexOf('@');
    if (firstColon !== -1 && lastAt !== -1 && lastAt > firstColon) {
      const prefix = str.substring(0, firstColon + 1);
      const rawPass = str.substring(firstColon + 1, lastAt);
      const suffix = str.substring(lastAt);
      if (rawPass.includes('@')) {
        str = `${prefix}${rawPass.replace(/@/g, '%40')}${suffix}`;
      }
    }
  }
  return str;
}

function getPool() {
  if (pool) return pool;

  const connectionString = sanitizeDatabaseUrl(process.env.DATABASE_URL);

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Please add DATABASE_URL to your Vercel Project Settings -> Environment Variables.'
    );
  }

  if (connectionString.includes('[') || connectionString.includes(']')) {
    throw new Error(
      'DATABASE_URL contains square brackets [ or ]. Please replace [YOUR-PASSWORD] with your actual database password (without brackets).'
    );
  }

  pool = new Pool({
    connectionString,
    // Supabase terminates TLS with a certificate this client carries no root
    // for; the connection is still encrypted.
    ssl: { rejectUnauthorized: false },
    // Serverless invocations are short-lived, so keep the footprint small and
    // never let a hung connection wedge a request.
    max: Number(process.env.PG_POOL_MAX || 3),
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000
  });

  pool.on('error', err => console.error('Unexpected Postgres pool error:', err));

  return pool;
}

/** Run a query, returning the full pg result. */
async function query(sql, params = []) {
  return getPool().query(sql, params);
}

/** All matching rows. */
async function dbAll(sql, params = []) {
  const { rows } = await query(sql, params);
  return rows;
}

/** The first matching row, or null. */
async function dbGet(sql, params = []) {
  const { rows } = await query(sql, params);
  return rows.length ? rows[0] : null;
}

/**
 * A write. Reports the affected row count, plus the rows produced by a
 * RETURNING clause when the statement has one.
 */
async function dbRun(sql, params = []) {
  const { rowCount, rows } = await query(sql, params);
  return { rowCount, rows, row: rows.length ? rows[0] : null };
}

/** Run several statements inside one transaction. */
async function withTransaction(fn) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS admins (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name                  TEXT NOT NULL,
  description           TEXT NOT NULL DEFAULT '',
  venue                 TEXT NOT NULL DEFAULT '',
  start_date            DATE,
  end_date              DATE,
  status                TEXT NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft', 'active', 'completed')),
  hall_width            REAL NOT NULL DEFAULT 80  CHECK (hall_width  BETWEEN 10 AND 600),
  hall_height           REAL NOT NULL DEFAULT 55  CHECK (hall_height BETWEEN 10 AND 600),
  hall_background_image TEXT,
  hall_elements         JSONB DEFAULT '[]'::jsonb,
  hall_rotation         INTEGER DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tables (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id     BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  table_number TEXT NOT NULL,
  label        TEXT NOT NULL DEFAULT '',
  size         TEXT NOT NULL DEFAULT 'medium'
                 CHECK (size IN ('small', 'medium', 'large')),
  price        REAL NOT NULL DEFAULT 0,
  x            REAL NOT NULL,
  y            REAL NOT NULL,
  width        REAL NOT NULL DEFAULT 6 CHECK (width  BETWEEN 1 AND 200),
  height       REAL NOT NULL DEFAULT 4 CHECK (height BETWEEN 1 AND 200),
  rotation     REAL NOT NULL DEFAULT 0,
  shape        TEXT NOT NULL DEFAULT 'rect',
  status       TEXT NOT NULL DEFAULT 'available'
                 CHECK (status IN ('available', 'booked', 'blocked')),
  UNIQUE (event_id, table_number)
);

CREATE TABLE IF NOT EXISTS bookings (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  table_id       BIGINT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  event_id       BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  reference_code TEXT NOT NULL UNIQUE,
  customer_name  TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL DEFAULT '',
  business_name  TEXT NOT NULL DEFAULT '',
  notes          TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  booked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tables_event    ON tables(event_id);
CREATE INDEX IF NOT EXISTS idx_bookings_event  ON bookings(event_id);
CREATE INDEX IF NOT EXISTS idx_bookings_table  ON bookings(table_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booked ON bookings(booked_at DESC);

ALTER TABLE admins   ENABLE ROW LEVEL SECURITY;
ALTER TABLE events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables   ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
`;

async function seedDefaultAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  const existing = await dbGet('SELECT id FROM admins WHERE username = $1', [username]);
  if (!existing) {
    const hash = bcrypt.hashSync(password, 10);
    await dbRun('INSERT INTO admins (username, password_hash) VALUES ($1, $2)', [username, hash]);
    console.log(`Default admin account created: ${username}`);
  }
}

/**
 * Bring the schema up and seed the first admin. Cheap to call repeatedly: one
 * lookup short-circuits when the tables already exist, so serverless cold
 * starts do not re-run the DDL every time.
 */
async function initializeDatabase() {
  if (schemaReady) return schemaReady;

  schemaReady = (async () => {
    const existing = await dbGet("SELECT to_regclass('public.events') AS table_name");

    if (!existing || !existing.table_name) {
      await query(SCHEMA_SQL);
      console.log('Database schema created');
    } else {
      // Auto-migrate new columns and constraints
      await query(`
        ALTER TABLE events ADD COLUMN IF NOT EXISTS hall_elements JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE events ADD COLUMN IF NOT EXISTS hall_rotation INTEGER DEFAULT 0;
        ALTER TABLE tables DROP CONSTRAINT IF EXISTS tables_size_check;
        ALTER TABLE tables ADD CONSTRAINT tables_size_check CHECK (size IN ('small', 'medium', 'large', 'xlarge'));
      `);
    }

    await seedDefaultAdmin();
    console.log('Database ready');
  })();

  try {
    await schemaReady;
  } catch (err) {
    // Let the next request retry instead of caching the failure forever
    schemaReady = null;
    throw err;
  }

  return schemaReady;
}

module.exports = {
  getPool,
  query,
  dbAll,
  dbGet,
  dbRun,
  withTransaction,
  initializeDatabase
};
