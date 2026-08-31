create table public.evidence_card_views (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  card_index integer not null check (card_index >= 0),
  card_json jsonb not null,
  opened_at timestamptz not null default now(),
  unique (owner_id, message_id, card_index)
);

create index evidence_card_views_owner_opened_idx
on public.evidence_card_views (owner_id, opened_at desc);

alter table public.evidence_card_views enable row level security;

create policy "Users can view own evidence views"
on public.evidence_card_views for select to authenticated
using ((select auth.uid()) = owner_id);

create policy "Users can create own evidence views"
on public.evidence_card_views for insert to authenticated
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.messages
    where messages.id = message_id
      and messages.owner_id = (select auth.uid())
  )
);

create policy "Users can update own evidence views"
on public.evidence_card_views for update to authenticated
using ((select auth.uid()) = owner_id)
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.messages
    where messages.id = message_id
      and messages.owner_id = (select auth.uid())
  )
);

grant select, insert, update on public.evidence_card_views to authenticated;
