create table public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  library_id uuid not null references public.libraries(id) on delete cascade,
  original_name text not null check (char_length(original_name) between 1 and 255),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  storage_path text not null unique,
  kb_document_id text,
  status text not null default 'UPLOADING' check (status in ('UPLOADING', 'PROCESSING', 'READY', 'FAILED', 'DELETING')),
  error_message text,
  page_count integer check (page_count is null or page_count > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index documents_library_updated_idx
  on public.documents (library_id, updated_at desc);
create index documents_owner_status_idx
  on public.documents (owner_id, status);

create trigger documents_set_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

alter table public.documents enable row level security;

create policy "Users can view own documents"
on public.documents for select to authenticated
using ((select auth.uid()) = owner_id);

create policy "Users can create own documents"
on public.documents for insert to authenticated
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.libraries
    where libraries.id = library_id and libraries.owner_id = (select auth.uid())
  )
);

create policy "Users can update own documents"
on public.documents for update to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "Users can delete own documents"
on public.documents for delete to authenticated
using ((select auth.uid()) = owner_id);

grant select, insert, update, delete on public.documents to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  52428800,
  array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
)
on conflict (id) do nothing;

create policy "Users can upload own document files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users can view own document files"
on storage.objects for select to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users can delete own document files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
