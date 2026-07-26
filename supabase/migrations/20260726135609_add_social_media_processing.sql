update storage.buckets
set file_size_limit = 52428800
where id = 'post-files';

alter table public.social_post_files
  add column media_variant text not null default 'original'
    check (media_variant in ('original', 'processed')),
  add column generated_from_file_id uuid
    references public.social_post_files(id) on delete set null;

create index social_post_files_generated_from_idx
  on public.social_post_files (generated_from_file_id);

create table public.social_media_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null
    references public.social_workspaces(id) on delete cascade,
  post_id uuid not null
    references public.social_posts(id) on delete cascade,
  source_file_id uuid not null
    references public.social_post_files(id) on delete restrict,
  output_file_id uuid
    references public.social_post_files(id) on delete set null,
  requested_by uuid not null
    references auth.users(id) on delete restrict,
  operation text not null default 'crop'
    check (operation = 'crop'),
  crop_config jsonb not null,
  status text not null default 'queued'
    check (
      status in (
        'queued',
        'processing',
        'completed',
        'failed',
        'cancelled'
      )
    ),
  provider_run_name text not null default '',
  output_storage_path text not null default '',
  error_code text not null default '',
  error_message text not null default '',
  attempts integer not null default 0 check (attempts >= 0),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    crop_config ->> 'aspect' in ('1:1', '4:5', '9:16', '16:9')
    and jsonb_typeof(crop_config -> 'positionX') = 'number'
    and jsonb_typeof(crop_config -> 'positionY') = 'number'
    and jsonb_typeof(crop_config -> 'zoom') = 'number'
    and (crop_config ->> 'positionX')::numeric between 0 and 100
    and (crop_config ->> 'positionY')::numeric between 0 and 100
    and (crop_config ->> 'zoom')::numeric between 100 and 200
  )
);

comment on table public.social_media_jobs is
  'Asynchronous image and video processing requests executed by the Cloud Run media worker.';

create index social_media_jobs_workspace_status_idx
  on public.social_media_jobs (workspace_id, status, created_at desc);
create index social_media_jobs_post_idx
  on public.social_media_jobs (post_id, created_at desc);
create index social_media_jobs_source_file_idx
  on public.social_media_jobs (source_file_id);

alter table public.social_media_jobs enable row level security;

create policy "workspace members and administrators can view media jobs"
  on public.social_media_jobs for select to authenticated
  using (
    private.is_social_workspace_member(workspace_id)
    or (select private.is_social_admin())
  );

create policy "workspace members can create media jobs"
  on public.social_media_jobs for insert to authenticated
  with check (
    private.is_social_workspace_member(workspace_id)
    and requested_by = (select auth.uid())
    and status = 'queued'
    and exists (
      select 1
      from public.social_post_files source_file
      where source_file.id = source_file_id
        and source_file.workspace_id = workspace_id
        and source_file.post_id = post_id
        and source_file.created_by = (select auth.uid())
        and source_file.content_type like 'video/%'
        and source_file.media_variant = 'original'
    )
  );

create policy "requesters can cancel queued media jobs"
  on public.social_media_jobs for update to authenticated
  using (
    private.is_social_workspace_member(workspace_id)
    and requested_by = (select auth.uid())
    and status in ('queued', 'failed')
  )
  with check (
    private.is_social_workspace_member(workspace_id)
    and requested_by = (select auth.uid())
    and status = 'cancelled'
  );

grant select, insert on public.social_media_jobs to authenticated;
grant update (status, updated_at) on public.social_media_jobs to authenticated;
grant all on public.social_media_jobs to service_role;
revoke all on public.social_media_jobs from anon;

create trigger audit_social_media_jobs
  after insert or update or delete on public.social_media_jobs
  for each row execute function private.audit_social_change();
