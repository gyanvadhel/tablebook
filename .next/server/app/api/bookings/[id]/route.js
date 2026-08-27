"use strict";(()=>{var e={};e.id=570,e.ids=[570],e.modules={2934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},4580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},5869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},4300:e=>{e.exports=require("buffer")},6113:e=>{e.exports=require("crypto")},2781:e=>{e.exports=require("stream")},3837:e=>{e.exports=require("util")},2031:(e,t,n)=>{n.r(t),n.d(t,{originalPathname:()=>c,patchFetch:()=>A,requestAsyncStorage:()=>u,routeModule:()=>N,serverHooks:()=>d,staticGenerationAsyncStorage:()=>L});var a={};n.r(a),n.d(a,{PATCH:()=>l});var r=n(9303),s=n(8716),i=n(670),E=n(7070),o=n(1103),T=n(9178);async function l(e,{params:t}){try{if(!await (0,T.Gg)())return E.NextResponse.json({error:"Unauthorized"},{status:401});let n=parseInt(t.id),{status:a}=await e.json();if(!["pending","confirmed","cancelled"].includes(a))return E.NextResponse.json({error:"Invalid status"},{status:400});let r=await (0,o.ZG)(async e=>{let t=await e.query("SELECT * FROM bookings WHERE id = $1",[n]);if(0===t.rows.length)throw Error("Booking not found");let r=t.rows[0],s=await e.query("UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *",[a,n]);return"cancelled"===a?await e.query("UPDATE tables SET status = 'available' WHERE id = $1",[r.table_id]):"confirmed"===a&&await e.query("UPDATE tables SET status = 'booked' WHERE id = $1",[r.table_id]),s.rows[0]});return E.NextResponse.json(r)}catch(e){return E.NextResponse.json({error:e.message||"Failed to update booking"},{status:500})}}let N=new r.AppRouteRouteModule({definition:{kind:s.x.APP_ROUTE,page:"/api/bookings/[id]/route",pathname:"/api/bookings/[id]",filename:"route",bundlePath:"app/api/bookings/[id]/route"},resolvedPagePath:"D:\\TableBookWebsite\\app\\api\\bookings\\[id]\\route.ts",nextConfigOutput:"",userland:a}),{requestAsyncStorage:u,staticGenerationAsyncStorage:L,serverHooks:d}=N,c="/api/bookings/[id]/route";function A(){return(0,i.patchFetch)({serverHooks:d,staticGenerationAsyncStorage:L})}},9178:(e,t,n)=>{n.d(t,{Gg:()=>T,MY:()=>l,fT:()=>o,i:()=>N});var a=n(1482),r=n.n(a),s=n(1615);let i=process.env.JWT_SECRET||"tablebook-secret-key-super-secure-change-in-prod",E="admin_token";function o(e){return r().sign({id:e.id,username:e.username,role:e.role},i,{expiresIn:"7d"})}async function T(){let e=(0,s.cookies)(),t=e.get(E)?.value;return t?function(e){try{return r().verify(e,i)}catch(e){return null}}(t):null}async function l(e){(0,s.cookies)().set(E,e,{httpOnly:!0,secure:!0,sameSite:"lax",maxAge:604800,path:"/"})}async function N(){(0,s.cookies)().delete(E)}},1103:(e,t,n)=>{n.d(t,{Mj:()=>l,mY:()=>N,Xy:()=>u,ZG:()=>L});let a=require("pg");var r=n(2023),s=n.n(r);a.types.setTypeParser(20,e=>null===e?null:parseInt(e,10));let i=null,E=null;function o(){if(i)return i;let e=function(e){let t=(e||"").trim();(t.startsWith('"')&&t.endsWith('"')||t.startsWith("'")&&t.endsWith("'"))&&(t=t.slice(1,-1).trim());let n=t.indexOf("://");if(-1!==n){let e=t.indexOf(":",n+3),a=t.lastIndexOf("@");if(-1!==e&&-1!==a&&a>e){let n=t.substring(0,e+1),r=t.substring(e+1,a),s=t.substring(a);r.includes("@")&&(t=`${n}${r.replace(/@/g,"%40")}${s}`)}}return t}(process.env.DATABASE_URL);if(!e)throw Error("DATABASE_URL environment variable is not configured.");return(i=new a.Pool({connectionString:e,ssl:{rejectUnauthorized:!1},max:Number(process.env.PG_POOL_MAX||5),idleTimeoutMillis:1e4,connectionTimeoutMillis:1e4})).on("error",e=>console.error("Unexpected Postgres pool error:",e)),i}async function T(e,t=[]){return await A(),o().query(e,t)}async function l(e,t=[]){let{rows:n}=await T(e,t);return n}async function N(e,t=[]){let{rows:n}=await T(e,t);return n.length?n[0]:null}async function u(e,t=[]){let{rowCount:n,rows:a}=await T(e,t);return{rowCount:n,rows:a,row:a.length?a[0]:null}}async function L(e){await A();let t=await o().connect();try{await t.query("BEGIN");let n=await e(t);return await t.query("COMMIT"),n}catch(e){throw await t.query("ROLLBACK"),e}finally{t.release()}}let d=`
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
`;async function c(){let e=process.env.ADMIN_USERNAME||"admin",t=process.env.ADMIN_PASSWORD||"admin123",{rows:n}=await o().query("SELECT id FROM admins WHERE username = $1",[e]);if(!n||0===n.length){let n=s().hashSync(t,10);await o().query("INSERT INTO admins (username, password_hash) VALUES ($1, $2)",[e,n]),console.log(`Default admin account seeded: ${e}`)}}async function A(){if(E)return E;E=(async()=>{let{rows:e}=await o().query("SELECT to_regclass('public.events') AS table_name");e&&e[0]&&e[0].table_name?await o().query(`
        ALTER TABLE events ADD COLUMN IF NOT EXISTS hall_elements JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE events ADD COLUMN IF NOT EXISTS hall_rotation INTEGER DEFAULT 0;
        ALTER TABLE tables DROP CONSTRAINT IF EXISTS tables_size_check;
        ALTER TABLE tables ADD CONSTRAINT tables_size_check CHECK (size IN ('small', 'medium', 'large', 'xlarge'));
      `):(await o().query(d),console.log("Database schema created")),await c()})();try{await E}catch(e){throw E=null,e}}}};var t=require("../../../../webpack-runtime.js");t.C(e);var n=e=>t(t.s=e),a=t.X(0,[276,532,23],()=>n(2031));module.exports=a})();