-- The owner artwork path is <advertising_request_id>/<uuid>.<ext>.
-- The previous policies incorrectly derived the request id from business.name,
-- which prevented owners from uploading/reading/updating/deleting their own art.

drop policy if exists "Owners upload advertising request art" on storage.objects;
drop policy if exists "Owners read advertising request art" on storage.objects;
drop policy if exists "Owners update advertising request art" on storage.objects;
drop policy if exists "Owners delete advertising request art" on storage.objects;

create policy "Owners upload advertising request art"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'advertising-request-art'
  and exists (
    select 1
    from public.advertising_requests r
    join public.businesses b on b.id = r.business_id
    where r.id::text = (storage.foldername(name))[1]
      and b.owner_id = auth.uid()
  )
);

create policy "Owners read advertising request art"
on storage.objects for select to authenticated
using (
  bucket_id = 'advertising-request-art'
  and exists (
    select 1
    from public.advertising_requests r
    join public.businesses b on b.id = r.business_id
    where r.id::text = (storage.foldername(name))[1]
      and b.owner_id = auth.uid()
  )
);

create policy "Owners update advertising request art"
on storage.objects for update to authenticated
using (
  bucket_id = 'advertising-request-art'
  and exists (
    select 1
    from public.advertising_requests r
    join public.businesses b on b.id = r.business_id
    where r.id::text = (storage.foldername(name))[1]
      and b.owner_id = auth.uid()
  )
)
with check (
  bucket_id = 'advertising-request-art'
  and exists (
    select 1
    from public.advertising_requests r
    join public.businesses b on b.id = r.business_id
    where r.id::text = (storage.foldername(name))[1]
      and b.owner_id = auth.uid()
  )
);

create policy "Owners delete advertising request art"
on storage.objects for delete to authenticated
using (
  bucket_id = 'advertising-request-art'
  and exists (
    select 1
    from public.advertising_requests r
    join public.businesses b on b.id = r.business_id
    where r.id::text = (storage.foldername(name))[1]
      and b.owner_id = auth.uid()
  )
);
