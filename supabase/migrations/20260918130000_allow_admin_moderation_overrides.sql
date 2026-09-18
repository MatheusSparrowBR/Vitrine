-- Admin moderation actions must be authoritative for featured and verified flags.
-- Plan synchronization still applies the effective plan when it explicitly opts in
-- through vitrine.plan_sync, while a manual admin action is preserved.

create or replace function public.enforce_paid_business_entitlements()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $function$
begin
  if current_setting('vitrine.plan_sync', true) = 'on' then
    new.verified := coalesce(public.plan_feature_enabled(new.id, 'verified'), false);
    new.featured := coalesce(public.plan_feature_enabled(new.id, 'featured'), false);
    return new;
  end if;

  -- Administrators are the moderation authority and may explicitly enable or
  -- disable these flags regardless of the company's commercial plan.
  if private.is_admin() then
    return new;
  end if;

  if coalesce(public.plan_feature_enabled(new.id, 'verified'), false) then
    new.verified := true;
  elsif coalesce(new.verified, false) then
    raise exception 'Selo de verificação disponível apenas nos planos Pro e Premium.' using errcode = 'check_violation';
  end if;
  if coalesce(public.plan_feature_enabled(new.id, 'featured'), false) then
    new.featured := true;
  elsif coalesce(new.featured, false) then
    raise exception 'Destaque nas buscas disponível apenas nos planos Pro e Premium.' using errcode = 'check_violation';
  end if;
  return new;
end;
$function$;
