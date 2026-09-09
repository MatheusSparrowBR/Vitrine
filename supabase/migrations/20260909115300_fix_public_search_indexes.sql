create index if not exists businesses_name_idx on public.businesses using btree (lower(name));
create index if not exists categories_name_idx on public.categories using btree (lower(name));
create index if not exists cities_name_idx on public.cities using btree (lower(name));
