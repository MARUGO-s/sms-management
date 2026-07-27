alter table public.social_media_jobs
  drop constraint if exists social_media_jobs_status_check;

alter table public.social_media_jobs
  add constraint social_media_jobs_status_check
  check (
    status in (
      'queued',
      'dispatching',
      'processing',
      'completed',
      'failed',
      'cancelled'
    )
  );

comment on column public.social_media_jobs.status is
  'queued: waiting for dispatch; dispatching: Cloud Run accepted the request but the worker has not started; processing: the worker has started; terminal states are completed, failed, and cancelled.';
