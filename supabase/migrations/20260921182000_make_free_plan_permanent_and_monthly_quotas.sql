-- Free is a permanent plan. Only monthly consumables renew; stored collections remain capacity-based.
-- Photos and catalog items are limited by the number currently stored.
-- Promotions keep a monthly consumption quota.

create or replace function public.enforce_business_collection_limits()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_key text;
  v_limit integer;
  v_used integer;
begin
  if (select private.is_admin_owned_business(new.business_id)) then
    return new;
  end if;

  if (select private.is_admin()) then
    return new;
  end if;

  if tg_table_name='business_photos' then
    v_key := 'photos';
  elsif tg_table_name='business_items' then
    v_key := 'items';
  elsif tg_table_name='promotions' then
    v_key := 'promotions';
  else
    return new;
  end if;

  if tg_op='UPDATE' and new.business_id=old.business_id then
    return new;
  end if;

  v_limit := public.plan_limit(new.business_id, v_key);

  if v_key in ('photos','items') then
    if v_limit = 0 then
      raise exception 'Recurso não disponível no plano atual.' using errcode='check_violation';
    end if;

    if v_limit > 0 then
      if v_key='photos' then
        select count(*) into v_used
        from public.business_photos
        where business_id=new.business_id;
      else
        select count(*) into v_used
        from public.business_items
        where business_id=new.business_id;
      end if;

      if v_used >= v_limit then
        raise exception 'Capacidade do plano atingida para %. Uso atual: %/%.', v_key, v_used, v_limit
          using errcode='check_violation';
      end if;
    end if;

    return new;
  end if;

  -- Promotions are the monthly consumable in the free/pro/premium plans.
  perform public.consume_plan_cycle_usage(new.business_id, v_key, 1);
  return new;
end;
$function$;

create or replace function public.get_business_collection_usage(p_business_id uuid)
returns table(feature text, used_count integer, limit_count integer, plan_code text)
language plpgsql
stable
security definer
set search_path = public, private, pg_temp
as $function$
declare
  v_plan_id uuid;
  v_plan_code text;
begin
  if not ((select private.is_admin()) or (select private.is_business_owner(p_business_id))) then
    raise exception 'Acesso negado.' using errcode='42501';
  end if;

  v_plan_id := public.get_effective_plan_id(p_business_id);

  select p.code::text
    into v_plan_code
  from public.plans p
  where p.id=v_plan_id
  limit 1;

  return query
    select f.feature,
           case f.feature
             when 'photos' then (select count(*)::integer from public.business_photos where business_id=p_business_id)
             when 'items' then (select count(*)::integer from public.business_items where business_id=p_business_id)
           end,
           public.plan_limit(p_business_id, f.feature),
           coalesce(v_plan_code,'free')
    from (values ('photos'::text),('items'::text)) f(feature)
    order by case f.feature when 'photos' then 1 when 'items' then 2 end;
end;
$function$;