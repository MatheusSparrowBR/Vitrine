-- Allow reviews on active businesses that do not have an owner linked yet.
-- Ownerless catalog businesses are valid public businesses; only an explicitly
-- linked owner should be prevented from reviewing their own business.

create or replace function public.submit_business_review(
  p_business_id uuid,
  p_rating smallint,
  p_comment text default ''
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  uid uuid := auth.uid();
  rid uuid;
  owner_id uuid;
  reviewer text;
  clean text;
begin
  if uid is null then
    raise exception 'Faça login para avaliar uma empresa.';
  end if;

  if p_rating not between 1 and 5 then
    raise exception 'A nota deve estar entre 1 e 5.';
  end if;

  clean := trim(coalesce(p_comment, ''));
  if char_length(clean) > 1000 then
    raise exception 'O comentário deve ter no máximo 1000 caracteres.';
  end if;

  select b.owner_id
    into owner_id
  from public.businesses b
  where b.id = p_business_id
    and b.status = 'active';

  if not found then
    raise exception 'Empresa não encontrada ou indisponível.';
  end if;

  if owner_id is not null and owner_id = uid then
    raise exception 'Você não pode avaliar sua própria empresa.';
  end if;

  select nullif(trim(full_name), '')
    into reviewer
  from public.profiles
  where id = uid;

  reviewer := coalesce(reviewer, 'Usuário do VitrineLocal');

  select id
    into rid
  from public.business_reviews
  where business_id = p_business_id
    and user_id = uid
  limit 1;

  if rid is not null then
    update public.business_reviews
       set reviewer_name = reviewer,
           rating = p_rating,
           comment = clean,
           status = 'published',
           hidden_at = null,
           hidden_reason = null,
           updated_at = now()
     where id = rid;
    return rid;
  end if;

  insert into public.business_reviews(
    business_id,
    user_id,
    reviewer_name,
    rating,
    comment,
    status,
    updated_at
  ) values (
    p_business_id,
    uid,
    reviewer,
    p_rating,
    clean,
    'published',
    now()
  )
  on conflict (business_id, user_id) do update
    set reviewer_name = excluded.reviewer_name,
        rating = excluded.rating,
        comment = excluded.comment,
        status = 'published',
        hidden_at = null,
        hidden_reason = null,
        updated_at = now()
  returning id into rid;

  return rid;
end;
$function$;
