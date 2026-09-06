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

## Blueprint underlay

The studio can lay a real venue floor plan under the canvas and trace stalls
over it. Open **Blueprint** in the studio header, then drop in a PNG, JPG, GIF
or WEBP (up to 10 MB) or paste an image URL.

**Calibrate it before you trace.** A scanned plan arrives at an arbitrary
scale. Hit *Calibrate to a known distance*, click two points that span
something you have a real measurement for — a wall, a doorway, a marked
dimension — and type what it actually measures. The image rescales around the
first point so the two land exactly that far apart, and everything you draw on
top then has true coordinates.

| Control | Effect |
|---|---|
| Drag the image | Moves it (snaps to the studio's snap grid) |
| Corner handles | Uniform scale, pinned to the opposite corner |
| Opacity | How strongly it reads under the plan |
| Lock placement | Stops drag and resize; calibration still works |
| Show to visitors | Also draws it on the public booking map |
| Fit hall / Un-stretch | Re-fit to the hall, or restore natural proportions |

Handles only appear while the Blueprint panel is open, so dragging the floor to
pan keeps working the rest of the time. The blueprint saves with **Save Plan**,
along with the rest of the layout — the amber dot on that button means there
are unsaved changes.

Storage:

| Where | Holds |
|---|---|
| `events.hall_background_image` | The image URL, normally `/api/uploads/<id>.<ext>` |
| `events.hall_blueprint` | `{x, y, width, height, rotation, opacity, visible, locked, showToVisitors}` — feet, from the hall's top-left corner |
| `uploads` table | The image bytes themselves (`BYTEA`), with MIME type, size and SHA-256 |

Placement is in feet, not pixels, so resizing the hall leaves the blueprint
where it was. Clearing the image clears the placement with it.

**Uploaded images live in Postgres, not on disk.** `POST /api/uploads` stores
the bytes in the `uploads` table and returns `/api/uploads/<id>.<ext>`; `GET`
on that URL serves them with a one-year immutable cache header and an ETag.
This is what makes blueprints work on Vercel: its filesystem is read-only and
discarded on every cold start, so a file written to `public/uploads/` never
exists in production. One `DATABASE_URL` is the whole configuration.
Identical bytes are stored once — re-uploading the same plan reuses the
existing row. Vercel caps function request and response bodies at roughly
4.5 MB, so keep floor-plan images under that when deploying there; the app's
own limit is 10 MB.

The legacy Express editor's upload route stores to the same table, and when
it attaches an image it also records the placement it implies — stretched
over the hall and shown to visitors — so both UIs draw the same picture.

SVG uploads are refused on purpose: an uploaded `.svg` is served from our own
origin, and opening it there would execute any script it carries against a
live admin session. Files are identified by their magic bytes, not by the
extension the browser claims.

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
