-- Usuários comuns podem cadastrar empresas, mas não podem aprová-las no próprio INSERT.
-- A aprovação/verificação/destaque continuam sob controle administrativo.
create or replace function public.protect_business_moderation_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    if tg_op = 'INSERT' then
      new.status := 'pending'::business_status;
      new.verified := false;
      new.featured := false;
    else
      new.status := old.status;
      new.verified := old.verified;
      new.featured := old.featured;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.protect_business_moderation_fields() from public, anon, authenticated;

drop trigger if exists trg_protect_business_moderation_fields on public.businesses;
create trigger trg_protect_business_moderation_fields
before insert or update of status, verified, featured on public.businesses
for each row execute function public.protect_business_moderation_fields();
