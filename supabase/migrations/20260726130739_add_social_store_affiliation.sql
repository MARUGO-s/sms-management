create table public.social_stores (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]*$'),
  name text not null unique,
  area text not null,
  sort_order integer not null unique check (sort_order > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.social_stores is
  'Public store directory used for account affiliation and workspace reporting.';

insert into public.social_stores (id, name, area, sort_order)
values
  ('marugo', 'マルゴ', '新宿', 1),
  ('marugo-second', 'マルゴ セカンド', '新宿', 2),
  ('marugo-grande', 'マルゴ グランデ', '新宿', 3),
  ('371-bar', 'サンナナイチ バル', '新宿', 4),
  ('xenlon-claudia', 'シェンロン&クラウディア', '新宿', 5),
  ('claudia2', 'クラウディア2', '新宿', 6),
  ('sauvage', 'ソバージュ', '新宿', 7),
  ('bar-pelota', 'バルぺロタ', '新宿', 8),
  ('trattoria-briccola', 'トラットリア ブリッコラ', '新宿', 9),
  ('violette', 'ヴィオレット', '新宿', 10),
  ('marugo-otto', 'マルゴ オット', '新宿', 11),
  ('donaiya-shinjuku', '元祖どないや 新宿三丁目店', '新宿', 12),
  ('marugo-yotsuya', 'マルゴ 四谷', '四谷・水道橋', 13),
  ('sushi-koruri', '鮨こるり', '四谷・水道橋', 14),
  ('bistro-cavacava', 'ビストロ サヴァサヴァ', '四谷・水道橋', 15),
  ('marugo-s', 'マルゴエス', '四谷・水道橋', 16),
  ('marugo-marunouchi', 'マルゴ丸の内', '丸の内', 17),
  ('yakiniku-marugo', '焼肉マルゴ', '丸の内', 18),
  ('erics-by-eric-trochon', 'エリックスバイエリックトロション', '丸の内', 19),
  ('mitan', 'ミタン', '丸の内', 20),
  ('marugo-shinbashi', 'マルゴ 新橋', '新橋', 21),
  ('marugo-d', 'マルゴ D', '愛知', 22),
  ('blu-nero', 'BLU NERO', '新店舗', 23);

alter table public.social_stores enable row level security;

create policy "anyone can view active social stores"
  on public.social_stores for select to anon
  using (is_active);

create policy "users can view active stores and administrators all stores"
  on public.social_stores for select to authenticated
  using (
    is_active
    or (select private.is_social_admin())
  );

grant select on public.social_stores to anon, authenticated;
revoke insert, update, delete on public.social_stores from anon, authenticated;

alter table public.social_workspaces
  add column store_id text references public.social_stores(id) on delete restrict;

alter table public.social_user_profiles
  add column store_id text references public.social_stores(id) on delete restrict;

comment on column public.social_workspaces.store_id is
  'Store represented by this workspace.';
comment on column public.social_user_profiles.store_id is
  'Canonical store affiliation selected during account onboarding.';

create index social_workspaces_store_idx
  on public.social_workspaces (store_id);
create index social_user_profiles_store_idx
  on public.social_user_profiles (store_id);

drop policy if exists "administrators can view user profiles"
  on public.social_user_profiles;

create policy "users can view own profile and administrators all profiles"
  on public.social_user_profiles for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_social_admin())
  );

create policy "users can set an unassigned store affiliation"
  on public.social_user_profiles for update to authenticated
  using (
    user_id = (select auth.uid())
    and store_id is null
  )
  with check (
    user_id = (select auth.uid())
    and store_id is not null
    and exists (
      select 1
      from public.social_stores store
      where store.id = store_id
        and store.is_active
    )
  );

grant update (store_id) on public.social_user_profiles to authenticated;

create or replace function private.sync_social_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_store_id text;
begin
  select store.id
    into selected_store_id
    from public.social_stores store
    where store.id = nullif(new.raw_user_meta_data ->> 'social_store_id', '')
      and store.is_active
    limit 1;

  insert into public.social_user_profiles (
    user_id,
    email,
    created_at,
    last_sign_in_at,
    store_id
  )
  values (
    new.id,
    coalesce(new.email, ''),
    new.created_at,
    new.last_sign_in_at,
    selected_store_id
  )
  on conflict (user_id) do update
  set
    email = excluded.email,
    created_at = excluded.created_at,
    last_sign_in_at = excluded.last_sign_in_at,
    store_id = coalesce(
      public.social_user_profiles.store_id,
      excluded.store_id
    );

  return new;
end;
$$;

revoke all on function private.sync_social_user_profile() from public;
revoke all on function private.sync_social_user_profile() from anon;
revoke all on function private.sync_social_user_profile() from authenticated;

update public.social_user_profiles profile
set store_id = store.id
from auth.users auth_user
join public.social_stores store
  on store.id = nullif(
    auth_user.raw_user_meta_data ->> 'social_store_id',
    ''
  )
  and store.is_active
where profile.user_id = auth_user.id
  and profile.store_id is null;
