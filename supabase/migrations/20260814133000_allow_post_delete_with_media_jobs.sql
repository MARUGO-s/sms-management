alter table public.social_media_jobs
  drop constraint if exists social_media_jobs_source_file_id_fkey;

alter table public.social_media_jobs
  add constraint social_media_jobs_source_file_id_fkey
    foreign key (source_file_id)
    references public.social_post_files(id)
    on delete cascade;
