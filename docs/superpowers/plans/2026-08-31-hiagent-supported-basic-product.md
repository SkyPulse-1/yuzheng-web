# HiAgent Supported Basic Product Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a locally usable `yuzheng-web` basic product whose upload limits match school HiAgent, whose files bypass Next.js request-size limits, and whose HiAgent adapter matches the published conversational agent without changing HiAgent.

**Architecture:** The browser uploads directly to private Supabase Storage with an authenticated resumable upload, while Next.js route handlers prepare and finalize owned document records. Documents remain `STORED` until a real school ingestion endpoint is available. The server-only HiAgent client uses `create_conversation` plus `chat_query_v2`, keeps tenant filtering fail-closed, and never exposes credentials.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase Auth/PostgreSQL/Storage, `tus-js-client`, Vitest, Tailwind CSS 4.

**Spec:** `docs/superpowers/specs/2026-08-31-hiagent-only-frontend-integration-design.md`

## Global Constraints

- Do not modify, publish, or save anything in school HiAgent.
- Do not read, print, copy, persist, or commit API keys, AK/SK, tokens, or passwords.
- Accept only PDF up to 100MB, DOCX up to 50MB, and TXT up to 30MB.
- Keep Supabase Storage private and preserve owner/library checks on every route.
- Keep `HIAGENT_TRUSTED_FILTERS_ENABLED=false` until server-enforced owner and library filtering is externally verified.
- Do not delete the existing VikingDB files; remove them only from the active basic-product path.
- Preserve the existing `tmp/` directory and all unrelated user changes.

---

### Task 1: Align document limits and states with HiAgent

**Files:**
- Modify: `src/lib/documents.ts`
- Modify: `tests/documents/upload-limit.test.ts`
- Create: `supabase/migrations/202608310003_align_documents_with_hiagent.sql`

**Interfaces:**
- Produces: `DOCUMENT_UPLOAD_LIMITS_MB`, `getUploadLimitBytes(extension)`, `validateDocumentMetadata(input)`, and `validateDocumentFile(file)`.
- Produces: `DocumentStatus` including `STORED`.

- [ ] **Step 1: Replace the 500MB test with exact per-type boundary tests**

```ts
expect(getUploadLimitBytes("pdf")).toBe(100 * 1024 * 1024);
expect(getUploadLimitBytes("docx")).toBe(50 * 1024 * 1024);
expect(getUploadLimitBytes("txt")).toBe(30 * 1024 * 1024);
```

Add one accepted boundary and one rejected `+1 byte` case for each type. Expected failure before implementation: the existing function accepts no extension and defaults to 500MB.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm test -- tests/documents/upload-limit.test.ts`

Expected: FAIL because per-type limits and `STORED` do not exist.

- [ ] **Step 3: Implement metadata-first validation**

Add:

```ts
export const DOCUMENT_UPLOAD_LIMITS_MB = { pdf: 100, docx: 50, txt: 30 } as const;

export type DocumentMetadata = {
  name: string;
  type: string;
  size: number;
};

export function getUploadLimitBytes(extension: keyof typeof DOCUMENT_UPLOAD_LIMITS_MB): number;
export function validateDocumentMetadata(input: DocumentMetadata):
  | { ok: true; extension: keyof typeof DOCUMENT_UPLOAD_LIMITS_MB; maxMb: number }
  | { ok: false; error: string };
```

`validateDocumentFile` must delegate to `validateDocumentMetadata` so browser and server share identical rules.

- [ ] **Step 4: Add the database migration**

The migration must:

```sql
alter table public.documents drop constraint if exists documents_status_check;
alter table public.documents add constraint documents_status_check
  check (status in ('UPLOADING', 'STORED', 'PROCESSING', 'READY', 'FAILED', 'DELETING'));

update public.documents
set status = 'STORED',
    error_message = '文件已保存，学校文档处理服务尚未接通。'
where status = 'PROCESSING' and kb_document_id is null;

update storage.buckets
set file_size_limit = 104857600
where id = 'documents';
```

- [ ] **Step 5: Run the test suite**

Run: `npm test`

Expected: all existing and new tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/documents.ts tests/documents/upload-limit.test.ts supabase/migrations/202608310003_align_documents_with_hiagent.sql
git commit -m "fix: align document limits with hiagent"
```

