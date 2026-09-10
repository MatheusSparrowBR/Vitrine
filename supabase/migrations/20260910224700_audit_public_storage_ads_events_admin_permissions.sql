begin;

update storage.buckets
set allowed_mime_types=array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']::text[],
    file_size_limit=52428800
where id='business-media';

drop policy if exists "Public can read business media" on storage.objects;
create policy "Public can read active business media"
on storage.objects for select to public
using (
  bucket_id='business-media'
  and exists (
    select 1 from public.businesses b
    where b.id::text=(storage.foldername(name))[1]
      and b.status='active'::business_status
  )
);

drop policy if exists "anon read active ads" on public.advertisements;
create policy "anon read active ads"
on public.advertisements for select to anon
using (
  active=true
  and (starts_at is null or starts_at<=now())
  and (ends_at is null or ends_at>=now())
  and exists (
    select 1 from public.businesses b
    where b.id=advertisements.business_id
      and b.city_id=advertisements.city_id
      and b.status='active'::business_status
  )
  and exists (
    select 1 from public.cities c
    where c.id=advertisements.city_id and c.active=true
  )
);

drop policy if exists "authenticated read ads" on public.advertisements;
create policy "authenticated read ads"
on public.advertisements for select to authenticated
using (
  (
    active=true
    and (starts_at is null or starts_at<=now())
    and (ends_at is null or ends_at>=now())
    and exists (
      select 1 from public.businesses b
      where b.id=advertisements.business_id
        and b.city_id=advertisements.city_id
        and b.status='active'::business_status
    )
    and exists (
      select 1 from public.cities c
      where c.id=advertisements.city_id and c.active=true
    )
  ) or (select private.is_admin())
);

drop policy if exists "public read future active events" on public.events;
create policy "public read future active events"
on public.events for select to anon
using (active=true and event_date >= (now() at time zone 'America/Sao_Paulo')::date);

drop policy if exists "authenticated read future active events or admin" on public.events;
create policy "authenticated read future active events or admin"
on public.events for select to authenticated
using ((active=true and event_date >= (now() at time zone 'America/Sao_Paulo')::date) or (select private.is_admin()));

revoke execute on function public.admin_set_city_active(text,boolean) from authenticated, anon, public;

commit;
