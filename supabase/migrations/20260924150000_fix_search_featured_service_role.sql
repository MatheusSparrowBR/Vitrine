create or replace function public.protect_search_featured_mode()
returns trigger
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
begin
  if new.search_featured_mode not in ('auto','on','off') then
    raise exception 'Modo de busca em destaque inválido.'
      using errcode='22P02';
  end if;

  if tg_op = 'INSERT' then
    if new.search_featured_mode is distinct from 'auto'
       and not private.is_admin()
       and coalesce(auth.role(),'') <> 'service_role' then
      raise exception 'Somente administradores podem alterar o modo da busca em destaque.'
        using errcode='42501';
    end if;
  elsif tg_op = 'UPDATE' then
    if new.search_featured_mode is distinct from old.search_featured_mode
       and not private.is_admin()
       and coalesce(auth.role(),'') <> 'service_role' then
      raise exception 'Somente administradores podem alterar o modo da busca em destaque.'
        using errcode='42501';
    end if;
  end if;

  new.search_featured := (new.search_featured_mode='on');
  return new;
end;
$$;
