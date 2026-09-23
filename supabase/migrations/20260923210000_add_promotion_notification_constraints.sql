create unique index if not exists notifications_user_promotion_type_uidx
on public.notifications(user_id, promotion_id, type)
where promotion_id is not null;

alter table public.notifications
add constraint notifications_promotion_url_check
check (type <> 'promotion' or promotion_id is not null) not valid;

create index if not exists push_subscriptions_enabled_endpoint_idx
on public.push_subscriptions(endpoint)
where enabled = true;