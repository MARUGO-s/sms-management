drop policy if exists "administrators can view all workspaces"
  on public.social_workspaces;
drop policy if exists "workspace members can view workspaces"
  on public.social_workspaces;
create policy "workspace members and administrators can view workspaces"
  on public.social_workspaces for select to authenticated
  using (
    created_by = (select auth.uid())
    or private.is_social_workspace_member(id)
    or (select private.is_social_admin())
  );

drop policy if exists "administrators can view all memberships"
  on public.social_workspace_members;
drop policy if exists "workspace members can view membership"
  on public.social_workspace_members;
create policy "workspace members and administrators can view membership"
  on public.social_workspace_members for select to authenticated
  using (
    private.is_social_workspace_member(workspace_id)
    or (select private.is_social_admin())
  );

drop policy if exists "administrators can view all posts"
  on public.social_posts;
drop policy if exists "workspace members can view posts"
  on public.social_posts;
create policy "workspace members and administrators can view posts"
  on public.social_posts for select to authenticated
  using (
    private.is_social_workspace_member(workspace_id)
    or (select private.is_social_admin())
  );

drop policy if exists "administrators can update all posts"
  on public.social_posts;
drop policy if exists "workspace members can update posts"
  on public.social_posts;
create policy "workspace members and administrators can update posts"
  on public.social_posts for update to authenticated
  using (
    private.is_social_workspace_member(workspace_id)
    or (select private.is_social_admin())
  )
  with check (
    private.is_social_workspace_member(workspace_id)
    or (select private.is_social_admin())
  );

drop policy if exists "administrators can view all post channels"
  on public.social_post_channels;
drop policy if exists "workspace members can manage post channels"
  on public.social_post_channels;

create policy "workspace members and administrators can view post channels"
  on public.social_post_channels for select to authenticated
  using (
    exists (
      select 1
      from public.social_posts post
      where post.id = post_id
        and private.is_social_workspace_member(post.workspace_id)
    )
    or (select private.is_social_admin())
  );

create policy "workspace members can add post channels"
  on public.social_post_channels for insert to authenticated
  with check (
    exists (
      select 1
      from public.social_posts post
      where post.id = post_id
        and private.is_social_workspace_member(post.workspace_id)
    )
  );

create policy "workspace members can update post channels"
  on public.social_post_channels for update to authenticated
  using (
    exists (
      select 1
      from public.social_posts post
      where post.id = post_id
        and private.is_social_workspace_member(post.workspace_id)
    )
  )
  with check (
    exists (
      select 1
      from public.social_posts post
      where post.id = post_id
        and private.is_social_workspace_member(post.workspace_id)
    )
  );

create policy "workspace members can remove post channels"
  on public.social_post_channels for delete to authenticated
  using (
    exists (
      select 1
      from public.social_posts post
      where post.id = post_id
        and private.is_social_workspace_member(post.workspace_id)
    )
  );

drop policy if exists "administrators can view all post files"
  on public.social_post_files;
drop policy if exists "workspace members can manage post files"
  on public.social_post_files;

create policy "workspace members and administrators can view post files"
  on public.social_post_files for select to authenticated
  using (
    private.is_social_workspace_member(workspace_id)
    or (select private.is_social_admin())
  );

create policy "workspace members can add post files"
  on public.social_post_files for insert to authenticated
  with check (
    private.is_social_workspace_member(workspace_id)
    and created_by = (select auth.uid())
  );

create policy "workspace members can update post files"
  on public.social_post_files for update to authenticated
  using (private.is_social_workspace_member(workspace_id))
  with check (
    private.is_social_workspace_member(workspace_id)
    and created_by = (select auth.uid())
  );

create policy "workspace members can remove post files"
  on public.social_post_files for delete to authenticated
  using (private.is_social_workspace_member(workspace_id));

drop policy if exists "administrators can view all integrations"
  on public.social_integrations;
drop policy if exists "workspace members can manage integrations"
  on public.social_integrations;

create policy "workspace members and administrators can view integrations"
  on public.social_integrations for select to authenticated
  using (
    private.is_social_workspace_member(workspace_id)
    or (select private.is_social_admin())
  );

create policy "workspace members can add integrations"
  on public.social_integrations for insert to authenticated
  with check (
    private.is_social_workspace_member(workspace_id)
    and created_by = (select auth.uid())
  );

create policy "workspace members can update integrations"
  on public.social_integrations for update to authenticated
  using (private.is_social_workspace_member(workspace_id))
  with check (
    private.is_social_workspace_member(workspace_id)
    and created_by = (select auth.uid())
  );

create policy "workspace members can remove integrations"
  on public.social_integrations for delete to authenticated
  using (private.is_social_workspace_member(workspace_id));

drop policy if exists "administrators can read all post file objects"
  on storage.objects;
drop policy if exists "workspace members can read post files"
  on storage.objects;
create policy "workspace members and administrators can read post files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'post-files'
    and (
      private.is_social_workspace_member((split_part(name, '/', 1))::uuid)
      or (select private.is_social_admin())
    )
  );
