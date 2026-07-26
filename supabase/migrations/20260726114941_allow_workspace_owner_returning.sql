drop policy if exists "workspace members can view workspaces"
  on public.social_workspaces;

create policy "workspace members can view workspaces"
  on public.social_workspaces for select to authenticated
  using (
    created_by = (select auth.uid())
    or private.is_social_workspace_member(id)
  );
