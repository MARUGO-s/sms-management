create table if not exists public.social_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.social_workspace_members (
  workspace_id uuid not null references public.social_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.social_workspaces(id) on delete cascade,
  title text not null,
  body text not null default '',
  scheduled_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'published', 'failed')),
  owner_name text not null default '',
  format text not null default 'post',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.social_post_channels (
  post_id uuid not null references public.social_posts(id) on delete cascade,
  channel text not null check (channel in ('instagram', 'tiktok', 'x', 'threads')),
  primary key (post_id, channel)
);

create table if not exists public.social_post_files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.social_workspaces(id) on delete cascade,
  post_id uuid not null references public.social_posts(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  content_type text not null default 'application/octet-stream',
  file_size bigint not null default 0 check (file_size >= 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.social_integrations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.social_workspaces(id) on delete cascade,
  channel text not null check (channel in ('instagram', 'tiktok', 'x', 'threads')),
  app_id text not null default '',
  callback_url text not null default '',
  scopes text not null default '',
  status text not null default 'unconfigured' check (status in ('unconfigured', 'configured', 'needs_review')),
  secret_ref text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, channel)
);

create index if not exists social_posts_workspace_created_idx
  on public.social_posts (workspace_id, created_at desc);
create index if not exists social_posts_workspace_status_idx
  on public.social_posts (workspace_id, status, scheduled_at);
create index if not exists social_post_files_post_idx
  on public.social_post_files (post_id);

create or replace function public.is_social_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.social_workspaces w
    where w.id = target_workspace_id
      and w.created_by = (select auth.uid())
  )
  or exists (
    select 1
    from public.social_workspace_members m
    where m.workspace_id = target_workspace_id
      and m.user_id = (select auth.uid())
  );
$$;

alter table public.social_workspaces enable row level security;
alter table public.social_workspace_members enable row level security;
alter table public.social_posts enable row level security;
alter table public.social_post_channels enable row level security;
alter table public.social_post_files enable row level security;
alter table public.social_integrations enable row level security;

create policy "workspace members can view workspaces"
  on public.social_workspaces for select to authenticated
  using (
    created_by = (select auth.uid())
    or exists (
      select 1 from public.social_workspace_members m
      where m.workspace_id = id and m.user_id = (select auth.uid())
    )
  );

create policy "users can create workspaces"
  on public.social_workspaces for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy "workspace owners can update workspaces"
  on public.social_workspaces for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

create policy "workspace owners can delete workspaces"
  on public.social_workspaces for delete to authenticated
  using (created_by = (select auth.uid()));

create policy "members can view their membership"
  on public.social_workspace_members for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.social_workspaces w
      where w.id = workspace_id and w.created_by = (select auth.uid())
    )
  );

create policy "workspace owners can manage members"
  on public.social_workspace_members for all to authenticated
  using (
    exists (
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

create policy "workspace members can view posts"
  on public.social_posts for select to authenticated
  using (public.is_social_workspace_member(workspace_id));

create policy "workspace members can create posts"
  on public.social_posts for insert to authenticated
  with check (
    public.is_social_workspace_member(workspace_id)
    and created_by = (select auth.uid())
  );

create policy "workspace members can update posts"
  on public.social_posts for update to authenticated
  using (public.is_social_workspace_member(workspace_id))
  with check (public.is_social_workspace_member(workspace_id));

create policy "workspace members can delete posts"
  on public.social_posts for delete to authenticated
  using (public.is_social_workspace_member(workspace_id));

create policy "workspace members can manage post channels"
  on public.social_post_channels for all to authenticated
  using (
    exists (
      select 1 from public.social_posts p
      where p.id = post_id and public.is_social_workspace_member(p.workspace_id)
    )
  )
  with check (
    exists (
      select 1 from public.social_posts p
      where p.id = post_id and public.is_social_workspace_member(p.workspace_id)
    )
  );

create policy "workspace members can manage post files"
  on public.social_post_files for all to authenticated
  using (public.is_social_workspace_member(workspace_id))
  with check (
    public.is_social_workspace_member(workspace_id)
    and created_by = (select auth.uid())
  );

create policy "workspace members can view integrations"
  on public.social_integrations for select to authenticated
  using (public.is_social_workspace_member(workspace_id));

create policy "workspace members can manage integrations"
  on public.social_integrations for all to authenticated
  using (public.is_social_workspace_member(workspace_id))
  with check (
    public.is_social_workspace_member(workspace_id)
    and created_by = (select auth.uid())
  );

grant select, insert, update, delete on public.social_workspaces to authenticated;
grant select, insert, update, delete on public.social_workspace_members to authenticated;
grant select, insert, update, delete on public.social_posts to authenticated;
grant select, insert, update, delete on public.social_post_channels to authenticated;
grant select, insert, update, delete on public.social_post_files to authenticated;
grant select, insert, update, delete on public.social_integrations to authenticated;

insert into storage.buckets (id, name, public)
values ('post-files', 'post-files', false)
on conflict (id) do update set public = false;

create policy "workspace members can read post files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'post-files'
    and public.is_social_workspace_member((split_part(name, '/', 1))::uuid)
  );

create policy "workspace members can upload post files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'post-files'
    and public.is_social_workspace_member((split_part(name, '/', 1))::uuid)
  );

create policy "workspace members can update post files"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'post-files'
    and public.is_social_workspace_member((split_part(name, '/', 1))::uuid)
  )
  with check (
    bucket_id = 'post-files'
    and public.is_social_workspace_member((split_part(name, '/', 1))::uuid)
  );

create policy "workspace members can delete post files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'post-files'
    and public.is_social_workspace_member((split_part(name, '/', 1))::uuid)
  );
