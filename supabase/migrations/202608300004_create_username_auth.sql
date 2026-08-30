create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username varchar(24) not null,
  username_normalized varchar(24) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username_normalized ~ '^[a-z0-9_]{3,24}$'),
  constraint profiles_username_normalized check (username_normalized = lower(username_normalized))
);

create unique index if not exists profiles_username_normalized_unique
  on public.profiles (username_normalized);

create table if not exists public.account_recovery (
  user_id uuid primary key references auth.users(id) on delete cascade,
  recovery_digest varchar(64) not null check (recovery_digest ~ '^[a-f0-9]{64}$'),
  failed_attempts integer not null default 0 check (failed_attempts between 0 and 5),
  locked_until timestamptz,
  rotated_at timestamptz not null default now()
);

create or replace function public.create_username_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text := lower(trim(new.raw_user_meta_data ->> 'username'));
  requested_digest text := lower(trim(new.raw_user_meta_data ->> 'recovery_digest'));
begin
  -- Keep legacy users valid until they explicitly migrate to username login.
  if requested_username is null and requested_digest is null then
    return new;
  end if;

  if requested_username !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'invalid username metadata';
  end if;

  if requested_digest !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid recovery metadata';
  end if;

  insert into public.profiles (id, username, username_normalized)
  values (new.id, requested_username, requested_username);

  insert into public.account_recovery (user_id, recovery_digest)
  values (new.id, requested_digest);

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'auth_user_create_username_profile'
      and tgrelid = 'auth.users'::regclass
  ) then
    create trigger auth_user_create_username_profile
      after insert on auth.users
      for each row execute function public.create_username_profile();
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'profiles_set_updated_at'
      and tgrelid = 'public.profiles'::regclass
  ) then
    create trigger profiles_set_updated_at
      before update on public.profiles
      for each row execute function public.set_updated_at();
  end if;
end;
$$;

alter table public.profiles enable row level security;
alter table public.account_recovery enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Users can view own profile'
  ) then
    create policy "Users can view own profile"
      on public.profiles for select
      to authenticated
      using ((select auth.uid()) = id);
  end if;
end;
$$;

grant select on public.profiles to authenticated;
revoke all on public.account_recovery from anon, authenticated;
