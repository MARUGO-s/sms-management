create or replace function private.is_valid_media_timeline_config(config jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  item jsonb;
  trim_start numeric := 0;
  trim_end numeric;
  cut_start numeric;
  cut_end numeric;
  merged_start numeric;
  merged_end numeric;
  removed_duration numeric := 0;
begin
  if jsonb_typeof(config) is distinct from 'object' then
    return false;
  end if;

  if coalesce(
    config ->> 'aspect' in ('1:1', '4:5', '9:16', '16:9'),
    false
  ) is not true
    or jsonb_typeof(config -> 'positionX') is distinct from 'number'
    or jsonb_typeof(config -> 'positionY') is distinct from 'number'
    or jsonb_typeof(config -> 'zoom') is distinct from 'number'
    or (config ->> 'positionX')::numeric not between 0 and 100
    or (config ->> 'positionY')::numeric not between 0 and 100
    or (config ->> 'zoom')::numeric not between 100 and 200
  then
    return false;
  end if;

  if config ? 'startTime' then
    if jsonb_typeof(config -> 'startTime') is distinct from 'number' then
      return false;
    end if;
    trim_start := (config ->> 'startTime')::numeric;
    if trim_start < 0 then
      return false;
    end if;
  end if;

  if config ? 'endTime' then
    if jsonb_typeof(config -> 'endTime') is distinct from 'number' then
      return false;
    end if;
    trim_end := (config ->> 'endTime')::numeric;
    if trim_end - trim_start < 0.5 then
      return false;
    end if;
  end if;

  if config ? 'cuts' then
    if jsonb_typeof(config -> 'cuts') is distinct from 'array' then
      return false;
    end if;
    if jsonb_array_length(config -> 'cuts') > 32 then
      return false;
    end if;

    for item in
      select value
      from jsonb_array_elements(config -> 'cuts')
      order by (value ->> 'start')::numeric, (value ->> 'end')::numeric
    loop
      if jsonb_typeof(item) is distinct from 'object'
        or jsonb_typeof(item -> 'start') is distinct from 'number'
        or jsonb_typeof(item -> 'end') is distinct from 'number'
        or (item ->> 'start')::numeric < 0
        or (item ->> 'end')::numeric - (item ->> 'start')::numeric < 0.1
      then
        return false;
      end if;

      if trim_end is not null then
        cut_start := greatest(trim_start, (item ->> 'start')::numeric);
        cut_end := least(trim_end, (item ->> 'end')::numeric);
        if cut_end - cut_start >= 0.1 then
          if merged_start is null then
            merged_start := cut_start;
            merged_end := cut_end;
          elsif cut_start <= merged_end then
            merged_end := greatest(merged_end, cut_end);
          else
            removed_duration := removed_duration + merged_end - merged_start;
            merged_start := cut_start;
            merged_end := cut_end;
          end if;
        end if;
      end if;
    end loop;
  end if;

  if trim_end is not null then
    if merged_start is not null then
      removed_duration := removed_duration + merged_end - merged_start;
    end if;
    if trim_end - trim_start - removed_duration < 0.5 then
      return false;
    end if;
  end if;

  return true;
exception
  when others then
    return false;
end;
$$;

revoke all on function private.is_valid_media_timeline_config(jsonb)
  from public, anon;
grant usage on schema private to authenticated, service_role;
grant execute on function private.is_valid_media_timeline_config(jsonb)
  to authenticated, service_role;

alter table public.social_media_jobs
  drop constraint if exists social_media_jobs_crop_config_check;

alter table public.social_media_jobs
  add constraint social_media_jobs_crop_config_check
  check (private.is_valid_media_timeline_config(crop_config));

comment on function private.is_valid_media_timeline_config(jsonb) is
  'Validates crop fields and optional timeline ranges, including at least 0.5 seconds remaining after merged cuts.';
