delete from public.categories
where slug = 'teste'
  and not exists (
    select 1 from public.businesses b where b.category_id = public.categories.id
  );
