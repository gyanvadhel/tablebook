# TableBook

Exhibition stall booking with a visual hall floor plan. Admins draw the hall
and place stalls; visitors click a stall on the map to reserve it.

**Every measurement is in feet.** Hall size, stall footprint, and stall position
are all real-world dimensions — the floor plan is drawn to scale, not sized in
pixels.

## How the units work

Feet are the unit of truth. They are what the admin types, what the database
stores, and what the API returns.

Pixels appear in exactly one place: the moment a shape is drawn into an SVG.
`public/js/units.js` holds the single conversion constant and every helper that
touches it:

```
1 foot = 15 SVG drawing units      (Units.PX_PER_FOOT)
```

Renderers call `Units.ftToPx()` at the point of drawing and nowhere else. Both
the admin editor and the public map share that module, and so does the server —
it is the one file that defines what a foot means here.

| Where | Unit |
|---|---|
| `events.hall_width`, `events.hall_height` | feet |
| `tables.x`, `tables.y` | feet, from the hall's top-left corner |
| `tables.width`, `tables.height` | feet |
| SVG `viewBox` and path coordinates | drawing units (feet × 15) |

Positions are stored to the nearest quarter-inch. The editor's grid snaps to
1 ft by default, with 6 in and 3 in also available.

### Defaults

| Item | Size |
|---|---|
| Hall | 80 ft × 55 ft |
| Standard Short stall | 3 ft × 4 ft |
| Standard Tall stall | 3 ft × 7 ft |
| L-Stall | 6 ft × 5 ft |

Halls are accepted between 10 ft and 600 ft per side; stalls between 1 ft and
200 ft. Values outside those ranges are clamped rather than rejected, on both
the client and the server.

## Stack

- **Express** — API and static hosting
- **Postgres (Supabase)** — data, accessed with `pg` over plain SQL
- **Vanilla JS + SVG** — no front-end framework or build step
- **cookie-session** — the admin session is a signed cookie, so nothing needs a
  shared session store between serverless instances

## Running locally

```bash
npm install
cp .env.example .env     # then fill in DATABASE_URL and SESSION_SECRET
npm run dev
```

Open http://localhost:3000. The admin panel is at `/admin/login.html`.

The schema is created automatically on first run, along with an admin account
using `ADMIN_USERNAME` / `ADMIN_PASSWORD`. **Change those before exposing the
site** — the seeded default is only meant to get you in the door.

### Environment

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string. On Supabase use the **Transaction pooler** URI (port 6543) for serverless. |
| `SESSION_SECRET` | Signs the admin session cookie. Required in production. |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Seeds the first admin account, only when no admin exists yet. |
| `PORT` | Local port. Ignored on Vercel. |

## Deploying to Vercel

`vercel.json` routes `/api/*` to the Express app in `api/index.js` and serves
everything in `public/` as static assets. Set `DATABASE_URL`, `SESSION_SECRET`,
`ADMIN_USERNAME`, and `ADMIN_PASSWORD` as project environment variables, then
deploy.

## Layout editor

| Key | Action |
|---|---|
| `G` | Grab / move |
| `R` | Rotate 90° |
| `Shift`+`D` | Duplicate |
| `Del` / `X` | Delete |
| `Esc` | Deselect |

Drag to move, scroll to zoom, drag empty floor to pan. Smart guides snap a stall
to its neighbours' edges and centres. Stalls cannot be pushed outside the hall
walls, and a stall that is already booked cannot be moved or deleted until the
booking is cancelled.

## Project layout

```
api/index.js          Vercel serverless entry
server.js             Local / self-hosted entry
src/app.js            Express app, shared by both entries
src/config/database.js  Postgres pool, schema bootstrap, admin seed
src/controllers/      Events, stalls, bookings
src/routes/           Public, admin, auth
public/js/units.js    Feet <-> drawing units. Shared by client and server.
public/js/hall-map.js         Public floor plan
public/js/admin/layout-editor.js  Admin floor plan editor
```
