-- Mantém o fluxo de moderação no banco, inclusive para inserts/updates feitos diretamente pela API.
create or replace function public.enforce_promotion_review_workflow()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    if tg_op = 'INSERT' then
      new.status := 'pending_review'::post_status;
    elsif tg_op = 'UPDATE' then
      if new.status in ('published'::post_status, 'rejected'::post_status) then
        new.status := 'pending_review'::post_status;
      end if;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_promotion_review_workflow() from public, anon, authenticated;

drop trigger if exists trg_promotions_enforce_review on public.promotions;
create trigger trg_promotions_enforce_review
before insert or update on public.promotions
for each row execute function public.enforce_promotion_review_workflow();
