"use strict";(()=>{var e={};e.id=260,e.ids=[260],e.modules={2934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},4580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},5869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},4300:e=>{e.exports=require("buffer")},6113:e=>{e.exports=require("crypto")},2781:e=>{e.exports=require("stream")},3837:e=>{e.exports=require("util")},5200:(e,t,a)=>{a.r(t),a.d(t,{originalPathname:()=>h,patchFetch:()=>m,requestAsyncStorage:()=>d,routeModule:()=>L,serverHooks:()=>c,staticGenerationAsyncStorage:()=>A});var r={};a.r(r),a.d(r,{GET:()=>u,POST:()=>N});var n=a(9303),s=a(8716),i=a(670),l=a(7070),o=a(1103),E=a(1552),T=a(9178);async function u(e,{params:t}){try{let e=parseInt(t.id);if(isNaN(e))return l.NextResponse.json({error:"Invalid event ID"},{status:400});let a=await (0,o.Mj)("SELECT * FROM tables WHERE event_id = $1 ORDER BY id ASC",[e]);return l.NextResponse.json(a)}catch(e){return l.NextResponse.json({error:e.message||"Failed to fetch tables"},{status:500})}}async function N(e,{params:t}){try{if(!await (0,T.Gg)())return l.NextResponse.json({error:"Unauthorized"},{status:401});let a=parseInt(t.id),{tables:r,hall_elements:n,hall_width:s,hall_height:i,hall_rotation:u,name:N,venue:L}=await e.json();if(!Array.isArray(r))return l.NextResponse.json({error:"Tables array is required"},{status:400});let d=await (0,o.mY)("SELECT * FROM events WHERE id = $1",[a]);if(!d)return l.NextResponse.json({error:"Event not found"},{status:404});let A=s?E.nL.clampHallFt(s,d.hall_width):d.hall_width,c=i?E.nL.clampHallFt(i,d.hall_height):d.hall_height,h=Number.isInteger(u)?u%360:d.hall_rotation||0,m=Array.isArray(n)?JSON.stringify(n):d.hall_elements?JSON.stringify(d.hall_elements):"[]",_=Array.isArray(n)?n.find(e=>"room_badge"===e.type):null,p=N&&N.trim()||(_&&(_.label||_.text)?String(_.label||_.text).trim():d.name),b=void 0!==L?L:d.venue,I=await (0,o.ZG)(async e=>{await e.query(`
        UPDATE events SET
          name = $1,
          venue = $2,
          hall_width = $3,
          hall_height = $4,
          hall_rotation = $5,
          hall_elements = $6::jsonb
        WHERE id = $7
      `,[p,b,A,c,h,m,a]);let t=[],s=A,i=c,l=0;for(let o of(Array.isArray(n)&&n.forEach(e=>{if("hall_room"===e.type&&void 0!==e.x&&void 0!==e.width){let t=(e.x||0)+(e.width||30),a=(e.y||0)+(e.height||20);t>s&&(s=t),a>i&&(i=a),e.x<l&&(l=e.x)}}),r)){let r=String(o.table_number||"").trim();if(!r)continue;let n=E.nL.clampStallFt(o.width,E.nL.DEFAULT_STALL_WIDTH_FT),T=E.nL.clampStallFt(o.height,E.nL.DEFAULT_STALL_HEIGHT_FT),u=Number(o.rotation||0)%360,N=90===u||270===u,L=N?T:n,d=N?n:T,A=Math.max(l-30,Math.min(s+30-L,Number(o.x)||0)),c=Math.max(-30,Math.min(i+30-d,Number(o.y)||0)),h=await e.query("SELECT * FROM tables WHERE event_id = $1 AND table_number = $2",[a,r]);if(h.rows.length>0){let t=h.rows[0],a="booked"===t.status?"booked":o.status||"available";await e.query(`
            UPDATE tables SET
              label = $1,
              size = $2,
              price = $3,
              x = $4,
              y = $5,
              width = $6,
              height = $7,
              rotation = $8,
              shape = $9,
              status = $10
            WHERE id = $11
          `,[o.label||"",o.size||"medium",parseFloat(o.price)||0,E.nL.roundFt(A),E.nL.roundFt(c),n,T,u,o.shape||"rect",a,t.id])}else await e.query(`
            INSERT INTO tables (
              event_id, table_number, label, size, price, x, y, width, height, rotation, shape, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          `,[a,r,o.label||"",o.size||"medium",parseFloat(o.price)||0,E.nL.roundFt(A),E.nL.roundFt(c),n,T,u,o.shape||"rect",o.status||"available"]);t.push(r)}t.length>0?await e.query(`
          DELETE FROM tables
          WHERE event_id = $1
            AND table_number != ALL($2::text[])
            AND status != 'booked'
        `,[a,t]):await e.query("DELETE FROM tables WHERE event_id = $1 AND status != 'booked'",[a]);let o=await e.query("SELECT * FROM tables WHERE event_id = $1 ORDER BY id ASC",[a]),T=await e.query("SELECT * FROM events WHERE id = $1",[a]);return{tables:o.rows,event:T.rows[0]}});return l.NextResponse.json(I)}catch(e){return console.error("Tables POST save error:",e),l.NextResponse.json({error:e.message||"Failed to save layout"},{status:500})}}let L=new n.AppRouteRouteModule({definition:{kind:s.x.APP_ROUTE,page:"/api/events/[id]/tables/route",pathname:"/api/events/[id]/tables",filename:"route",bundlePath:"app/api/events/[id]/tables/route"},resolvedPagePath:"D:\\TableBookWebsite\\app\\api\\events\\[id]\\tables\\route.ts",nextConfigOutput:"",userland:r}),{requestAsyncStorage:d,staticGenerationAsyncStorage:A,serverHooks:c}=L,h="/api/events/[id]/tables/route";function m(){return(0,i.patchFetch)({serverHooks:c,staticGenerationAsyncStorage:A})}},9178:(e,t,a)=>{a.d(t,{Gg:()=>E,MY:()=>T,fT:()=>o,i:()=>u});var r=a(1482),n=a.n(r),s=a(1615);let i=process.env.JWT_SECRET||"tablebook-secret-key-super-secure-change-in-prod",l="admin_token";function o(e){return n().sign({id:e.id,username:e.username,role:e.role},i,{expiresIn:"7d"})}async function E(){let e=(0,s.cookies)(),t=e.get(l)?.value;return t?function(e){try{return n().verify(e,i)}catch(e){return null}}(t):null}async function T(e){(0,s.cookies)().set(l,e,{httpOnly:!0,secure:!0,sameSite:"lax",maxAge:604800,path:"/"})}async function u(){(0,s.cookies)().delete(l)}},1103:(e,t,a)=>{a.d(t,{Mj:()=>T,mY:()=>u,Xy:()=>N,ZG:()=>L});let r=require("pg");var n=a(2023),s=a.n(n);r.types.setTypeParser(20,e=>null===e?null:parseInt(e,10));let i=null,l=null;function o(){if(i)return i;let e=function(e){let t=(e||"").trim();(t.startsWith('"')&&t.endsWith('"')||t.startsWith("'")&&t.endsWith("'"))&&(t=t.slice(1,-1).trim());let a=t.indexOf("://");if(-1!==a){let e=t.indexOf(":",a+3),r=t.lastIndexOf("@");if(-1!==e&&-1!==r&&r>e){let a=t.substring(0,e+1),n=t.substring(e+1,r),s=t.substring(r);n.includes("@")&&(t=`${a}${n.replace(/@/g,"%40")}${s}`)}}return t}(process.env.DATABASE_URL);if(!e)throw Error("DATABASE_URL environment variable is not configured.");return(i=new r.Pool({connectionString:e,ssl:{rejectUnauthorized:!1},max:Number(process.env.PG_POOL_MAX||5),idleTimeoutMillis:1e4,connectionTimeoutMillis:1e4})).on("error",e=>console.error("Unexpected Postgres pool error:",e)),i}async function E(e,t=[]){return await c(),o().query(e,t)}async function T(e,t=[]){let{rows:a}=await E(e,t);return a}async function u(e,t=[]){let{rows:a}=await E(e,t);return a.length?a[0]:null}async function N(e,t=[]){let{rowCount:a,rows:r}=await E(e,t);return{rowCount:a,rows:r,row:r.length?r[0]:null}}async function L(e){await c();let t=await o().connect();try{await t.query("BEGIN");let a=await e(t);return await t.query("COMMIT"),a}catch(e){throw await t.query("ROLLBACK"),e}finally{t.release()}}let d=`
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
`;async function A(){let e=process.env.ADMIN_USERNAME||"admin",t=process.env.ADMIN_PASSWORD||"admin123",{rows:a}=await o().query("SELECT id FROM admins WHERE username = $1",[e]);if(!a||0===a.length){let a=s().hashSync(t,10);await o().query("INSERT INTO admins (username, password_hash) VALUES ($1, $2)",[e,a]),console.log(`Default admin account seeded: ${e}`)}}async function c(){if(l)return l;l=(async()=>{let{rows:e}=await o().query("SELECT to_regclass('public.events') AS table_name");e&&e[0]&&e[0].table_name?await o().query(`
        ALTER TABLE events ADD COLUMN IF NOT EXISTS hall_elements JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE events ADD COLUMN IF NOT EXISTS hall_rotation INTEGER DEFAULT 0;
        ALTER TABLE tables DROP CONSTRAINT IF EXISTS tables_size_check;
        ALTER TABLE tables ADD CONSTRAINT tables_size_check CHECK (size IN ('small', 'medium', 'large', 'xlarge'));
      `):(await o().query(d),console.log("Database schema created")),await A()})();try{await l}catch(e){throw l=null,e}}},1552:(e,t,a)=>{a.d(t,{nL:()=>r});let r={PX_PER_FOOT:12,DEFAULT_HALL_WIDTH_FT:50,DEFAULT_HALL_HEIGHT_FT:30,MIN_HALL_FT:10,MAX_HALL_FT:500,DEFAULT_STALL_WIDTH_FT:4,DEFAULT_STALL_HEIGHT_FT:2,STALL_MIN_FT:1,STALL_MAX_FT:60,ftToPx:e=>Math.round(1200*(Number(e)||0))/100,pxToFt:e=>Math.round((Number(e)||0)/12*100)/100,toFeet(e,t=0){if(null==e||""===e)return t;let a=parseFloat(e);return isNaN(a)?t:Math.round(100*a)/100},formatFeet(e){let t=Math.round(12*(Number(e)||0)),a=Math.floor(t/12),r=t%12;return 0===r?`${a} ft`:0===a?`${r} in`:`${a} ft ${r} in`},formatFeetShort(e){let t=Math.round(12*(Number(e)||0)),a=Math.floor(t/12),r=t%12;return 0===r?`${a}'`:0===a?`${r}"`:`${a}'${r}"`},formatDims(e,t){return`${this.formatFeetShort(e)} \xd7 ${this.formatFeetShort(t)}`},formatArea(e,t){let a=Math.round((Number(e)||0)*(Number(t)||0));return`${a.toLocaleString("en-IN")} sq ft`},roundFt(e,t=2){let a=Math.pow(10,t);return Math.round((Number(e)||0)*a)/a},clampHallFt(e,t=50){let a=parseFloat(e);return isNaN(a)?t:Math.max(10,Math.min(500,Math.round(100*a)/100))},clampStallFt(e,t=4){let a=parseFloat(e);return isNaN(a)?t:Math.max(1,Math.min(60,Math.round(100*a)/100))}}}};var t=require("../../../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),r=t.X(0,[276,532,23],()=>a(5200));module.exports=r})();