-- The first cycle migration initially bootstrapped from live catalog counts.
-- That would charge existing content again. Usage must represent creations
-- consumed during the current cycle only, so an old resource survives renewal
-- without consuming a unit in the new cycle.
update public.business_plan_usage_cycles u
set used_count = case u.feature
  when 'photos' then (
    select count(*)::integer from public.business_photos ph
    where ph.business_id=u.business_id
      and ph.created_at>=u.cycle_start and ph.created_at<u.cycle_end
  )
  when 'items' then (
    select count(*)::integer from public.business_items i
    where i.business_id=u.business_id
      and i.created_at>=u.cycle_start and i.created_at<u.cycle_end
  )
  when 'promotions' then (
    select count(*)::integer from public.promotions p
    where p.business_id=u.business_id
      and p.created_at>=u.cycle_start and p.created_at<u.cycle_end
  )
end,
updated_at=now();
