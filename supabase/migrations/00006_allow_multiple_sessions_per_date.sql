-- Allow multiple sessions on the same date within an academic year
drop index if exists idx_sessions_unique_date_per_year;
