begin;

alter table public.cities
  add column if not exists home_background_url text,
  add column if not exists home_background_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'city-home-media',
  'city-home-media',
  true,
  15728640,
  array['image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read active city home media" on storage.objects;
create policy "Public can read active city home media"
on storage.objects
for select to public
using (
  bucket_id = 'city-home-media'
  and exists (
    select 1
    from public.cities c
    where c.id::text = (storage.foldername(objects.name))[1]
      and c.active = true
  )
);

drop policy if exists "Admins manage city home media" on storage.objects;
create policy "Admins manage city home media"
on storage.objects
for all to authenticated
using (
  bucket_id = 'city-home-media'
  and public.is_admin()
)
with check (
  bucket_id = 'city-home-media'
  and public.is_admin()
);

grant select on table public.cities to anon, authenticated;

commit;
