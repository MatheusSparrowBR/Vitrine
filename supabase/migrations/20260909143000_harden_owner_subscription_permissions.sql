-- Keep ownership/moderation boundaries enforced at the database layer.

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') then
    new.role := old.role;
  end if;
  return new;
end;
$$;

revoke all on function public.protect_profile_role() from public, anon, authenticated;

drop trigger if exists trg_protect_profile_role on public.profiles;
create trigger trg_protect_profile_role
before update of role on public.profiles
for each row execute function public.protect_profile_role();

create or replace function public.protect_business_moderation_fields()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') then
    new.status := old.status;
    new.verified := old.verified;
    new.featured := old.featured;
  end if;
  return new;
end;
$$;

revoke all on function public.protect_business_moderation_fields() from public, anon, authenticated;

drop trigger if exists trg_protect_business_moderation_fields on public.businesses;
create trigger trg_protect_business_moderation_fields
before update of status, verified, featured on public.businesses
for each row execute function public.protect_business_moderation_fields();

revoke insert, update, delete on public.subscriptions from authenticated;
drop policy if exists "users insert own subscriptions" on public.subscriptions;
drop policy if exists "users update own subscriptions" on public.subscriptions;
drop policy if exists "users delete own subscriptions" on public.subscriptions;

grant select on public.subscriptions to authenticated;
