# Instatic TalksX Handoff

## Project

Instatic TalksX is a Japanese social operations console for Instagram, TikTok, X, and Threads.
The local app runs at `http://localhost:3000/` from the repository root.

## Current state

- React/Vinext app in `app/page.tsx` and `app/globals.css`.
- HeroUI v3 is installed and applied to key action buttons.
- Supabase project is linked with ref `xpdrewhzisycjdtcvvey`.
- Supabase schema is deployed through `supabase/migrations/`.
- Supabase tables: `social_workspaces`, `social_workspace_members`, `social_posts`, `social_post_channels`, `social_post_files`, `social_integrations`.
- Private Supabase Storage bucket: `post-files`.
- RLS policies are enabled for authenticated users. Supabase Advisors returned no issues after policy consolidation.
- The app UI currently still uses browser `localStorage` for the prototype history and integration form. The next product task is connecting those flows to Supabase Auth, Postgres, and Storage.
- Dropbox backup script: `scripts/backup-supabase-to-dropbox.mjs`.

## Important commands

```bash
npm install
npm run dev
npm test
npm run backup:dropbox
supabase db push --linked
supabase db advisors --linked --type all --level warn --fail-on none
```

## Environment and security

- `.env.local` is intentionally excluded from Git and from Dropbox handoff copies.
- Client variables: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- The Dropbox backup requires server-only `SUPABASE_SECRET_KEY` and `DROPBOX_BACKUP_DIR`.
- Never put `SUPABASE_SECRET_KEY`, `service_role`, SNS Client Secrets, or SNS access tokens in Git, browser storage, or this handoff file.

## Dropbox backup

Supabase is the production source of truth. Dropbox is a local backup destination only. The backup script writes table JSON and files under:

`/Users/yoshito/Library/CloudStorage/Dropbox/web/instatic-talksx-backups/`

The app cannot write to a Mac filesystem directly when deployed to the cloud. Run the backup script on the Mac, or add a separate scheduled runner.

## GitHub

Repository: `https://github.com/MARUGO-s/sms-management`
Branch: `main`

Before changing the database, create a migration with `supabase migration new <name>`, apply it with `supabase db push --linked`, verify it with `supabase db query --linked`, and run Supabase Advisors.
