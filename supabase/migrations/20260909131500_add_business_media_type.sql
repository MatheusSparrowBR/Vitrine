alter table public.business_photos add column if not exists media_type text not null default 'image';

alter table public.business_photos drop constraint if exists business_photos_media_type_check;
alter table public.business_photos add constraint business_photos_media_type_check check (media_type in ('image','video'));

create index if not exists business_photos_business_sort_idx on public.business_photos (business_id, sort_order, created_at);
