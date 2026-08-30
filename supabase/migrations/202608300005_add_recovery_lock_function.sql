create or replace function public.record_recovery_failure(target_user_id uuid)
returns table(current_failed_attempts integer, current_locked_until timestamptz)
language sql
security definer
set search_path = ''
as $$
  update public.account_recovery
  set
    failed_attempts = least(5, failed_attempts + 1),
    locked_until = case
      when failed_attempts + 1 >= 5 then now() + interval '15 minutes'
      else locked_until
    end
  where user_id = target_user_id
  returning failed_attempts, locked_until;
$$;

revoke all on function public.record_recovery_failure(uuid) from public, anon, authenticated;
grant execute on function public.record_recovery_failure(uuid) to service_role;
