// One-off: copy app data (and optionally attachment files) from Supabase to Neon.
//
// 1. Export from Supabase SQL editor (save the single JSON value to export.json):
//      select json_build_object(
//        'profiles', (select json_agg(p) from public.profiles p),
//        'academic_years', (select json_agg(y) from public.academic_years y),
//        'sessions', (select json_agg(s) from public.sessions s),
//        'attachments', (select json_agg(a) from public.attachments a));
// 2. node --env-file=.env.local scripts/migrate-from-supabase.mjs export.json
//    (DATABASE_URL + S3_* required; NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
//    optional, used only to copy attachment files from Supabase Storage)
//
// Users are recreated from `profiles` (same UUIDs, roles, calendar tokens).
// Passwords are not copied; users sign in with an email code and can set a new
// password from the user menu.

import { readFileSync } from 'node:fs';
import pg from 'pg';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'session-attachments';

const supabaseHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

const exportData = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const profiles = exportData.profiles ?? [];
const years = exportData.academic_years ?? [];
const sessions = exportData.sessions ?? [];
const attachments = exportData.attachments ?? [];
console.log(
  `Supabase: ${profiles.length} profiles, ${years.length} years, ${sessions.length} sessions, ${attachments.length} attachments`
);

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  await client.query('begin');
  await client.query('alter table profiles disable trigger trg_profiles_updated_at');
  await client.query('alter table sessions disable trigger trg_sessions_updated_at');
  await client.query('alter table academic_years disable trigger trg_academic_years_updated_at');

  for (const p of profiles) {
    await client.query(
      `insert into auth_users ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
       values ($1, $2, lower($3), true, $4, $5)`,
      [p.id, p.display_name || p.email.split('@')[0], p.email, p.created_at, p.updated_at]
    );
  }

  // The auth_users trigger created default profiles; overwrite with the real data
  await client.query(
    `insert into profiles
     select * from jsonb_populate_recordset(null::profiles, $1::jsonb)
     on conflict (id) do update set
       email = excluded.email, display_name = excluded.display_name, role = excluded.role,
       calendar_token = excluded.calendar_token, created_at = excluded.created_at,
       updated_at = excluded.updated_at`,
    [JSON.stringify(profiles)]
  );

  await client.query(
    `insert into academic_years select * from jsonb_populate_recordset(null::academic_years, $1::jsonb)`,
    [JSON.stringify(years)]
  );
  await client.query(
    `insert into sessions select * from jsonb_populate_recordset(null::sessions, $1::jsonb)`,
    [JSON.stringify(sessions)]
  );
  await client.query(
    `insert into attachments select * from jsonb_populate_recordset(null::attachments, $1::jsonb)`,
    [JSON.stringify(attachments)]
  );

  await client.query('alter table profiles enable trigger trg_profiles_updated_at');
  await client.query('alter table sessions enable trigger trg_sessions_updated_at');
  await client.query('alter table academic_years enable trigger trg_academic_years_updated_at');
  await client.query('commit');
} catch (err) {
  await client.query('rollback');
  throw err;
}

// Copy attachment files (only if a working Supabase service key is provided)
const s3 = new S3Client({
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

for (const a of SERVICE_KEY ? attachments : []) {
  const path = a.file_path.split('/').map(encodeURIComponent).join('/');
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    headers: supabaseHeaders,
  });
  if (!res.ok) throw new Error(`download ${a.file_path}: ${res.status} ${await res.text()}`);
  const body = Buffer.from(await res.arrayBuffer());
  await s3.send(
    new PutObjectCommand({ Bucket: BUCKET, Key: a.file_path, Body: body, ContentType: a.mime_type })
  );
  console.log(`Copied ${a.file_path} (${body.length} bytes)`);
}

const { rows } = await client.query(`select
  (select count(*) from auth_users) users, (select count(*) from profiles) profiles,
  (select count(*) from academic_years) years, (select count(*) from sessions) sessions,
  (select count(*) from attachments) attachments`);
console.log('Neon:', rows[0]);
await client.end();
