# Instatic TalksX Handoff

## Project

Instatic TalksX is a Japanese social operations console for Instagram, TikTok, X, and Threads.
The local app runs at `http://localhost:3000/` from the repository root.
The owner-only production deployment is:

`https://instatic-talksx.yoshito0428.chatgpt.site`

## Current state

- React/Vinext app in `app/social-console.tsx`, `app/admin/admin-console.tsx`, route files, and `app/globals.css`.
- HeroUI v3 is installed and applied to key action buttons.
- Supabase project is linked with ref `xpdrewhzisycjdtcvvey`.
- Supabase schema is deployed through `supabase/migrations/`.
- Supabase tables: `social_stores`, `social_workspaces`, `social_workspace_members`, `social_posts`, `social_post_channels`, `social_post_files`, `social_media_jobs`, `social_integrations`, `social_integration_secrets`, `social_admin_users`, `social_user_profiles`, `social_audit_logs`.
- Private Supabase Storage bucket: `post-files`, currently limited to 50 MB per object for Free-plan operation.
- RLS policies are enabled for authenticated users. Workspace membership checks run through non-exposed `private` schema functions to prevent policy recursion.
- Supabase Auth email/password and Google OAuth sign-in protect all app data.
- `social_stores` is the canonical 23-store master: 22 stores from the MARUGO GROUP brands page plus `BLU NERO`.
- New email/password registrations require a store. The selected store is sent as `social_store_id` user metadata, validated against `social_stores`, and copied into the canonical profile/workspace columns by database and app logic.
- Google OAuth signup keeps the selected store only as a temporary browser handoff until the callback completes. Existing users whose profile has no store see a one-time required store selection before the operations console loads.
- Never use `user_metadata` for authorization. Canonical store scope comes from `social_user_profiles.store_id` and `social_workspaces.store_id`; RLS remains user/workspace based.
- Posts, history, channels, and file metadata are stored in Postgres. File bytes are stored in private Storage.
- Video crop settings support 1:1, 4:5, 9:16, and 16:9. The source is preserved, `social_media_jobs` records the asynchronous state, and processed MP4 files are added as separate `social_post_files` rows.
- The `media-jobs` Edge Function dispatches Cloud Run Jobs. Without Google Cloud secrets it safely returns `configured: false` and leaves the job queued. Users can retry queued or failed jobs from history.
- The FFmpeg worker is in `workers/media-processor/`. Its deployment and secret setup are documented in `workers/media-processor/README.md`.
- SNS secrets are written only through the authenticated `integration-secrets` Edge Function. Browser clients never read stored secret values.
- `/admin` is an administrator-only console for all users, stores, workspaces, posts, scheduled posts, files, integration status, and audit history. It provides both all-store and per-store views, a store operations summary, chronological reservation schedule, post status updates, short-lived file download URLs, and administrator grant/revoke controls.
- Administrator access is stored by Auth user ID in `social_admin_users`. Never hardcode administrator emails or IDs in frontend source or migrations.
- Administrator changes require an existing registered user, are limited by RLS to current administrators, and are written to the audit log. The UI prevents self-revocation and the database prevents removal of the final administrator.
- `social_audit_logs` records safe operation metadata only. It deliberately excludes post bodies and all rows from `social_integration_secrets`.
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
supabase functions deploy media-jobs --use-api
supabase db advisors --linked --type all --level warn --fail-on none
```

## Environment and security

- `.env.local` is intentionally excluded from Git and the Dropbox source mirror.
- The Dropbox-only runtime handoff is `/Users/yoshito/Library/CloudStorage/Dropbox/web/instatic-talksx-secrets/.env.local`.
- Keep future server keys in the same Dropbox-only folder, never inside the Git source mirror.
- Client variables: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- The Dropbox backup requires server-only `SUPABASE_SECRET_KEY` and `DROPBOX_BACKUP_DIR`.
- Secrets may be stored in the dedicated Dropbox secrets folder for AI handoff, as approved by the owner.
- Never put `SUPABASE_SECRET_KEY`, `service_role`, SNS Client Secrets, or SNS access tokens in Git, the source mirror, browser storage, chat messages, screenshots, or this handoff file.

## Product boundary

The current production app safely stores users, reservations, history, files, and SNS credentials. Actual publishing, inbox sync, webhooks, and platform analytics still require approved developer apps and provider-specific OAuth/publishing implementations for Instagram, TikTok, X, and Threads. The UI deliberately labels those areas as pending instead of showing mock production data.

## Supabase Auth settings

Email confirmation and Google OAuth are enabled. Supabase Dashboard > Authentication > URL Configuration is configured with:

- Site URL: `https://instatic-talksx.yoshito0428.chatgpt.site`
- Redirect URLs: `https://instatic-talksx.yoshito0428.chatgpt.site/**` and `http://localhost:3000/**`

