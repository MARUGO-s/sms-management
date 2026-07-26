create or replace function private.can_remove_social_admin(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.is_social_admin()
    and exists (
      select 1
      from public.social_admin_users administrator
      where administrator.user_id = target_user_id
    )
    and (
      select count(*)
      from public.social_admin_users
    ) > 1;
$$;

revoke all on function private.can_remove_social_admin(uuid) from public;
revoke all on function private.can_remove_social_admin(uuid) from anon;
grant execute on function private.can_remove_social_admin(uuid) to authenticated;

drop policy if exists "users can check their administrator access"
  on public.social_admin_users;

create policy "users can check and administrators can view administrator access"
  on public.social_admin_users for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_social_admin())
  );

create policy "administrators can grant administrator access"
  on public.social_admin_users for insert to authenticated
  with check (
    (select private.is_social_admin())
    and granted_by = (select auth.uid())
  );

create policy "administrators can revoke administrator access"
  on public.social_admin_users for delete to authenticated
  using ((select private.can_remove_social_admin(user_id)));

grant select, insert, delete on public.social_admin_users to authenticated;
revoke update on public.social_admin_users from authenticated;

create or replace function private.audit_social_admin_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data jsonb;
  target_email text;
begin
  row_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;

  select profile.email
    into target_email
    from public.social_user_profiles profile
    where profile.user_id = (row_data ->> 'user_id')::uuid;

  insert into public.social_audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    label,
    metadata
  )
  values (
    (select auth.uid()),
    lower(tg_op),
    'social_admin_users',
    (row_data ->> 'user_id')::uuid,
    coalesce(target_email, '管理者アカウント'),
    jsonb_build_object('access', 'administrator')
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.audit_social_admin_change() from public;
revoke all on function private.audit_social_admin_change() from anon;
revoke all on function private.audit_social_admin_change() from authenticated;

drop trigger if exists audit_social_admin_users
  on public.social_admin_users;
create trigger audit_social_admin_users
  after insert or delete on public.social_admin_users
  for each row execute function private.audit_social_admin_change();
