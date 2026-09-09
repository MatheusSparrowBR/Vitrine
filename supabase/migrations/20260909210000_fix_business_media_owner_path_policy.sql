drop policy if exists "Owners can upload business media" on storage.objects;
drop policy if exists "Owners can update business media" on storage.objects;
drop policy if exists "Owners can delete business media" on storage.objects;

create policy "Owners can upload business media"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'business-media'
  and (select private.is_business_owner((nullif((storage.foldername(objects.name))[1], ''))::uuid))
);

create policy "Owners can update business media"
on storage.objects for update to authenticated
using (
  bucket_id = 'business-media'
  and (select private.is_business_owner((nullif((storage.foldername(objects.name))[1], ''))::uuid))
)
with check (
  bucket_id = 'business-media'
  and (select private.is_business_owner((nullif((storage.foldername(objects.name))[1], ''))::uuid))
);

create policy "Owners can delete business media"
on storage.objects for delete to authenticated
using (
  bucket_id = 'business-media'
  and (select private.is_business_owner((nullif((storage.foldername(objects.name))[1], ''))::uuid))
);