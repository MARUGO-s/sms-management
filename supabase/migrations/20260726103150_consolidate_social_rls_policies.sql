drop policy if exists "workspace members can view integrations" on public.social_integrations;
drop policy if exists "workspace members can manage integrations" on public.social_integrations;

create policy "workspace members can manage integrations"
  on public.social_integrations for all to authenticated
  using (public.is_social_workspace_member(workspace_id))
  with check (
    public.is_social_workspace_member(workspace_id)
    and created_by = (select auth.uid())
  );

drop policy if exists "members can view their membership" on public.social_workspace_members;
drop policy if exists "workspace owners can manage members" on public.social_workspace_members;

create policy "members can view and owners can manage membership"
  on public.social_workspace_members for all to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.social_workspaces w
      where w.id = workspace_id and w.created_by = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.social_workspaces w
      where w.id = workspace_id and w.created_by = (select auth.uid())
    )
  );
