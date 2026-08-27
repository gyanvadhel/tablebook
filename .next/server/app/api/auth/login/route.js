"use strict";(()=>{var e={};e.id=873,e.ids=[873],e.modules={2934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},4580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},5869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},4300:e=>{e.exports=require("buffer")},6113:e=>{e.exports=require("crypto")},2781:e=>{e.exports=require("stream")},3837:e=>{e.exports=require("util")},4605:(e,t,n)=>{n.r(t),n.d(t,{originalPathname:()=>I,patchFetch:()=>m,requestAsyncStorage:()=>c,routeModule:()=>L,serverHooks:()=>d,staticGenerationAsyncStorage:()=>A});var r={};n.r(r),n.d(r,{POST:()=>N});var a=n(9303),s=n(8716),i=n(670),T=n(7070),E=n(2023),o=n.n(E),l=n(1103),u=n(9178);async function N(e){try{let{username:t,password:n}=await e.json();if(!t||!n)return T.NextResponse.json({error:"Username and password are required"},{status:400});let r=await (0,l.mY)("SELECT * FROM admins WHERE username = $1",[t.trim()]);if(!r||!await o().compare(n,r.password_hash))return T.NextResponse.json({error:"Invalid username or password"},{status:401});let a=(0,u.fT)({id:Number(r.id),username:r.username,role:"admin"});return await (0,u.MY)(a),T.NextResponse.json({success:!0,user:{id:r.id,username:r.username,role:"admin"}})}catch(e){return console.error("Login error:",e),T.NextResponse.json({error:"Internal server error"},{status:500})}}let L=new a.AppRouteRouteModule({definition:{kind:s.x.APP_ROUTE,page:"/api/auth/login/route",pathname:"/api/auth/login",filename:"route",bundlePath:"app/api/auth/login/route"},resolvedPagePath:"D:\\TableBookWebsite\\app\\api\\auth\\login\\route.ts",nextConfigOutput:"",userland:r}),{requestAsyncStorage:c,staticGenerationAsyncStorage:A,serverHooks:d}=L,I="/api/auth/login/route";function m(){return(0,i.patchFetch)({serverHooks:d,staticGenerationAsyncStorage:A})}},9178:(e,t,n)=>{n.d(t,{Gg:()=>o,MY:()=>l,fT:()=>E,i:()=>u});var r=n(1482),a=n.n(r),s=n(1615);let i=process.env.JWT_SECRET||"tablebook-secret-key-super-secure-change-in-prod",T="admin_token";function E(e){return a().sign({id:e.id,username:e.username,role:e.role},i,{expiresIn:"7d"})}async function o(){let e=(0,s.cookies)(),t=e.get(T)?.value;return t?function(e){try{return a().verify(e,i)}catch(e){return null}}(t):null}async function l(e){(0,s.cookies)().set(T,e,{httpOnly:!0,secure:!0,sameSite:"lax",maxAge:604800,path:"/"})}async function u(){(0,s.cookies)().delete(T)}},1103:(e,t,n)=>{n.d(t,{Mj:()=>l,mY:()=>u,Xy:()=>N,ZG:()=>L});let r=require("pg");var a=n(2023),s=n.n(a);r.types.setTypeParser(20,e=>null===e?null:parseInt(e,10));let i=null,T=null;function E(){if(i)return i;let e=function(e){let t=(e||"").trim();(t.startsWith('"')&&t.endsWith('"')||t.startsWith("'")&&t.endsWith("'"))&&(t=t.slice(1,-1).trim());let n=t.indexOf("://");if(-1!==n){let e=t.indexOf(":",n+3),r=t.lastIndexOf("@");if(-1!==e&&-1!==r&&r>e){let n=t.substring(0,e+1),a=t.substring(e+1,r),s=t.substring(r);a.includes("@")&&(t=`${n}${a.replace(/@/g,"%40")}${s}`)}}return t}(process.env.DATABASE_URL);if(!e)throw Error("DATABASE_URL environment variable is not configured.");return(i=new r.Pool({connectionString:e,ssl:{rejectUnauthorized:!1},max:Number(process.env.PG_POOL_MAX||5),idleTimeoutMillis:1e4,connectionTimeoutMillis:1e4})).on("error",e=>console.error("Unexpected Postgres pool error:",e)),i}async function o(e,t=[]){return await d(),E().query(e,t)}async function l(e,t=[]){let{rows:n}=await o(e,t);return n}async function u(e,t=[]){let{rows:n}=await o(e,t);return n.length?n[0]:null}async function N(e,t=[]){let{rowCount:n,rows:r}=await o(e,t);return{rowCount:n,rows:r,row:r.length?r[0]:null}}async function L(e){await d();let t=await E().connect();try{await t.query("BEGIN");let n=await e(t);return await t.query("COMMIT"),n}catch(e){throw await t.query("ROLLBACK"),e}finally{t.release()}}let c=`
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
`;async function A(){let e=process.env.ADMIN_USERNAME||"admin",t=process.env.ADMIN_PASSWORD||"admin123",{rows:n}=await E().query("SELECT id FROM admins WHERE username = $1",[e]);if(!n||0===n.length){let n=s().hashSync(t,10);await E().query("INSERT INTO admins (username, password_hash) VALUES ($1, $2)",[e,n]),console.log(`Default admin account seeded: ${e}`)}}async function d(){if(T)return T;T=(async()=>{let{rows:e}=await E().query("SELECT to_regclass('public.events') AS table_name");e&&e[0]&&e[0].table_name?await E().query(`
        ALTER TABLE events ADD COLUMN IF NOT EXISTS hall_elements JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE events ADD COLUMN IF NOT EXISTS hall_rotation INTEGER DEFAULT 0;
        ALTER TABLE tables DROP CONSTRAINT IF EXISTS tables_size_check;
        ALTER TABLE tables ADD CONSTRAINT tables_size_check CHECK (size IN ('small', 'medium', 'large', 'xlarge'));
      `):(await E().query(c),console.log("Database schema created")),await A()})();try{await T}catch(e){throw T=null,e}}}};var t=require("../../../../webpack-runtime.js");t.C(e);var n=e=>t(t.s=e),r=t.X(0,[276,532,23],()=>n(4605));module.exports=r})();