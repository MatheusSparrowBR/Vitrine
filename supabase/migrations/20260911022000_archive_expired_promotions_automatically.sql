create or replace function public.archive_expired_promotions()
returns integer
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_count integer := 0;
begin
  if not private.is_admin() then
    raise exception 'Apenas administradores podem arquivar promoções automaticamente.' using errcode='42501';
  end if;

  update public.promotions
     set status='archived',
         updated_at=now()
   where ends_at is not null
     and ends_at <= now()
     and status in ('published','pending_review');

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.archive_expired_promotions() from public;
grant execute on function public.archive_expired_promotions() to authenticated;

comment on function public.archive_expired_promotions() is 'Move promoções publicadas ou em revisão cujo ends_at já passou para archived.';
