-- Aviso automático ao publicar uma promoção para quem segue ou salvou a empresa.
alter table public.promotions
  add column if not exists notify_on_publish boolean not null default true;
