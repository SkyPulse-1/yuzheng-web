alter table public.documents
  add column if not exists source_kind text not null default 'FILE',
  add column if not exists text_content text,
  add column if not exists analysis_status text not null default 'NOT_STARTED',
  add column if not exists analysis_result_json jsonb not null default '{"content_summary":[],"key_points":[],"source_evidence":[],"uncertainties":[]}'::jsonb,
  add column if not exists analysis_started_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists purge_after timestamptz;

alter table public.documents
  alter column storage_path drop not null;

alter table public.documents
  drop constraint if exists documents_source_kind_check,
  add constraint documents_source_kind_check check (source_kind in ('FILE', 'TEXT')),
  drop constraint if exists documents_analysis_status_check,
  add constraint documents_analysis_status_check check (analysis_status in ('NOT_STARTED', 'PROCESSING', 'READY', 'PARTIAL', 'FAILED')),
  drop constraint if exists documents_text_source_content_check,
  add constraint documents_text_source_content_check check (
    (source_kind = 'FILE' and text_content is null)
    or (source_kind = 'TEXT' and text_content is not null and char_length(text_content) between 1 and 30000)
  ),
  drop constraint if exists documents_recycle_window_check,
  add constraint documents_recycle_window_check check (
    (deleted_at is null and purge_after is null)
    or (deleted_at is not null and purge_after is not null and purge_after > deleted_at)
  );

create index if not exists documents_owner_recycle_idx
  on public.documents (owner_id, deleted_at, purge_after);

alter table public.conversations
  add column if not exists status text not null default 'COMPLETED',
  add column if not exists selected_document_ids uuid[] not null default '{}'::uuid[],
  add column if not exists source_scope_count integer not null default 0,
  add column if not exists source_warning text,
  add column if not exists last_error text,
  add column if not exists deleted_at timestamptz;

alter table public.conversations
  drop constraint if exists conversations_status_check,
  add constraint conversations_status_check check (status in ('PROCESSING', 'COMPLETED', 'FAILED')),
  drop constraint if exists conversations_source_scope_count_check,
  add constraint conversations_source_scope_count_check check (source_scope_count >= 0);

create index if not exists conversations_library_status_updated_idx
  on public.conversations (library_id, status, updated_at desc)
  where deleted_at is null;

create or replace function public.purge_expired_academic_sources()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed_count integer := 0;
begin
  with expired as (
    select id from public.documents
    where purge_after is not null and purge_after <= now()
  ), adjusted as (
    update public.conversations c
    set
      selected_document_ids = array(
        select source_id
        from unnest(c.selected_document_ids) source_id
        where not exists (select 1 from expired e where e.id = source_id)
      ),
      source_warning = case
        when exists (
          select 1 from unnest(c.selected_document_ids) source_id
          where exists (select 1 from expired e where e.id = source_id)
        ) then '部分来源已删除'
        else c.source_warning
      end
    where c.source_scope_count > 0
      and exists (
        select 1 from unnest(c.selected_document_ids) source_id
        where exists (select 1 from expired e where e.id = source_id)
      )
    returning c.id
  )
  delete from public.conversations c
  where c.source_scope_count > 0
    and cardinality(c.selected_document_ids) = 0;

  delete from public.documents
  where purge_after is not null and purge_after <= now();
  get diagnostics removed_count = row_count;
  return removed_count;
end;
$$;

revoke all on function public.purge_expired_academic_sources() from public;
grant execute on function public.purge_expired_academic_sources() to service_role;
