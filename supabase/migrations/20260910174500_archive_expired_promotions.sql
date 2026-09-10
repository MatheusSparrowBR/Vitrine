-- Limpeza inicial: promoções cujo fim já passou não devem permanecer publicadas.
-- A visibilidade em tempo real continua sendo validada pelo frontend contra ends_at.
update public.promotions
set status='archived', updated_at=now()
where status='published'
  and ends_at is not null
  and ends_at <= now();
