create or replace function public.admin_set_city_active(p_city_slug text, p_active boolean)
returns public.cities
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.cities;
begin
  if not public.is_admin() then
    raise exception 'Acesso restrito';
  end if;

  update public.cities
  set active = p_active,
      updated_at = now()
  where slug = p_city_slug
  returning * into result;

  if result.id is null then
    raise exception 'Cidade não encontrada';
  end if;

  return result;
end;
$$;

revoke all on function public.admin_set_city_active(text, boolean) from public, anon;
grant execute on function public.admin_set_city_active(text, boolean) to authenticated;
