drop policy if exists "workspace members can create media jobs"
  on public.social_media_jobs;

create policy "workspace members can create media jobs"
  on public.social_media_jobs for insert to authenticated
  with check (
    private.is_social_workspace_member(social_media_jobs.workspace_id)
    and social_media_jobs.requested_by = (select auth.uid())
    and social_media_jobs.status = 'queued'
    and exists (
      select 1
      from public.social_post_files source_file
      where source_file.id = social_media_jobs.source_file_id
        and source_file.workspace_id = social_media_jobs.workspace_id
        and source_file.post_id = social_media_jobs.post_id
        and source_file.created_by = (select auth.uid())
        and source_file.content_type like 'video/%'
        and source_file.media_variant = 'original'
    )
  );
