-- Prevent non-admin users from changing moderation status fields directly.
-- Profile editing remains available for public profile fields only.

create or replace function public.protect_profile_moderation_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(current_setting('vitrine.allow_moderation_change', true), '') <> 'true'
     and auth.uid() is not null
     and not exists (
       select 1 from public.profiles p
       where p.id = auth.uid() and p.role = 'admin'
     ) then
    new.account_status := old.account_status;
    new.status_reason := old.status_reason;
    new.status_updated_at := old.status_updated_at;
    new.status_updated_by := old.status_updated_by;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_moderation_status on public.profiles;
create trigger trg_protect_profile_moderation_status
before update of account_status,status_reason,status_updated_at,status_updated_by on public.profiles
for each row execute function public.protect_profile_moderation_fields();

revoke execute on function public.protect_profile_moderation_fields() from public, anon, authenticated;
