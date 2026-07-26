create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
grant usage on schema private to authenticated;

create or replace function private.is_social_workspace_owner(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.social_workspaces w
    where w.id = target_workspace_id
      and w.created_by = (select auth.uid())
  );
$$;

create or replace function private.is_social_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_social_workspace_owner(target_workspace_id)
  or exists (
    select 1
    from public.social_workspace_members m
    where m.workspace_id = target_workspace_id
      and m.user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_social_workspace_owner(uuid) from public;
revoke all on function private.is_social_workspace_owner(uuid) from anon;
revoke all on function private.is_social_workspace_member(uuid) from public;
revoke all on function private.is_social_workspace_member(uuid) from anon;
grant execute on function private.is_social_workspace_owner(uuid) to authenticated;
grant execute on function private.is_social_workspace_member(uuid) to authenticated;

drop policy if exists "workspace members can view workspaces" on public.social_workspaces;
create policy "workspace members can view workspaces"
  on public.social_workspaces for select to authenticated
  using (private.is_social_workspace_member(id));

drop policy if exists "members can view and owners can manage membership"
  on public.social_workspace_members;
drop policy if exists "members can view their membership"
  on public.social_workspace_members;
drop policy if exists "workspace owners can manage members"
  on public.social_workspace_members;

create policy "workspace members can view membership"
  on public.social_workspace_members for select to authenticated
  using (private.is_social_workspace_member(workspace_id));

create policy "workspace owners can add members"
  on public.social_workspace_members for insert to authenticated
  with check (private.is_social_workspace_owner(workspace_id));

create policy "workspace owners can update members"
  on public.social_workspace_members for update to authenticated
  using (private.is_social_workspace_owner(workspace_id))
  with check (private.is_social_workspace_owner(workspace_id));

create policy "workspace owners can remove members"
  on public.social_workspace_members for delete to authenticated
  using (private.is_social_workspace_owner(workspace_id));

drop policy if exists "workspace members can view posts" on public.social_posts;
create policy "workspace members can view posts"
  on public.social_posts for select to authenticated
  using (private.is_social_workspace_member(workspace_id));

drop policy if exists "workspace members can create posts" on public.social_posts;
create policy "workspace members can create posts"
  on public.social_posts for insert to authenticated
  with check (
    private.is_social_workspace_member(workspace_id)
    and created_by = (select auth.uid())
  );

drop policy if exists "workspace members can update posts" on public.social_posts;
create policy "workspace members can update posts"
  on public.social_posts for update to authenticated
  using (private.is_social_workspace_member(workspace_id))
  with check (private.is_social_workspace_member(workspace_id));

drop policy if exists "workspace members can delete posts" on public.social_posts;
create policy "workspace members can delete posts"
  on public.social_posts for delete to authenticated
  using (private.is_social_workspace_member(workspace_id));

drop policy if exists "workspace members can manage post channels"
  on public.social_post_channels;
create policy "workspace members can manage post channels"
  on public.social_post_channels for all to authenticated
  using (
    exists (
      select 1
      from public.social_posts p
      where p.id = post_id
        and private.is_social_workspace_member(p.workspace_id)
    )
  )
  with check (
    exists (
      select 1
      from public.social_posts p
      where p.id = post_id
        and private.is_social_workspace_member(p.workspace_id)
    )
  );

drop policy if exists "workspace members can manage post files"
  on public.social_post_files;
create policy "workspace members can manage post files"
  on public.social_post_files for all to authenticated
  using (private.is_social_workspace_member(workspace_id))
  with check (
    private.is_social_workspace_member(workspace_id)
    and created_by = (select auth.uid())
  );

drop policy if exists "workspace members can view integrations"
  on public.social_integrations;
drop policy if exists "workspace members can manage integrations"
  on public.social_integrations;
create policy "workspace members can manage integrations"
  on public.social_integrations for all to authenticated
  using (private.is_social_workspace_member(workspace_id))
  with check (
    private.is_social_workspace_member(workspace_id)
    and created_by = (select auth.uid())
  );

drop policy if exists "workspace members can read post files" on storage.objects;
create policy "workspace members can read post files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'post-files'
    and private.is_social_workspace_member((split_part(name, '/', 1))::uuid)
  );

drop policy if exists "workspace members can upload post files" on storage.objects;
create policy "workspace members can upload post files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'post-files'
    and private.is_social_workspace_member((split_part(name, '/', 1))::uuid)
  );

drop policy if exists "workspace members can update post files" on storage.objects;
create policy "workspace members can update post files"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'post-files'
    and private.is_social_workspace_member((split_part(name, '/', 1))::uuid)
  )
  with check (
    bucket_id = 'post-files'
    and private.is_social_workspace_member((split_part(name, '/', 1))::uuid)
  );

drop policy if exists "workspace members can delete post files" on storage.objects;
create policy "workspace members can delete post files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'post-files'
    and private.is_social_workspace_member((split_part(name, '/', 1))::uuid)
  );

drop function if exists public.is_social_workspace_member(uuid);
