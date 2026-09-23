-- Optional direct link to the business page on iFood.
alter table public.businesses
  add column if not exists ifood_url text;
