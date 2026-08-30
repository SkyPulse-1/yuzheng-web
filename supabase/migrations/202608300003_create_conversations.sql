create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  library_id uuid not null references public.libraries(id) on delete cascade,
  title varchar(100) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  evidence_cards_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index conversations_owner_updated_idx on public.conversations (owner_id, updated_at desc);
create index messages_conversation_created_idx on public.messages (conversation_id, created_at);
create trigger conversations_set_updated_at before update on public.conversations for each row execute function public.set_updated_at();

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "Users can view own conversations" on public.conversations for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Users can create own conversations" on public.conversations for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Users can update own conversations" on public.conversations for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "Users can delete own conversations" on public.conversations for delete to authenticated using ((select auth.uid()) = owner_id);

create policy "Users can view own messages" on public.messages for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Users can create own messages" on public.messages for insert to authenticated with check (
  (select auth.uid()) = owner_id and exists (
    select 1 from public.conversations where conversations.id = conversation_id and conversations.owner_id = (select auth.uid())
  )
);

grant select, insert, update, delete on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;
