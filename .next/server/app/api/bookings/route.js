"use strict";(()=>{var e={};e.id=946,e.ids=[946],e.modules={2934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},4580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},5869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},4300:e=>{e.exports=require("buffer")},6113:e=>{e.exports=require("crypto")},2781:e=>{e.exports=require("stream")},3837:e=>{e.exports=require("util")},739:(e,t,n)=>{n.r(t),n.d(t,{originalPathname:()=>b,patchFetch:()=>h,requestAsyncStorage:()=>d,routeModule:()=>c,serverHooks:()=>A,staticGenerationAsyncStorage:()=>L});var a={};n.r(a),n.d(a,{GET:()=>u,POST:()=>N});var r=n(9303),s=n(8716),i=n(670),o=n(7070),E=n(1103),T=n(9178);function l(){let e="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",t="TB-";for(let n=0;n<6;n++)t+=e.charAt(Math.floor(Math.random()*e.length));return t}async function u(e){try{if(!await (0,T.Gg)())return o.NextResponse.json({error:"Unauthorized"},{status:401});let{searchParams:t}=new URL(e.url),n=t.get("eventId"),a=t.get("status"),r=`
      SELECT b.*,
             t.table_number, t.label AS table_label, t.price AS table_price,
             t.size AS table_size, t.width AS table_width, t.height AS table_height,
             e.name AS event_name, e.venue AS event_venue, e.start_date AS event_date
      FROM bookings b
      JOIN tables t ON b.table_id = t.id
      JOIN events e ON b.event_id = e.id
    `,s=[],i=[];n&&(i.push(`b.event_id = $${s.length+1}`),s.push(parseInt(n))),a&&(i.push(`b.status = $${s.length+1}`),s.push(a)),i.length>0&&(r+=" WHERE "+i.join(" AND ")),r+=" ORDER BY b.booked_at DESC";let l=await (0,E.Mj)(r,s);return o.NextResponse.json(l)}catch(e){return o.NextResponse.json({error:e.message||"Failed to fetch bookings"},{status:500})}}async function N(e){try{let{table_id:t,customer_name:n,customer_phone:a,customer_email:r="",business_name:s="",notes:i=""}=await e.json();if(!t||!n||!a)return o.NextResponse.json({error:"Table ID, customer name, and phone number are required"},{status:400});let T=await (0,E.ZG)(async e=>{let o=await e.query("SELECT * FROM tables WHERE id = $1 FOR UPDATE",[t]);if(0===o.rows.length)throw Error("Table not found");let E=o.rows[0];if("available"!==E.status)throw Error("This stall is no longer available");let T=l(),u=!1;for(;!u;){let t=await e.query("SELECT id FROM bookings WHERE reference_code = $1",[T]);0===t.rows.length?u=!0:T=l()}let N=await e.query(`
        INSERT INTO bookings (
          table_id, event_id, reference_code, customer_name,
          customer_phone, customer_email, business_name, notes, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'confirmed')
        RETURNING *
      `,[E.id,E.event_id,T,n.trim(),a.trim(),r.trim(),s.trim(),i.trim()]);await e.query("UPDATE tables SET status = 'booked' WHERE id = $1",[E.id]);let c=(await e.query("SELECT name, venue, start_date FROM events WHERE id = $1",[E.event_id])).rows[0]||{};return{...N.rows[0],table_number:E.table_number,table_label:E.label,table_price:E.price,table_width:E.width,table_height:E.height,event_name:c.name,venue:c.venue,event_date:c.start_date}});return o.NextResponse.json(T,{status:201})}catch(e){return o.NextResponse.json({error:e.message||"Failed to complete reservation"},{status:400})}}let c=new r.AppRouteRouteModule({definition:{kind:s.x.APP_ROUTE,page:"/api/bookings/route",pathname:"/api/bookings",filename:"route",bundlePath:"app/api/bookings/route"},resolvedPagePath:"D:\\TableBookWebsite\\app\\api\\bookings\\route.ts",nextConfigOutput:"",userland:a}),{requestAsyncStorage:d,staticGenerationAsyncStorage:L,serverHooks:A}=c,b="/api/bookings/route";function h(){return(0,i.patchFetch)({serverHooks:A,staticGenerationAsyncStorage:L})}},9178:(e,t,n)=>{n.d(t,{Gg:()=>T,MY:()=>l,fT:()=>E,i:()=>u});var a=n(1482),r=n.n(a),s=n(1615);let i=process.env.JWT_SECRET||"tablebook-secret-key-super-secure-change-in-prod",o="admin_token";function E(e){return r().sign({id:e.id,username:e.username,role:e.role},i,{expiresIn:"7d"})}async function T(){let e=(0,s.cookies)(),t=e.get(o)?.value;return t?function(e){try{return r().verify(e,i)}catch(e){return null}}(t):null}async function l(e){(0,s.cookies)().set(o,e,{httpOnly:!0,secure:!0,sameSite:"lax",maxAge:604800,path:"/"})}async function u(){(0,s.cookies)().delete(o)}},1103:(e,t,n)=>{n.d(t,{Mj:()=>l,mY:()=>u,Xy:()=>N,ZG:()=>c});let a=require("pg");var r=n(2023),s=n.n(r);a.types.setTypeParser(20,e=>null===e?null:parseInt(e,10));let i=null,o=null;function E(){if(i)return i;let e=function(e){let t=(e||"").trim();(t.startsWith('"')&&t.endsWith('"')||t.startsWith("'")&&t.endsWith("'"))&&(t=t.slice(1,-1).trim());let n=t.indexOf("://");if(-1!==n){let e=t.indexOf(":",n+3),a=t.lastIndexOf("@");if(-1!==e&&-1!==a&&a>e){let n=t.substring(0,e+1),r=t.substring(e+1,a),s=t.substring(a);r.includes("@")&&(t=`${n}${r.replace(/@/g,"%40")}${s}`)}}return t}(process.env.DATABASE_URL);if(!e)throw Error("DATABASE_URL environment variable is not configured.");return(i=new a.Pool({connectionString:e,ssl:{rejectUnauthorized:!1},max:Number(process.env.PG_POOL_MAX||5),idleTimeoutMillis:1e4,connectionTimeoutMillis:1e4})).on("error",e=>console.error("Unexpected Postgres pool error:",e)),i}async function T(e,t=[]){return await A(),E().query(e,t)}async function l(e,t=[]){let{rows:n}=await T(e,t);return n}async function u(e,t=[]){let{rows:n}=await T(e,t);return n.length?n[0]:null}async function N(e,t=[]){let{rowCount:n,rows:a}=await T(e,t);return{rowCount:n,rows:a,row:a.length?a[0]:null}}async function c(e){await A();let t=await E().connect();try{await t.query("BEGIN");let n=await e(t);return await t.query("COMMIT"),n}catch(e){throw await t.query("ROLLBACK"),e}finally{t.release()}}let d=`
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
                 CHECK (size IN ('small', 'medium', 'large', 'xlarge')),
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
`;async function L(){let e=process.env.ADMIN_USERNAME||"admin",t=process.env.ADMIN_PASSWORD||"admin123",{rows:n}=await E().query("SELECT id FROM admins WHERE username = $1",[e]);if(!n||0===n.length){let n=s().hashSync(t,10);await E().query("INSERT INTO admins (username, password_hash) VALUES ($1, $2)",[e,n]),console.log(`Default admin account seeded: ${e}`)}}async function A(){if(o)return o;o=(async()=>{let{rows:e}=await E().query("SELECT to_regclass('public.events') AS table_name");e&&e[0]&&e[0].table_name?await E().query(`
        ALTER TABLE events ADD COLUMN IF NOT EXISTS hall_elements JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE events ADD COLUMN IF NOT EXISTS hall_rotation INTEGER DEFAULT 0;
        ALTER TABLE tables DROP CONSTRAINT IF EXISTS tables_size_check;
        ALTER TABLE tables ADD CONSTRAINT tables_size_check CHECK (size IN ('small', 'medium', 'large', 'xlarge'));
      `):(await E().query(d),console.log("Database schema created")),await L()})();try{await o}catch(e){throw o=null,e}}}};var t=require("../../../webpack-runtime.js");t.C(e);var n=e=>t(t.s=e),a=t.X(0,[276,532,23],()=>n(739));module.exports=a})();