alter table public.advertising_requests add column if not exists creative_mode text not null default 'self';
alter table public.advertising_requests add column if not exists artwork_path text;
alter table public.advertising_requests add column if not exists artwork_url text;
alter table public.advertising_requests add column if not exists final_price numeric(10,2) not null default 0;
alter table public.advertising_requests add column if not exists payment_status text not null default 'not_ready';
alter table public.advertising_requests add column if not exists payment_currency text not null default 'brl';
alter table public.advertising_requests add column if not exists stripe_checkout_session_id text;
alter table public.advertising_requests add column if not exists stripe_subscription_id text;
alter table public.advertising_requests add column if not exists approved_at timestamptz;
alter table public.advertising_requests add column if not exists paid_at timestamptz;
alter table public.advertising_requests drop constraint if exists advertising_requests_creative_mode_check;
alter table public.advertising_requests add constraint advertising_requests_creative_mode_check check (creative_mode in ('self','design'));
alter table public.advertising_requests drop constraint if exists advertising_requests_payment_status_check;
alter table public.advertising_requests add constraint advertising_requests_payment_status_check check (payment_status in ('not_ready','awaiting_payment','paid','failed','canceled'));
alter table public.advertising_requests drop constraint if exists advertising_requests_final_price_check;
alter table public.advertising_requests add constraint advertising_requests_final_price_check check (final_price >= 0);
create unique index if not exists advertising_requests_checkout_session_uq on public.advertising_requests(stripe_checkout_session_id) where stripe_checkout_session_id is not null;
create unique index if not exists advertising_requests_stripe_subscription_uq on public.advertising_requests(stripe_subscription_id) where stripe_subscription_id is not null;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('advertising-request-art','advertising-request-art',true,10485760,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "Admins manage advertising request art" on storage.objects;
create policy "Admins manage advertising request art" on storage.objects for all to authenticated
using (bucket_id='advertising-request-art' and (select private.is_admin()))
with check (bucket_id='advertising-request-art' and (select private.is_admin()));
drop policy if exists "Owners upload advertising request art" on storage.objects;
create policy "Owners upload advertising request art" on storage.objects for insert to authenticated
with check (bucket_id='advertising-request-art' and exists(select 1 from public.advertising_requests r join public.businesses b on b.id=r.business_id where r.id::text = split_part(name,'/',1) and b.owner_id=(select auth.uid())));
drop policy if exists "Owners read advertising request art" on storage.objects;
create policy "Owners read advertising request art" on storage.objects for select to authenticated
using (bucket_id='advertising-request-art' and exists(select 1 from public.advertising_requests r join public.businesses b on b.id=r.business_id where r.id::text = split_part(name,'/',1) and b.owner_id=(select auth.uid())));
drop policy if exists "Owners update advertising request art" on storage.objects;
create policy "Owners update advertising request art" on storage.objects for update to authenticated
using (bucket_id='advertising-request-art' and exists(select 1 from public.advertising_requests r join public.businesses b on b.id=r.business_id where r.id::text = split_part(name,'/',1) and b.owner_id=(select auth.uid())))
with check (bucket_id='advertising-request-art' and exists(select 1 from public.advertising_requests r join public.businesses b on b.id=r.business_id where r.id::text = split_part(name,'/',1) and b.owner_id=(select auth.uid())));
drop policy if exists "Owners delete advertising request art" on storage.objects;
create policy "Owners delete advertising request art" on storage.objects for delete to authenticated
using (bucket_id='advertising-request-art' and exists(select 1 from public.advertising_requests r join public.businesses b on b.id=r.business_id where r.id::text = split_part(name,'/',1) and b.owner_id=(select auth.uid())));

create or replace function public.owner_set_advertising_request_creative(p_request_id uuid,p_creative_mode text,p_artwork_path text,p_artwork_url text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if p_creative_mode not in ('self','design') then raise exception 'Modo de criação inválido.' using errcode='22023'; end if;
 if p_creative_mode='self' and (p_artwork_path is null or p_artwork_url is null) then raise exception 'A arte é obrigatória quando a empresa escolhe enviar a própria arte.' using errcode='22023'; end if;
 update public.advertising_requests r
 set creative_mode=p_creative_mode,
     artwork_path=case when p_creative_mode='self' then p_artwork_path else null end,
     artwork_url=case when p_creative_mode='self' then p_artwork_url else null end,
     updated_at=now()
 where r.id=p_request_id
   and r.status='pending'
   and exists(select 1 from public.businesses b where b.id=r.business_id and b.owner_id=(select auth.uid()) and private.business_has_feature(b.id,'premium_ads'));
 if not found then raise exception 'Solicitação não encontrada, já está em análise ou não pertence a uma empresa Premium.' using errcode='42501'; end if;
end; $$;
revoke all on function public.owner_set_advertising_request_creative(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.owner_set_advertising_request_creative(uuid,text,text,text) to authenticated;

create or replace function public.sync_advertising_request_approval() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.status='approved' and old.status is distinct from 'approved' then
   new.approved_at=coalesce(new.approved_at,now());
   if new.final_price>0 then new.payment_status='awaiting_payment'; end if;
 elsif new.status='rejected' and old.status is distinct from 'rejected' then
   new.payment_status='canceled';
 end if;
 return new;
end; $$;
drop trigger if exists advertising_requests_approval_sync on public.advertising_requests;
create trigger advertising_requests_approval_sync before update on public.advertising_requests for each row execute function public.sync_advertising_request_approval();
revoke all on function public.sync_advertising_request_approval() from public,anon,authenticated;

alter table public.advertisements add column if not exists advertising_request_id uuid references public.advertising_requests(id) on delete set null;
create unique index if not exists advertisements_request_uq on public.advertisements(advertising_request_id) where advertising_request_id is not null;
create index if not exists advertisements_paid_schedule_idx on public.advertisements(billing_status,active,starts_at,ends_at);
