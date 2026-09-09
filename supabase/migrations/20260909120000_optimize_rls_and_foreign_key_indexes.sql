drop policy if exists "public read active businesses" on public.businesses;
drop policy if exists "admins read all businesses" on public.businesses;
drop policy if exists "owners update businesses" on public.businesses;
drop policy if exists "admins update all businesses" on public.businesses;
drop policy if exists "owners delete businesses" on public.businesses;
drop policy if exists "admins delete all businesses" on public.businesses;
create policy "anon read active businesses" on public.businesses for select to anon using(status='active');
create policy "authenticated read active or admin businesses" on public.businesses for select to authenticated using(status='active' or public.is_admin());
create policy "owners or admins update businesses" on public.businesses for update to authenticated using((select auth.uid())=owner_id or public.is_admin()) with check((select auth.uid())=owner_id or public.is_admin());
create policy "owners or admins delete businesses" on public.businesses for delete to authenticated using((select auth.uid())=owner_id or public.is_admin());

drop policy if exists "public read business photos" on public.business_photos;
drop policy if exists "owners manage business photos" on public.business_photos;
create policy "anon read business photos" on public.business_photos for select to anon using(exists(select 1 from public.businesses b where b.id=business_id and b.status='active'));
create policy "authenticated read business photos" on public.business_photos for select to authenticated using(exists(select 1 from public.businesses b where b.id=business_id and (b.status='active' or b.owner_id=(select auth.uid()) or public.is_admin())));
create policy "owners or admins insert business photos" on public.business_photos for insert to authenticated with check(exists(select 1 from public.businesses b where b.id=business_id and (b.owner_id=(select auth.uid()) or public.is_admin())));
create policy "owners or admins update business photos" on public.business_photos for update to authenticated using(exists(select 1 from public.businesses b where b.id=business_id and (b.owner_id=(select auth.uid()) or public.is_admin()))) with check(exists(select 1 from public.businesses b where b.id=business_id and (b.owner_id=(select auth.uid()) or public.is_admin())));
create policy "owners or admins delete business photos" on public.business_photos for delete to authenticated using(exists(select 1 from public.businesses b where b.id=business_id and (b.owner_id=(select auth.uid()) or public.is_admin())));

drop policy if exists "public read active business items" on public.business_items;
drop policy if exists "owners manage business items" on public.business_items;
create policy "anon read active business items" on public.business_items for select to anon using(active=true and exists(select 1 from public.businesses b where b.id=business_id and b.status='active'));
create policy "authenticated read business items" on public.business_items for select to authenticated using(active=true and exists(select 1 from public.businesses b where b.id=business_id and (b.status='active' or b.owner_id=(select auth.uid()) or public.is_admin())));
create policy "owners or admins insert business items" on public.business_items for insert to authenticated with check(exists(select 1 from public.businesses b where b.id=business_id and (b.owner_id=(select auth.uid()) or public.is_admin())));
create policy "owners or admins update business items" on public.business_items for update to authenticated using(exists(select 1 from public.businesses b where b.id=business_id and (b.owner_id=(select auth.uid()) or public.is_admin()))) with check(exists(select 1 from public.businesses b where b.id=business_id and (b.owner_id=(select auth.uid()) or public.is_admin())));
create policy "owners or admins delete business items" on public.business_items for delete to authenticated using(exists(select 1 from public.businesses b where b.id=business_id and (b.owner_id=(select auth.uid()) or public.is_admin())));

drop policy if exists "public read published promotions" on public.promotions;
drop policy if exists "owners manage promotions" on public.promotions;
create policy "anon read published promotions" on public.promotions for select to anon using(status='published' and (ends_at is null or ends_at>=now()));
create policy "authenticated read promotions" on public.promotions for select to authenticated using((status='published' and (ends_at is null or ends_at>=now())) or exists(select 1 from public.businesses b where b.id=business_id and (b.owner_id=(select auth.uid()) or public.is_admin())));
create policy "owners or admins insert promotions" on public.promotions for insert to authenticated with check(exists(select 1 from public.businesses b where b.id=business_id and (b.owner_id=(select auth.uid()) or public.is_admin())));
create policy "owners or admins update promotions" on public.promotions for update to authenticated using(exists(select 1 from public.businesses b where b.id=business_id and (b.owner_id=(select auth.uid()) or public.is_admin()))) with check(exists(select 1 from public.businesses b where b.id=business_id and (b.owner_id=(select auth.uid()) or public.is_admin())));
create policy "owners or admins delete promotions" on public.promotions for delete to authenticated using(exists(select 1 from public.businesses b where b.id=business_id and (b.owner_id=(select auth.uid()) or public.is_admin())));

drop policy if exists "public read published posts" on public.posts;
drop policy if exists "authors manage posts" on public.posts;
drop policy if exists "admins manage posts" on public.posts;
create policy "anon read published posts" on public.posts for select to anon using(status='published');
create policy "authenticated read posts" on public.posts for select to authenticated using(status='published' or (select auth.uid())=author_id or public.is_admin());
create policy "authors or admins insert posts" on public.posts for insert to authenticated with check((select auth.uid())=author_id or public.is_admin());
create policy "authors or admins update posts" on public.posts for update to authenticated using((select auth.uid())=author_id or public.is_admin()) with check((select auth.uid())=author_id or public.is_admin());
create policy "authors or admins delete posts" on public.posts for delete to authenticated using((select auth.uid())=author_id or public.is_admin());

drop policy if exists "users read own submissions" on public.community_submissions;
drop policy if exists "users delete own submissions" on public.community_submissions;
drop policy if exists "users submit community" on public.community_submissions;
drop policy if exists "admins manage community submissions" on public.community_submissions;
create policy "users read own or admins read submissions" on public.community_submissions for select to authenticated using((select auth.uid())=user_id or public.is_admin());
create policy "users insert community or admins" on public.community_submissions for insert to authenticated with check((select auth.uid())=user_id or public.is_admin());
create policy "users or admins delete submissions" on public.community_submissions for delete to authenticated using((select auth.uid())=user_id or public.is_admin());
create policy "admins update submissions" on public.community_submissions for update to authenticated using(public.is_admin()) with check(public.is_admin());

create index if not exists advertisements_business_id_idx on public.advertisements(business_id);
create index if not exists analytics_events_post_id_idx on public.analytics_events(post_id);
create index if not exists analytics_events_user_id_idx on public.analytics_events(user_id);
create index if not exists community_submissions_user_id_idx on public.community_submissions(user_id);
create index if not exists community_submissions_reviewed_by_idx on public.community_submissions(reviewed_by);
create index if not exists posts_author_id_idx on public.posts(author_id);
create index if not exists subscriptions_plan_id_idx on public.subscriptions(plan_id);
