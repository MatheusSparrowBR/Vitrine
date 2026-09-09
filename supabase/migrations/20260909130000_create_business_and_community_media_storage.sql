insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('business-media', 'business-media', true, 52428800, array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm']::text[]),
  ('community-submissions', 'community-submissions', false, 104857600, array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']::text[]),
  ('community-published', 'community-published', true, 104857600, array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']::text[])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

alter table public.business_photos add column if not exists storage_path text;
alter table public.businesses add column if not exists logo_path text;
alter table public.businesses add column if not exists cover_path text;
alter table public.business_items add column if not exists image_path text;
alter table public.promotions add column if not exists image_path text;
alter table public.community_submissions add column if not exists image_path text;
alter table public.community_submissions add column if not exists video_path text;
alter table public.posts add column if not exists image_path text;
alter table public.posts add column if not exists video_path text;

create or replace function public.is_business_owner(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.businesses b
    where b.id = p_business_id and b.owner_id = auth.uid()
  );
$$;

revoke all on function public.is_business_owner(uuid) from public, anon;
grant execute on function public.is_business_owner(uuid) to authenticated;

drop policy if exists "Public can read business media" on storage.objects;
drop policy if exists "Owners can upload business media" on storage.objects;
drop policy if exists "Owners can update business media" on storage.objects;
drop policy if exists "Owners can delete business media" on storage.objects;
drop policy if exists "Admins manage business media" on storage.objects;
create policy "Public can read business media" on storage.objects
for select to public using (bucket_id = 'business-media');
create policy "Owners can upload business media" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'business-media'
  and public.is_business_owner(nullif((storage.foldername(name))[2], '')::uuid)
);
create policy "Owners can update business media" on storage.objects
for update to authenticated
using (bucket_id = 'business-media' and public.is_business_owner(nullif((storage.foldername(name))[2], '')::uuid))
with check (bucket_id = 'business-media' and public.is_business_owner(nullif((storage.foldername(name))[2], '')::uuid));
create policy "Owners can delete business media" on storage.objects
for delete to authenticated
using (bucket_id = 'business-media' and public.is_business_owner(nullif((storage.foldername(name))[2], '')::uuid));
create policy "Admins manage business media" on storage.objects
for all to authenticated
using (bucket_id = 'business-media' and public.is_admin())
with check (bucket_id = 'business-media' and public.is_admin());

drop policy if exists "Users upload community submissions" on storage.objects;
drop policy if exists "Users read own community submissions" on storage.objects;
drop policy if exists "Users delete own community submissions" on storage.objects;
drop policy if exists "Admins manage community submissions media" on storage.objects;
create policy "Users upload community submissions" on storage.objects
for insert to authenticated
with check (bucket_id = 'community-submissions' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users read own community submissions" on storage.objects
for select to authenticated
using (bucket_id = 'community-submissions' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users delete own community submissions" on storage.objects
for delete to authenticated
using (bucket_id = 'community-submissions' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Admins manage community submissions media" on storage.objects
for all to authenticated
using (bucket_id = 'community-submissions' and public.is_admin())
with check (bucket_id = 'community-submissions' and public.is_admin());

drop policy if exists "Public can read published community media" on storage.objects;
drop policy if exists "Admins manage published community media" on storage.objects;
create policy "Public can read published community media" on storage.objects
for select to public using (bucket_id = 'community-published');
create policy "Admins manage published community media" on storage.objects
for all to authenticated
using (bucket_id = 'community-published' and public.is_admin())
with check (bucket_id = 'community-published' and public.is_admin());
