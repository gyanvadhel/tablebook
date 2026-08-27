"use strict";(()=>{var e={};e.id=643,e.ids=[643],e.modules={2934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},4580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},5869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},4300:e=>{e.exports=require("buffer")},6113:e=>{e.exports=require("crypto")},2781:e=>{e.exports=require("stream")},3837:e=>{e.exports=require("util")},2171:(e,t,a)=>{a.r(t),a.d(t,{originalPathname:()=>m,patchFetch:()=>h,requestAsyncStorage:()=>A,routeModule:()=>L,serverHooks:()=>c,staticGenerationAsyncStorage:()=>d});var r={};a.r(r),a.d(r,{GET:()=>N,POST:()=>u});var n=a(9303),s=a(8716),o=a(670),i=a(7070),T=a(1103),E=a(1552),l=a(9178);async function N(e){try{let{searchParams:t}=new URL(e.url),a=t.get("status"),r=`
      SELECT e.*,
        COUNT(t.id) AS total_tables,
        COUNT(CASE WHEN t.status = 'booked' THEN 1 END) AS booked_tables,
        COUNT(CASE WHEN t.status = 'available' THEN 1 END) AS available_tables
      FROM events e
      LEFT JOIN tables t ON e.id = t.event_id
    `,n=[];a&&(r+=" WHERE e.status = $1",n.push(a)),r+=" GROUP BY e.id ORDER BY e.created_at DESC";let s=await (0,T.Mj)(r,n);return i.NextResponse.json(s)}catch(e){return console.error("Events GET error:",e),i.NextResponse.json({error:e.message||"Failed to fetch events"},{status:500})}}async function u(e){try{if(!await (0,l.Gg)())return i.NextResponse.json({error:"Unauthorized"},{status:401});let{name:t,description:a="",venue:r="",start_date:n=null,end_date:s=null,hall_width:o=80,hall_height:N=55}=await e.json();if(!t||!t.trim())return i.NextResponse.json({error:"Event name is required"},{status:400});let u=E.nL.clampHallFt(o,80),L=E.nL.clampHallFt(N,55),A=[{id:"room_badge_main",type:"room_badge",label:t.trim(),x:1.5,y:1.5,width:8,height:3,rotation:0}],d=await (0,T.Xy)(`
      INSERT INTO events (name, description, venue, start_date, end_date, hall_width, hall_height, hall_elements, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, 'draft')
      RETURNING *
    `,[t.trim(),a,r,n||null,s||null,u,L,JSON.stringify(A)]);return i.NextResponse.json(d.row,{status:201})}catch(e){return console.error("Event POST error:",e),i.NextResponse.json({error:e.message||"Failed to create event"},{status:500})}}let L=new n.AppRouteRouteModule({definition:{kind:s.x.APP_ROUTE,page:"/api/events/route",pathname:"/api/events",filename:"route",bundlePath:"app/api/events/route"},resolvedPagePath:"D:\\TableBookWebsite\\app\\api\\events\\route.ts",nextConfigOutput:"",userland:r}),{requestAsyncStorage:A,staticGenerationAsyncStorage:d,serverHooks:c}=L,m="/api/events/route";function h(){return(0,o.patchFetch)({serverHooks:c,staticGenerationAsyncStorage:d})}},9178:(e,t,a)=>{a.d(t,{Gg:()=>E,MY:()=>l,fT:()=>T,i:()=>N});var r=a(1482),n=a.n(r),s=a(1615);let o=process.env.JWT_SECRET||"tablebook-secret-key-super-secure-change-in-prod",i="admin_token";function T(e){return n().sign({id:e.id,username:e.username,role:e.role},o,{expiresIn:"7d"})}async function E(){let e=(0,s.cookies)(),t=e.get(i)?.value;return t?function(e){try{return n().verify(e,o)}catch(e){return null}}(t):null}async function l(e){(0,s.cookies)().set(i,e,{httpOnly:!0,secure:!0,sameSite:"lax",maxAge:604800,path:"/"})}async function N(){(0,s.cookies)().delete(i)}},1103:(e,t,a)=>{a.d(t,{Mj:()=>l,mY:()=>N,Xy:()=>u,ZG:()=>L});let r=require("pg");var n=a(2023),s=a.n(n);r.types.setTypeParser(20,e=>null===e?null:parseInt(e,10));let o=null,i=null;function T(){if(o)return o;let e=function(e){let t=(e||"").trim();(t.startsWith('"')&&t.endsWith('"')||t.startsWith("'")&&t.endsWith("'"))&&(t=t.slice(1,-1).trim());let a=t.indexOf("://");if(-1!==a){let e=t.indexOf(":",a+3),r=t.lastIndexOf("@");if(-1!==e&&-1!==r&&r>e){let a=t.substring(0,e+1),n=t.substring(e+1,r),s=t.substring(r);n.includes("@")&&(t=`${a}${n.replace(/@/g,"%40")}${s}`)}}return t}(process.env.DATABASE_URL);if(!e)throw Error("DATABASE_URL environment variable is not configured.");return(o=new r.Pool({connectionString:e,ssl:{rejectUnauthorized:!1},max:Number(process.env.PG_POOL_MAX||5),idleTimeoutMillis:1e4,connectionTimeoutMillis:1e4})).on("error",e=>console.error("Unexpected Postgres pool error:",e)),o}async function E(e,t=[]){return await c(),T().query(e,t)}async function l(e,t=[]){let{rows:a}=await E(e,t);return a}async function N(e,t=[]){let{rows:a}=await E(e,t);return a.length?a[0]:null}async function u(e,t=[]){let{rowCount:a,rows:r}=await E(e,t);return{rowCount:a,rows:r,row:r.length?r[0]:null}}async function L(e){await c();let t=await T().connect();try{await t.query("BEGIN");let a=await e(t);return await t.query("COMMIT"),a}catch(e){throw await t.query("ROLLBACK"),e}finally{t.release()}}let A=`
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
`;async function d(){let e=process.env.ADMIN_USERNAME||"admin",t=process.env.ADMIN_PASSWORD||"admin123",{rows:a}=await T().query("SELECT id FROM admins WHERE username = $1",[e]);if(!a||0===a.length){let a=s().hashSync(t,10);await T().query("INSERT INTO admins (username, password_hash) VALUES ($1, $2)",[e,a]),console.log(`Default admin account seeded: ${e}`)}}async function c(){if(i)return i;i=(async()=>{let{rows:e}=await T().query("SELECT to_regclass('public.events') AS table_name");e&&e[0]&&e[0].table_name?await T().query(`
        ALTER TABLE events ADD COLUMN IF NOT EXISTS hall_elements JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE events ADD COLUMN IF NOT EXISTS hall_rotation INTEGER DEFAULT 0;
        ALTER TABLE tables DROP CONSTRAINT IF EXISTS tables_size_check;
        ALTER TABLE tables ADD CONSTRAINT tables_size_check CHECK (size IN ('small', 'medium', 'large', 'xlarge'));
      `):(await T().query(A),console.log("Database schema created")),await d()})();try{await i}catch(e){throw i=null,e}}},1552:(e,t,a)=>{a.d(t,{nL:()=>r});let r={PX_PER_FOOT:12,DEFAULT_HALL_WIDTH_FT:50,DEFAULT_HALL_HEIGHT_FT:30,MIN_HALL_FT:10,MAX_HALL_FT:500,DEFAULT_STALL_WIDTH_FT:4,DEFAULT_STALL_HEIGHT_FT:2,STALL_MIN_FT:1,STALL_MAX_FT:60,ftToPx:e=>Math.round(1200*(Number(e)||0))/100,pxToFt:e=>Math.round((Number(e)||0)/12*100)/100,toFeet(e,t=0){if(null==e||""===e)return t;let a=parseFloat(e);return isNaN(a)?t:Math.round(100*a)/100},formatFeet(e){let t=Math.round(12*(Number(e)||0)),a=Math.floor(t/12),r=t%12;return 0===r?`${a} ft`:0===a?`${r} in`:`${a} ft ${r} in`},formatFeetShort(e){let t=Math.round(12*(Number(e)||0)),a=Math.floor(t/12),r=t%12;return 0===r?`${a}'`:0===a?`${r}"`:`${a}'${r}"`},formatDims(e,t){return`${this.formatFeetShort(e)} \xd7 ${this.formatFeetShort(t)}`},formatArea(e,t){let a=Math.round((Number(e)||0)*(Number(t)||0));return`${a.toLocaleString("en-IN")} sq ft`},roundFt(e,t=2){let a=Math.pow(10,t);return Math.round((Number(e)||0)*a)/a},clampHallFt(e,t=50){let a=parseFloat(e);return isNaN(a)?t:Math.max(10,Math.min(500,Math.round(100*a)/100))},clampStallFt(e,t=4){let a=parseFloat(e);return isNaN(a)?t:Math.max(1,Math.min(60,Math.round(100*a)/100))}}}};var t=require("../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),r=t.X(0,[276,532,23],()=>a(2171));module.exports=r})();