### Task 2: Upload directly from the browser to private Supabase Storage

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/lib/uploads/resumable.ts`
- Modify: `src/app/api/libraries/[id]/documents/route.ts`
- Create: `src/app/api/documents/[id]/complete/route.ts`
- Modify: `src/components/documents/document-manager.tsx`
- Modify: `src/app/libraries/[id]/page.tsx`
- Create: `tests/documents/upload-flow.test.ts`

**Interfaces:**
- Consumes: `validateDocumentMetadata` from Task 1.
- Produces: `uploadDocumentResumably({ file, storagePath, accessToken, onProgress })`.
- Produces: prepare response `{ document: LibraryDocument }` and completion response `{ document: LibraryDocument }`.

- [ ] **Step 1: Add failing tests for upload preparation and completion helpers**

Cover:

```ts
expect(buildStoragePath({ ownerId, libraryId, documentId, extension: "pdf" }))
  .toBe(`${ownerId}/${libraryId}/${documentId}.pdf`);
```

Also cover invalid MIME, oversized files, missing Storage object, and final `STORED` status.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `npm test -- tests/documents/upload-flow.test.ts`

Expected: FAIL because the prepare/finalize helpers do not exist.

- [ ] **Step 3: Install the resumable upload client**

Run: `npm install tus-js-client`

Do not add any credential or endpoint literal beyond the existing public Supabase URL.

- [ ] **Step 4: Implement the browser upload wrapper**

Use Supabase's authenticated TUS endpoint:

```ts
export function uploadDocumentResumably(input: {
  file: File;
  supabaseUrl: string;
  accessToken: string;
  storagePath: string;
  onProgress: (percent: number) => void;
}): Promise<void>;
```

Use bucket `documents`, 6MB chunks, bounded retries, `x-upsert: false`, and remove the upload fingerprint after success.

- [ ] **Step 5: Change the Library documents POST route into a prepare endpoint**

Accept JSON `{ name, type, size }`, authenticate the user, verify Library ownership, create an `UPLOADING` record, and return the generated owned `storage_path`. Do not accept an owner ID or storage path from the browser.

- [ ] **Step 6: Add the completion route**

`POST /api/documents/[id]/complete` must authenticate, read the owned document row, verify the expected object exists in the `documents` bucket and has the expected size, then update the row to:

```ts
{
  status: "STORED",
  error_message: "文件已保存，学校文档处理服务尚未接通。"
}
```

- [ ] **Step 7: Update DocumentManager**

For each file: call prepare, obtain the current Supabase session, run the resumable upload, call completion, and show integer percentage progress. Replace the single `{maxUploadMb}` sentence with “PDF ≤ 100MB · DOCX ≤ 50MB · TXT ≤ 30MB”. Add `STORED` label “已保存”.

- [ ] **Step 8: Remove VikingDB from the active Library page UI path**

Do not import `isVikingConfigured`. Pass no Viking-specific prop. The page must describe school processing availability in provider-neutral language.

- [ ] **Step 9: Run tests, lint, and build**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: all succeed.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json src/lib/uploads/resumable.ts src/app/api/libraries src/app/api/documents src/components/documents/document-manager.tsx src/app/libraries tests/documents/upload-flow.test.ts
git commit -m "feat: add direct resumable document uploads"
```

### Task 3: Match the published conversational HiAgent API

**Files:**
- Modify: `src/lib/hiagent/client.ts`
- Modify: `src/app/api/chat/route.ts`
- Create: `supabase/migrations/202608310004_add_hiagent_conversation_id.sql`
- Create: `tests/hiagent/client.test.ts`
- Modify: `docs/setup/hiagent.md`

**Interfaces:**
- Produces: `createHiAgentConversation({ userId, inputs? }): Promise<string>`.
- Produces: `chatWithHiAgent({ userId, conversationId, query }): Promise<HiAgentResult>`.
- Produces: `parseHiAgentSse(text): HiAgentResult`.

- [ ] **Step 1: Add failing client tests**

Mock `fetch` and verify:

```ts
expect(request.headers).toMatchObject({ Apikey: "server-only-test-key" });
expect(JSON.parse(request.body)).toEqual({ UserID: "user-1" });
```

For `chat_query_v2`, verify `UserID`, `AppConversationID`, `Query`, and SSE aggregation. Assert that API keys never appear in returned errors or parsed output.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `npm test -- tests/hiagent/client.test.ts`

Expected: FAIL because the current client calls workflow endpoints.

- [ ] **Step 3: Implement the conversation client**

Use `HIAGENT_BASE_URL`, `HIAGENT_API_KEY`, `HIAGENT_CREATE_CONVERSATION_PATH` defaulting to `/create_conversation`, and `HIAGENT_CHAT_PATH` defaulting to `/chat_query_v2`. Keep the trusted-filter check fail-closed. Parse standard SSE `data:` messages, combine `event=message` answers, and reuse `parseHiAgentOutput` when a structured final payload is present.

