# Instatic TalksX Handoff

## Project

Instatic TalksX is a Japanese social operations console for Instagram, TikTok, X, and Threads.
The local app runs at `http://localhost:3000/` from the repository root.
The owner-only production deployment is:

`https://instatic-talksx.yoshito0428.chatgpt.site`

## Current state

- React/Vinext app in `app/social-console.tsx`, `app/page.tsx`, and `app/globals.css`.
- HeroUI v3 is installed and applied to key action buttons.
- Supabase project is linked with ref `xpdrewhzisycjdtcvvey`.
- Supabase schema is deployed through `supabase/migrations/`.
- Supabase tables: `social_workspaces`, `social_workspace_members`, `social_posts`, `social_post_channels`, `social_post_files`, `social_integrations`, `social_integration_secrets`.
- Private Supabase Storage bucket: `post-files`.
- RLS policies are enabled for authenticated users. Workspace membership checks run through non-exposed `private` schema functions to prevent policy recursion.
- Supabase Auth email/password sign-in protects all app data.
- Posts, history, channels, and file metadata are stored in Postgres. File bytes are stored in private Storage.
- SNS secrets are written only through the authenticated `integration-secrets` Edge Function. Browser clients never read stored secret values.
- The Sites deployment project is recorded in `.openai/hosting.json`. Production variables are managed in Sites, not committed files.
- Dropbox backup script: `scripts/backup-supabase-to-dropbox.mjs`.

## Important commands

```bash
npm install
npm run dev
npm test
npm run backup:dropbox
supabase db push --linked
supabase functions deploy integration-secrets --use-api
supabase db advisors --linked --type all --level warn --fail-on none
```

## Environment and security

- `.env.local` is intentionally excluded from Git and from Dropbox handoff copies.
- Client variables: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- The Dropbox backup requires server-only `SUPABASE_SECRET_KEY` and `DROPBOX_BACKUP_DIR`.
- Never put `SUPABASE_SECRET_KEY`, `service_role`, SNS Client Secrets, or SNS access tokens in Git, browser storage, or this handoff file.

## Product boundary

The current production app safely stores users, reservations, history, files, and SNS credentials. Actual publishing, inbox sync, webhooks, and platform analytics still require approved developer apps and provider-specific OAuth/publishing implementations for Instagram, TikTok, X, and Threads. The UI deliberately labels those areas as pending instead of showing mock production data.

## Required Supabase admin setting

Email confirmation is enabled. Before inviting production users, an owner must open Supabase Dashboard > Authentication > URL Configuration and set:

- Site URL: `https://instatic-talksx.yoshito0428.chatgpt.site`
- Redirect URLs: `https://instatic-talksx.yoshito0428.chatgpt.site/**` and `http://localhost:3000/**`

The currently authenticated Supabase CLI account can deploy migrations and functions but receives `403` for the Auth configuration Management API. Do not work around this with database changes; complete it with a Supabase project owner account.

Supabase Advisors currently reports one Auth warning: leaked-password protection is disabled. Enable it in the Supabase Authentication password-security settings before expanding access beyond the owner.

## Dropbox backup

Supabase is the production source of truth. Dropbox is a local backup destination only. The backup script writes table JSON and files under:

`/Users/yoshito/Library/CloudStorage/Dropbox/web/instatic-talksx-backups/`

The app cannot write to a Mac filesystem directly when deployed to the cloud. Run the backup script on the Mac, or add a separate scheduled runner.

## GitHub

Repository: `https://github.com/MARUGO-s/sms-management`
Branch: `main`

Before changing the database, create a migration with `supabase migration new <name>`, apply it with `supabase db push --linked`, verify it with `supabase db query --linked`, and run Supabase Advisors.

The migration `20260726111630_fix_social_rls_recursion.sql` fixes the login-time workspace load failure caused by circular RLS policy references. Its authenticated create/read verification must remain rollback-only so no test workspace is left in production.
