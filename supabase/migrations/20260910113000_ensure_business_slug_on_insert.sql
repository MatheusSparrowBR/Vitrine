create or replace function public.generate_business_slug(value text) returns text
language plpgsql immutable as $$
declare
  result text;
begin
  result := lower(coalesce(value,''));
  result := translate(result, 'áàãâäéèêëíìîïóòõôöúùûüçñÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇÑ', 'aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn');
  result := regexp_replace(result, '&', ' e ', 'g');
  result := regexp_replace(result, '[^a-z0-9]+', '-', 'g');
  result := regexp_replace(result, '(^-+|-+$)', '', 'g');
  result := left(result, 90);
  if result = '' then result := 'empresa'; end if;
  return result;
end;
$$;

create or replace function public.set_business_slug() returns trigger
language plpgsql security invoker set search_path=public as $$
declare
  base_slug text;
  candidate text;
  suffix integer := 2;
begin
  if nullif(trim(new.slug), '') is not null then
    return new;
  end if;

  base_slug := public.generate_business_slug(new.name);
  candidate := base_slug;

  while exists (
    select 1 from public.businesses b
    where b.city_id = new.city_id
      and b.slug = candidate
      and b.id <> coalesce(new.id, gen_random_uuid())
  ) loop
    candidate := left(base_slug, 84) || '-' || suffix::text;
    suffix := suffix + 1;
  end loop;

  new.slug := candidate;
  return new;
end;
$$;

revoke execute on function public.generate_business_slug(text) from public, anon, authenticated;
revoke execute on function public.set_business_slug() from public, anon, authenticated;

drop trigger if exists businesses_set_slug on public.businesses;
create trigger businesses_set_slug
before insert on public.businesses
for each row execute function public.set_business_slug();
