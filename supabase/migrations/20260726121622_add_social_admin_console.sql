create table public.social_admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now()
);

comment on table public.social_admin_users is
  'Application-wide administrators. Membership is managed outside browser clients.';

create table public.social_user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  created_at timestamptz not null,
  last_sign_in_at timestamptz
);

comment on table public.social_user_profiles is
  'Admin-readable directory synchronized from auth.users without exposing the auth schema.';

create table public.social_audit_logs (
  id bigint generated always as identity primary key,
  workspace_id uuid,
  actor_user_id uuid,
  action text not null check (action in ('insert', 'update', 'delete')),
  entity_type text not null,
  entity_id uuid,
  label text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.social_audit_logs is
  'Administrative activity log. Post bodies and integration secrets are intentionally excluded.';

create index social_audit_logs_created_idx
  on public.social_audit_logs (created_at desc);
create index social_audit_logs_workspace_idx
  on public.social_audit_logs (workspace_id, created_at desc);
create index social_audit_logs_actor_idx
  on public.social_audit_logs (actor_user_id, created_at desc);

alter table public.social_admin_users enable row level security;
alter table public.social_user_profiles enable row level security;
alter table public.social_audit_logs enable row level security;

create or replace function private.is_social_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.social_admin_users administrator
    where administrator.user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_social_admin() from public;
revoke all on function private.is_social_admin() from anon;
grant execute on function private.is_social_admin() to authenticated;

create policy "users can check their administrator access"
  on public.social_admin_users for select to authenticated
  using (user_id = (select auth.uid()));

create policy "administrators can view user profiles"
  on public.social_user_profiles for select to authenticated
  using ((select private.is_social_admin()));

create policy "administrators can view audit logs"
  on public.social_audit_logs for select to authenticated
  using ((select private.is_social_admin()));

create policy "administrators can view all workspaces"
  on public.social_workspaces for select to authenticated
  using ((select private.is_social_admin()));

create policy "administrators can view all memberships"
  on public.social_workspace_members for select to authenticated
  using ((select private.is_social_admin()));

create policy "administrators can view all posts"
  on public.social_posts for select to authenticated
  using ((select private.is_social_admin()));

create policy "administrators can update all posts"
  on public.social_posts for update to authenticated
  using ((select private.is_social_admin()))
  with check ((select private.is_social_admin()));

create policy "administrators can view all post channels"
  on public.social_post_channels for select to authenticated
  using ((select private.is_social_admin()));

create policy "administrators can view all post files"
  on public.social_post_files for select to authenticated
  using ((select private.is_social_admin()));

create policy "administrators can view all integrations"
  on public.social_integrations for select to authenticated
  using ((select private.is_social_admin()));

create policy "administrators can read all post file objects"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'post-files'
    and (select private.is_social_admin())
  );

grant select on public.social_admin_users to authenticated;
grant select on public.social_user_profiles to authenticated;
grant select on public.social_audit_logs to authenticated;
revoke all on public.social_admin_users from anon;
revoke all on public.social_user_profiles from anon;
revoke all on public.social_audit_logs from anon;

insert into public.social_user_profiles (
  user_id,
  email,
  created_at,
  last_sign_in_at
)
select
  id,
  coalesce(email, ''),
  created_at,
  last_sign_in_at
from auth.users
on conflict (user_id) do update
set
  email = excluded.email,
  created_at = excluded.created_at,
  last_sign_in_at = excluded.last_sign_in_at;

create or replace function private.sync_social_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.social_user_profiles (
    user_id,
    email,
    created_at,
    last_sign_in_at
  )
  values (
    new.id,
    coalesce(new.email, ''),
    new.created_at,
    new.last_sign_in_at
  )
  on conflict (user_id) do update
  set
    email = excluded.email,
    created_at = excluded.created_at,
    last_sign_in_at = excluded.last_sign_in_at;

  return new;
end;
$$;

revoke all on function private.sync_social_user_profile() from public;
revoke all on function private.sync_social_user_profile() from anon;
revoke all on function private.sync_social_user_profile() from authenticated;

drop trigger if exists sync_social_user_profile on auth.users;
create trigger sync_social_user_profile
  after insert or update of email, last_sign_in_at on auth.users
  for each row execute function private.sync_social_user_profile();

create or replace function private.audit_social_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data jsonb;
  audit_workspace_id uuid;
  audit_entity_id uuid;
  audit_label text;
  audit_metadata jsonb := '{}'::jsonb;
begin
  row_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;

  if tg_table_name = 'social_post_channels' then
    select post.workspace_id
      into audit_workspace_id
      from public.social_posts post
      where post.id = (row_data ->> 'post_id')::uuid;
    audit_entity_id := (row_data ->> 'post_id')::uuid;
  else
    audit_workspace_id := nullif(row_data ->> 'workspace_id', '')::uuid;
    audit_entity_id := nullif(row_data ->> 'id', '')::uuid;
  end if;

  if tg_table_name = 'social_workspaces' then
    audit_workspace_id := nullif(row_data ->> 'id', '')::uuid;
    audit_metadata := jsonb_build_object('name', coalesce(row_data ->> 'name', ''));
  elsif tg_table_name = 'social_workspace_members' then
    audit_entity_id := nullif(row_data ->> 'user_id', '')::uuid;
    audit_metadata := jsonb_build_object('role', coalesce(row_data ->> 'role', ''));
  elsif tg_table_name = 'social_posts' then
    audit_metadata := jsonb_build_object(
      'status', coalesce(row_data ->> 'status', ''),
      'scheduled_at', row_data -> 'scheduled_at'
    );
  elsif tg_table_name = 'social_post_channels' then
    audit_metadata := jsonb_build_object('channel', coalesce(row_data ->> 'channel', ''));
  elsif tg_table_name = 'social_post_files' then
    audit_metadata := jsonb_build_object(
      'content_type', coalesce(row_data ->> 'content_type', ''),
      'file_size', coalesce((row_data ->> 'file_size')::bigint, 0)
    );
  elsif tg_table_name = 'social_integrations' then
    audit_metadata := jsonb_build_object(
      'channel', coalesce(row_data ->> 'channel', ''),
      'status', coalesce(row_data ->> 'status', '')
    );
  end if;

  audit_label := coalesce(
    row_data ->> 'title',
    row_data ->> 'file_name',
    row_data ->> 'name',
    row_data ->> 'channel',
    row_data ->> 'role',
    ''
  );

  insert into public.social_audit_logs (
    workspace_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    label,
    metadata
  )
  values (
    audit_workspace_id,
    (select auth.uid()),
    lower(tg_op),
    tg_table_name,
    audit_entity_id,
    audit_label,
    audit_metadata
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.audit_social_change() from public;
revoke all on function private.audit_social_change() from anon;
revoke all on function private.audit_social_change() from authenticated;

create trigger audit_social_workspaces
  after insert or update or delete on public.social_workspaces
  for each row execute function private.audit_social_change();

create trigger audit_social_workspace_members
  after insert or update or delete on public.social_workspace_members
  for each row execute function private.audit_social_change();

create trigger audit_social_posts
  after insert or update or delete on public.social_posts
  for each row execute function private.audit_social_change();

create trigger audit_social_post_channels
  after insert or update or delete on public.social_post_channels
  for each row execute function private.audit_social_change();

create trigger audit_social_post_files
  after insert or update or delete on public.social_post_files
  for each row execute function private.audit_social_change();

create trigger audit_social_integrations
  after insert or update or delete on public.social_integrations
  for each row execute function private.audit_social_change();
