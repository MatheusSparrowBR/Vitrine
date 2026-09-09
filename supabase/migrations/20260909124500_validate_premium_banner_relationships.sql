create or replace function public.validate_advertisement_business_city()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.businesses b
    where b.id = new.business_id
      and b.city_id = new.city_id
      and b.status = 'active'
  ) then
    raise exception 'Advertisement business must be active and belong to the selected city';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_advertisement_business_city on public.advertisements;
create trigger validate_advertisement_business_city
before insert or update of business_id, city_id on public.advertisements
for each row execute function public.validate_advertisement_business_city();
