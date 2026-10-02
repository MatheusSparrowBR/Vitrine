create or replace function public.validate_analytics_event_integrity()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'private', 'pg_temp'
as $function$
begin
  if new.event_type not in (
    'page_view','profile_view','business_click','category_click','promotion_click',
    'event_click','gallery_open','share_click','save_click','whatsapp_click',
    'instagram_click','website_click','banner_impression','banner_click',
    'plan_view','business_signup_start','pwa_install','directions_click'
  ) then
    raise exception 'Tipo de evento analítico inválido.' using errcode='22023';
  end if;

  if length(coalesce(new.session_id,'')) > 200 then
    raise exception 'Identificador de sessão inválido.' using errcode='22023';
  end if;

  if auth.uid() is not null and new.user_id is not null and new.user_id <> auth.uid() then
    raise exception 'Usuário do evento não corresponde à sessão autenticada.' using errcode='42501';
  end if;

  if new.business_id is not null then
    if not exists (
      select 1 from public.businesses b
      where b.id = new.business_id
        and b.status = 'active'
    ) then
      raise exception 'Empresa inválida ou inativa para telemetria.' using errcode='23514';
    end if;

    if new.city_id is not null and not exists (
      select 1 from public.businesses b
      where b.id = new.business_id and b.city_id = new.city_id
    ) then
      raise exception 'Cidade do evento não corresponde à empresa.' using errcode='23514';
    end if;
  elsif new.city_id is not null then
    if not exists (select 1 from public.cities c where c.id = new.city_id and c.active = true) then
      raise exception 'Cidade inválida ou inativa para telemetria.' using errcode='23514';
    end if;
  end if;

  return new;
end;
$function$;

revoke all on function public.validate_analytics_event_integrity() from anon, authenticated;
grant execute on function public.validate_analytics_event_integrity() to anon, authenticated, service_role;
