create or replace function public.enforce_promotion_review_workflow()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if tg_op = 'INSERT' then
    if not private.is_admin() then
      new.status := 'pending_review'::post_status;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' and not private.is_admin() then
    if new.status is distinct from old.status then
      if new.status in ('published'::post_status, 'rejected'::post_status) then
        new.status := 'pending_review'::post_status;
      end if;
    elsif old.status = 'published'::post_status
      and (
        new.business_id is distinct from old.business_id
        or new.title is distinct from old.title
        or new.description is distinct from old.description
        or new.image_url is distinct from old.image_url
        or new.price is distinct from old.price
        or new.original_price is distinct from old.original_price
        or new.starts_at is distinct from old.starts_at
        or new.ends_at is distinct from old.ends_at
      ) then
      new.status := 'pending_review'::post_status;
    end if;
  end if;

  return new;
end;
$function$;

update public.promotions
set image_path = regexp_replace(image_url, '^.*/business-media/', '')
where image_path is null
  and image_url like '%/business-media/%';