- [ ] **Step 4: Add the conversation migration**

```sql
alter table public.conversations
add column if not exists hiagent_conversation_id text;
```

- [ ] **Step 5: Update `/api/chat`**

When creating a Supabase conversation, call `createHiAgentConversation` once and store the returned ID. For an existing conversation, select and reuse `hiagent_conversation_id`. Continue validating Library and selected READY documents before calling HiAgent.

- [ ] **Step 6: Update setup documentation**

Document only variable names and safe examples. State that `HIAGENT_TRUSTED_FILTERS_ENABLED` remains false until owner/library filtering is verified, and that `HIAGENT_UP_UPLOAD_ENDPOINT` must come from the school administrator.

- [ ] **Step 7: Run tests, lint, and build**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: all succeed without printing environment values.

- [ ] **Step 8: Commit**

```bash
git add src/lib/hiagent/client.ts src/app/api/chat/route.ts supabase/migrations/202608310004_add_hiagent_conversation_id.sql tests/hiagent/client.test.ts docs/setup/hiagent.md
git commit -m "feat: support conversational hiagent api"
```

### Task 4: Make the incomplete external dependency clear in the UI

**Files:**
- Modify: `src/components/assistant/assistant-workspace.tsx`
- Modify: `src/app/assistant/page.tsx`
- Modify: `src/components/documents/document-manager.tsx`
- Create: `tests/documents/status-copy.test.ts`

**Interfaces:**
- Consumes: `DocumentStatus` including `STORED`.
- Produces: user-facing status copy with no internal prompt or provider jargon.

- [ ] **Step 1: Add failing copy tests**

Assert that `STORED` renders as “已保存”, that no UI copy contains `Viking`, `火山`, `提示词`, `owner_id`, or `API Key`, and that the assistant empty state explains that only “可分析” documents can be selected.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `npm test -- tests/documents/status-copy.test.ts`

Expected: FAIL because the current UI contains Viking-specific state branching and lacks `STORED`.

- [ ] **Step 3: Implement concise product copy**

Use:

- `STORED`: “已保存”
- unavailable processing banner: “文件已安全保存。学校文档处理服务接通后，可继续生成证据卡。”
- assistant disabled state: “当前知识库还没有可分析的文档。”

Do not mention internal variable names or instruct users to edit HiAgent.

- [ ] **Step 4: Run tests, lint, and build**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: all succeed.

- [ ] **Step 5: Commit**

```bash
git add src/components/assistant/assistant-workspace.tsx src/app/assistant/page.tsx src/components/documents/document-manager.tsx tests/documents/status-copy.test.ts
git commit -m "fix: clarify stored document states"
```

### Task 5: Apply migrations and verify the local basic product

**Files:**
- Verify: all files changed in Tasks 1–4
- Preserve: `.env.local`, `tmp/`, and every unrelated file

**Interfaces:**
- Consumes: migrations `202608310003` and `202608310004`.
- Produces: a locally verified product at `http://localhost:3000` or the next available local port.

- [ ] **Step 1: Inspect migration status without printing secrets**

Check only whether required Supabase environment variable names are present. Do not echo values.

- [ ] **Step 2: Apply the two new SQL migrations**

Use the existing authenticated Supabase dashboard or configured migration mechanism. Before any browser SQL submission, request action-time confirmation because it changes the remote database. If confirmation is not available, leave exact copy-paste SQL and continue local verification against mocked/unit paths.

- [ ] **Step 3: Start the local server**

Run: `npm run dev`

Expected: Next.js starts without configuration values printed.

- [ ] **Step 4: Test the main flows**

Verify in the browser:

1. login with an existing test account;
2. create or open a Library;
3. reject PDF over 100MB, DOCX over 50MB, and TXT over 30MB;
4. upload a small supported file and observe progress;
5. see `已保存` when school processing is unavailable;
6. download the same private file;
7. verify assistant clearly explains why no document is yet analyzable;
8. verify home recent-evidence carousel and navigation still work.

- [ ] **Step 5: Run final automated verification**

Run:

```bash
npm test
npm run lint
npm run build
git status --short
```

Expected: tests, lint, and build succeed; only known `tmp/` remains untracked.

- [ ] **Step 6: Commit any verification-only fixes**

Stage only task-related files and use a focused message such as:

```bash
git commit -m "fix: complete basic product verification"
```
