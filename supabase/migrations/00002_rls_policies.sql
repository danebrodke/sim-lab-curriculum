-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.academic_years enable row level security;
alter table public.attachments enable row level security;

-- Helper: get current user's role
create or replace function public.get_user_role()
returns user_role
language sql stable security definer set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Helper: check editor or admin
create or replace function public.is_editor_or_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid()
    and role in ('editor', 'admin')
  );
$$;

-- Helper: check admin
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'admin'
  );
$$;

-- PROFILES
create policy "Users can read own profile"
  on public.profiles for select to authenticated
  using (id = auth.uid());

create policy "Admins can read all profiles"
  on public.profiles for select to authenticated
  using (public.is_admin());

create policy "Admins can update profiles"
  on public.profiles for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ACADEMIC_YEARS
create policy "Authenticated users can read academic years"
  on public.academic_years for select to authenticated
  using (true);

create policy "Admins can insert academic years"
  on public.academic_years for insert to authenticated
  with check (public.is_admin());

create policy "Admins can update academic years"
  on public.academic_years for update to authenticated
  using (public.is_admin());

create policy "Admins can delete academic years"
  on public.academic_years for delete to authenticated
  using (public.is_admin());

-- SESSIONS
create policy "Authenticated users can read sessions"
  on public.sessions for select to authenticated
  using (true);

create policy "Editors can insert sessions"
  on public.sessions for insert to authenticated
  with check (public.is_editor_or_admin());

create policy "Editors can update sessions"
  on public.sessions for update to authenticated
  using (public.is_editor_or_admin());

create policy "Admins can delete sessions"
  on public.sessions for delete to authenticated
  using (public.is_admin());

-- ATTACHMENTS
create policy "Editors can read attachments"
  on public.attachments for select to authenticated
  using (public.is_editor_or_admin());

create policy "Editors can insert attachments"
  on public.attachments for insert to authenticated
  with check (public.is_editor_or_admin());

create policy "Editors can delete attachments"
  on public.attachments for delete to authenticated
  using (public.is_editor_or_admin());

-- Calendar feed function (bypasses RLS for public iCal access)
create or replace function public.get_sessions_by_calendar_token(p_token uuid)
returns table (
  session_date date,
  topic text,
  faculty text[],
  vendor text
)
language sql stable security definer set search_path = ''
as $$
  select s.session_date, s.topic, s.faculty, s.vendor
  from public.sessions s
  join public.academic_years ay on s.academic_year_id = ay.id
  join public.profiles p on p.calendar_token = p_token
  where ay.is_current = true
    or ay.start_date >= (current_date - interval '1 year')
  order by s.session_date;
$$;
