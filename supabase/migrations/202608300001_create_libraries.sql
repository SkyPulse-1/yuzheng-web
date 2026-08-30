create extension if not exists pgcrypto;

create table if not exists public.libraries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name varchar(50) not null check (char_length(trim(name)) between 1 and 50),
  description varchar(200) check (description is null or char_length(description) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists libraries_owner_updated_idx
  on public.libraries (owner_id, updated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger libraries_set_updated_at
before update on public.libraries
for each row execute function public.set_updated_at();

alter table public.libraries enable row level security;

create policy "Users can view own libraries"
on public.libraries for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy "Users can create own libraries"
on public.libraries for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy "Users can update own libraries"
on public.libraries for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "Users can delete own libraries"
on public.libraries for delete
to authenticated
using ((select auth.uid()) = owner_id);

grant select, insert, update, delete on public.libraries to authenticated;
