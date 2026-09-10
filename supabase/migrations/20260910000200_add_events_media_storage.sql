-- Public event covers are readable by everyone, but uploads are admin-only.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('events-media','events-media',true,10485760,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set
  name=excluded.name,
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "Public can read event media" on storage.objects;
drop policy if exists "Admins manage event media" on storage.objects;

create policy "Public can read event media"
on storage.objects for select
to public
using (bucket_id = 'events-media');

create policy "Admins manage event media"
on storage.objects for all
to authenticated
using (bucket_id = 'events-media' and public.is_admin())
with check (bucket_id = 'events-media' and public.is_admin());
