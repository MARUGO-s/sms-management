create table if not exists public.social_integration_secrets (
  integration_id uuid primary key
    references public.social_integrations(id) on delete cascade,
  client_secret text not null default '',
  access_token text not null default '',
  refresh_token text not null default '',
  webhook_secret text not null default '',
  updated_at timestamptz not null default now()
);

comment on table public.social_integration_secrets is
  'Server-only SNS credentials. Values are never returned to browser clients.';

alter table public.social_integration_secrets enable row level security;

revoke all on public.social_integration_secrets from anon, authenticated;
grant select, insert, update, delete on public.social_integration_secrets to service_role;

update storage.buckets
set file_size_limit = 20971520
where id = 'post-files';
