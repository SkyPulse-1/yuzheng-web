-- Harden document writes so the browser cannot bypass the Next.js API.
--
-- Before this migration, an authenticated user could call Supabase directly
-- to modify their own `documents` rows (path / library / status / analysis
-- fields) and upload arbitrary objects under their UUID prefix. We now:
--   1. remove direct INSERT/UPDATE/DELETE on documents for `authenticated`;
--   2. require every storage upload to match a server-created, owned,
--      `UPLOADING` document path.
--
-- Server routes write through the service-role client and keep explicit
-- owner checks. Reads remain RLS-scoped through the user session client.

-- 1) Remove browser write access to the documents table.
revoke insert, update, delete on public.documents from authenticated;

drop policy if exists "Users can create own documents" on public.documents;
drop policy if exists "Users can update own documents" on public.documents;
drop policy if exists "Users can delete own documents" on public.documents;

-- 2) Bind storage uploads to an owned document that is still UPLOADING.
drop policy if exists "Users can upload own document files" on storage.objects;

create policy "Users can upload own document files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'documents'
  and exists (
    select 1
    from public.documents d
    where d.owner_id = (select auth.uid())
      and d.status = 'UPLOADING'
      and d.storage_path = name
  )
);
