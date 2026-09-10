-- Keep promotion storage paths in sync with existing public URLs.
update public.promotions
set image_path = regexp_replace(image_url, '^.*/business-media/', '')
where image_path is null
  and image_url like '%/business-media/%';

alter table public.promotions
drop constraint if exists promotions_valid_period_check;

alter table public.promotions
add constraint promotions_valid_period_check
check (starts_at is null or ends_at is null or ends_at > starts_at);

create index if not exists promotions_public_schedule_idx
on public.promotions (status, starts_at, ends_at, business_id);
