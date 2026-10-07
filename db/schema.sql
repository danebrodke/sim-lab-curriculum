-- OHSU Sim Lab schema (Neon Postgres)
-- Apply with: psql "$DATABASE_URL" -f db/schema.sql
--
-- Authorization is enforced in the Next.js API routes (src/lib/api.ts);
-- the database is only reachable server-side, so there is no RLS.

-- ============================================================
-- Auth tables (Better Auth, see src/lib/auth.ts)
-- ============================================================

create table auth_users (
  "id" uuid default gen_random_uuid() not null primary key,
  "name" text not null,
  "email" text not null unique,
  "emailVerified" boolean not null,
  "image" text,
  "createdAt" timestamptz default current_timestamp not null,
  "updatedAt" timestamptz default current_timestamp not null
);

create table auth_sessions (
  "id" uuid default gen_random_uuid() not null primary key,
  "expiresAt" timestamptz not null,
  "token" text not null unique,
  "createdAt" timestamptz default current_timestamp not null,
  "updatedAt" timestamptz not null,
  "ipAddress" text,
  "userAgent" text,
  "userId" uuid not null references auth_users ("id") on delete cascade
);

create table auth_accounts (
  "id" uuid default gen_random_uuid() not null primary key,
  "accountId" text not null,
  "providerId" text not null,
  "userId" uuid not null references auth_users ("id") on delete cascade,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  "scope" text,
  "password" text,
  "createdAt" timestamptz default current_timestamp not null,
  "updatedAt" timestamptz not null
);

create table auth_verifications (
  "id" uuid default gen_random_uuid() not null primary key,
  "identifier" text not null,
  "value" text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz default current_timestamp not null,
  "updatedAt" timestamptz default current_timestamp not null
);

create index "auth_sessions_userId_idx" on auth_sessions ("userId");
create index "auth_accounts_userId_idx" on auth_accounts ("userId");
create index "auth_verifications_identifier_idx" on auth_verifications ("identifier");

-- ============================================================
-- App tables
-- ============================================================

create type user_role as enum ('viewer', 'editor', 'admin');

-- Profiles: app-specific data for each auth user
create table profiles (
  id uuid primary key references auth_users ("id") on delete cascade,
  email text not null,
  display_name text,
  role user_role not null default 'viewer',
  calendar_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index idx_profiles_calendar_token on profiles (calendar_token);
create unique index idx_profiles_email on profiles (email);

-- Academic years (July through June)
create table academic_years (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  start_date date not null,
  end_date date not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_date_range check (end_date > start_date),
  constraint valid_label_format check (label ~ '^\d{4}-\d{4}$')
);

-- Only one year can be current
create unique index idx_one_current_year on academic_years (is_current) where is_current = true;

-- Sessions: Friday lab sessions (multiple allowed per date)
create table sessions (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references academic_years (id) on delete cascade,
  session_date date not null,
  session_type text not null default 'simulation',
  topic text,
  faculty text[] not null default '{}',
  vendor text,
  vendor_contacts jsonb not null default '[]',
  links jsonb not null default '[]',
  equipment text[] not null default '{}',
  tissue text,
  bdp_superficial text,
  bdp_compartments text,
  bdp_bony_structures text,
  bdp_vasculature text,
  collaboration text,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles (id),
  updated_by uuid references profiles (id)
);

create index idx_sessions_year_date on sessions (academic_year_id, session_date);

-- Attachments (files live in Neon Object Storage bucket "session-attachments")
create table attachments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions (id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_size integer not null,
  mime_type text not null,
  uploaded_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create index idx_attachments_session on attachments (session_id);

-- ============================================================
-- Triggers
-- ============================================================

-- Auto-create a profile when an auth user is created
create function handle_new_user()
returns trigger
language plpgsql
as $$
begin
  insert into profiles (id, email, display_name)
  values (new."id", new."email", split_part(new."email", '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth_users
  for each row execute function handle_new_user();

-- Auto-update updated_at timestamps
create function update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

create trigger trg_sessions_updated_at
  before update on sessions
  for each row execute function update_updated_at();

create trigger trg_academic_years_updated_at
  before update on academic_years
  for each row execute function update_updated_at();
