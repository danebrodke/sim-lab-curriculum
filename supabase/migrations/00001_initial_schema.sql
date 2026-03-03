-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- User roles enum
create type user_role as enum ('viewer', 'editor', 'admin');

-- Profiles: extends auth.users with app-specific data
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role user_role not null default 'viewer',
  calendar_token uuid not null default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index idx_profiles_calendar_token on public.profiles(calendar_token);
create unique index idx_profiles_email on public.profiles(email);

-- Academic years (July through June)
create table public.academic_years (
  id uuid primary key default uuid_generate_v4(),
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
create unique index idx_one_current_year
  on public.academic_years(is_current)
  where is_current = true;

-- Sessions: one row per Friday lab session
create table public.sessions (
  id uuid primary key default uuid_generate_v4(),
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  session_date date not null,
  topic text,
  faculty text[] not null default '{}',
  vendor text,
  vendor_contacts jsonb not null default '[]',
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
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id)
);

create index idx_sessions_year_date on public.sessions(academic_year_id, session_date);
create unique index idx_sessions_unique_date_per_year on public.sessions(academic_year_id, session_date);

-- Attachments
create table public.attachments (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_size integer not null,
  mime_type text not null,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index idx_attachments_session on public.attachments(session_id);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.email not like '%@ohsu.edu' then
    raise exception 'Only @ohsu.edu email addresses are allowed';
  end if;

  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    split_part(new.email, '@', 1)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-update updated_at timestamps
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();

create trigger trg_sessions_updated_at
  before update on public.sessions
  for each row execute function public.update_updated_at();

create trigger trg_academic_years_updated_at
  before update on public.academic_years
  for each row execute function public.update_updated_at();
