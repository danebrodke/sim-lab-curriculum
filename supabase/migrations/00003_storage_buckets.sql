-- Create the attachments storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'session-attachments',
  'session-attachments',
  false,
  52428800, -- 50MB
  array[
    'application/pdf',
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'video/mp4'
  ]
);

-- Storage policies
create policy "Editors can upload attachments"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'session-attachments'
    and public.is_editor_or_admin()
  );

create policy "Editors can read attachments"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'session-attachments'
    and public.is_editor_or_admin()
  );

create policy "Editors can delete attachments"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'session-attachments'
    and public.is_editor_or_admin()
  );
