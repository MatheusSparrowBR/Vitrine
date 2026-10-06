begin;

drop policy if exists "Public can read active city home media" on storage.objects;

create policy "Public can read active city home media"
on storage.objects
for select to public
using (
  bucket_id = 'city-home-media'
  and exists (
    select 1
    from public.cities c
    where c.id::text = case
      when (storage.foldername(objects.name))[1] = 'city'
        then (storage.foldername(objects.name))[2]
      else (storage.foldername(objects.name))[1]
    end
    and c.active = true
  )
);

commit;