Google OAuth credentials remain stored in Supabase and Google Auth Platform because the current secret cannot be exported from the local project. Never add the Google Client Secret to Git, the source mirror, chat messages, screenshots, or this handoff file.

Google OAuth was verified by confirming that the Supabase authorize endpoint redirects to `accounts.google.com`.

Supabase Advisors currently reports one Auth warning: leaked-password protection is disabled. Supabase requires a Pro plan for this option; keep the app's 12-character signup minimum while the project remains on Free.

## Dropbox backup

Supabase is the production source of truth. Dropbox is the approved local backup and secret handoff destination. The backup script writes table JSON and files under:

`/Users/yoshito/Library/CloudStorage/Dropbox/web/instatic-talksx-backups/`

The app cannot write to a Mac filesystem directly when deployed to the cloud. Run the backup script on the Mac, or add a separate scheduled runner.

Backups include `social_integration_secrets` and must therefore be treated as sensitive. Keep them within the owner's Dropbox account and do not attach them to GitHub issues, chats, or screenshots.

## GitHub

Repository: `https://github.com/MARUGO-s/sms-management`
Branch: `main`

Before changing the database, create a migration with `supabase migration new <name>`, apply it with `supabase db push --linked`, verify it with `supabase db query --linked`, and run Supabase Advisors.

The migration `20260726111630_fix_social_rls_recursion.sql` fixes the login-time workspace load failure caused by circular RLS policy references. Its authenticated create/read verification must remain rollback-only so no test workspace is left in production.

The migration `20260726114941_allow_workspace_owner_returning.sql` allows a newly created workspace owner to read the row returned by the same insert statement.

The migrations `20260726121622_add_social_admin_console.sql` and `20260726122528_consolidate_social_admin_rls.sql` add the administrator directory, user profile sync, safe audit logging, and consolidated administrator-aware RLS. The initial administrator was provisioned directly in production after migration; it is not stored in Git.

The migration `20260726124138_manage_social_administrators.sql` lets administrators manage administrator access from the `/admin` user directory while preserving the final administrator and auditing grant/revoke actions.

The migration `20260726130739_add_social_store_affiliation.sql` creates the 23-store master, adds canonical `store_id` columns to profiles and workspaces, validates signup metadata, allows a user to set an initially empty profile store exactly once, and exposes only active store names to anonymous signup pages.

The migrations `20260726135609_add_social_media_processing.sql` and `20260726141243_fix_media_job_rls_qualification.sql` add Free-plan media limits, original/processed file lineage, asynchronous crop jobs, strict same-workspace/source-file RLS, and service-role worker access.

## 2026-07-27 Cloud Run status

Cloud Run media processing has now been configured. Do not repeat the setup blindly.

- Google Cloud project: `instatic-talksx-media`
- Region: `asia-northeast1`
- Artifact Registry repository: `instatic-talksx`
- Worker image: `asia-northeast1-docker.pkg.dev/instatic-talksx-media/instatic-talksx/media-processor:latest`
- Cloud Run Job: `instatic-media-processor`
- Job resources: 1 task, parallelism 1, max retries 1, 15 minute timeout, 2 vCPU, 2GiB memory
- Runtime service account: `instatic-media-runtime`
- Dispatcher service account: `instatic-media-dispatcher`, granted `roles/run.jobsExecutorWithOverrides`
- Google Secret Manager secret names: `instatic-supabase-url`, `instatic-supabase-secret-key`
- Supabase Edge Function secret names: `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_CLOUD_PROJECT_ID`, `GOOGLE_CLOUD_REGION`, `GOOGLE_CLOUD_RUN_JOB_NAME`

The worker image build reported `STATUS: SUCCESS`, and the Cloud Run Job was created successfully. A 9 minute 16 second video was saved through the production app and was still shown as processing at the latest check. The next agent must first refresh the app History view and verify whether the file becomes `変換済み`; then download the processed MP4 and compare crop and duration. If it remains processing for more than 15 minutes or becomes failed, inspect the existing Cloud Run Job Execution logs and the Supabase `social_media_jobs` status/error fields. Do not manually execute the Job without the application payload, and do not recreate existing Cloud Run resources or secrets.

The service-account JSON was used to create the Supabase Edge Function secret and then removed from Cloud Shell. The local downloaded copy should be removed from the Mac Downloads folder. Never place the JSON, Supabase secret key, Google key, SNS secrets, or any secret values in Git, this file, `PROJECT_PROGRESS.md`, Dropbox source mirror, chat, or screenshots.

## GitHub Pages entrypoint

GitHub Pages previously showed the repository README because the repository is not a static export of the Vinext application. The actual application remains deployed at `https://instatic-talksx.yoshito0428.chatgpt.site`. A root `index.html` was added to redirect GitHub Pages visitors to that production URL. After the commit is pushed, verify `https://marugo-s.github.io/sms-management/` after the Pages deployment finishes. Do not move Supabase keys or the server application into GitHub Pages; the redirect file contains no secrets.
