-- Supabase Storage policies for bucket "user-uploads"
-- Allow authenticated users to manage files under content/<uid>/...

-- Ensure RLS is enabled on storage.objects (it is by default, but this is safe)
alter table if exists storage.objects enable row level security;

-- SELECT (read) own files
drop policy if exists "Users can read own files in user-uploads" on storage.objects;
create policy "Users can read own files in user-uploads"
on storage.objects for select to authenticated
using (
  bucket_id = 'user-uploads'
  and name like ('content/' || auth.uid() || '/%')
);

-- INSERT (upload) to own folder
drop policy if exists "Users can upload to own folder in user-uploads" on storage.objects;
create policy "Users can upload to own folder in user-uploads"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'user-uploads'
  and name like ('content/' || auth.uid() || '/%')
);

-- DELETE own files
drop policy if exists "Users can delete own files in user-uploads" on storage.objects;
create policy "Users can delete own files in user-uploads"
on storage.objects for delete to authenticated
using (
  bucket_id = 'user-uploads'
  and name like ('content/' || auth.uid() || '/%')
);

-- OPTIONAL: Make files publicly readable (uncomment to allow anon read)
-- drop policy if exists "Public can read files in user-uploads" on storage.objects;
-- create policy "Public can read files in user-uploads"
-- on storage.objects for select to anon
-- using (bucket_id = 'user-uploads');



