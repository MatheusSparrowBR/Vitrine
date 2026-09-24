drop index if exists public.notifications_user_promotion_type_uidx;

create unique index notifications_user_promotion_type_uidx
on public.notifications(user_id, promotion_id, type);