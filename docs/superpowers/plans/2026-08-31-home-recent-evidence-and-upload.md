# 首页最近证据卡与 500MB 上传 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将单文件上传上限提升到 500MB，并在首页单卡区域轮播当前账号最近打开的证据卡，同时清理用户界面的内部化、AI 化表达。

**Architecture:** Supabase 新表以 `(owner_id, message_id, card_index)` 唯一标识一次证据卡阅读记录，并存储展示快照与 `opened_at`。问答接口返回证据消息 ID，客户端在展开证据或打开原文时调用受登录和 RLS 保护的记录接口；首页服务端读取最近 3 条，客户端组件负责 5 秒轮播与无障碍降级。上传限制由共享校验、页面配置和 Storage bucket 三层共同设为 500MB。

**Tech Stack:** Next.js 16 App Router、React 19、TypeScript、Tailwind CSS 4、Supabase Auth/PostgreSQL/Storage、Vitest。

**Spec:** `docs/superpowers/specs/2026-08-31-home-recent-evidence-and-upload-design.md`

## Global Constraints

- 首页只保留一个证据卡位置，最多轮播最近 3 张，每 5 秒切换。
- 没有阅读记录的新用户和未登录访客继续看到“长征战略意义比较”示例。
- 最近打开记录必须由 Supabase 跨设备同步，并由 RLS 隔离账号。
- 单个文件上限统一为 500MB；超过时提示“单个文件不能超过 500MB，请压缩或拆分后重试”。
- 用户界面不出现提示词、模型、智能体思考、内部接口名或第三方实现细节。
- 不删除或重写现有用户、知识库、文档、会话和消息数据。

---

### Task 1: 统一 500MB 上传限制

**Files:**
- Modify: `src/lib/documents.ts`
- Modify: `src/app/libraries/[id]/page.tsx`
- Modify: `.env.example`
- Modify locally only: `.env.local`
- Create: `supabase/migrations/202608310001_raise_document_upload_limit.sql`
- Create: `tests/documents/upload-limit.test.ts`

**Interfaces:**
- Consumes: existing `getUploadLimitBytes()` and `validateDocumentFile(file)`.
- Produces: `DEFAULT_MAX_UPLOAD_MB = 500`; Storage bucket `documents.file_size_limit = 524288000`.

- [ ] **Step 1: Write the failing upload-limit tests**

```ts
import { afterEach, describe, expect, it } from "vitest";
import { getUploadLimitBytes, validateDocumentFile } from "../../src/lib/documents";

describe("document upload limit", () => {
  afterEach(() => delete process.env.NEXT_PUBLIC_MAX_UPLOAD_MB);

  it("defaults to 500MB", () => {
    delete process.env.NEXT_PUBLIC_MAX_UPLOAD_MB;
    expect(getUploadLimitBytes()).toBe(500 * 1024 * 1024);
  });

  it("rejects a file above 500MB with actionable copy", () => {
    const file = new File(["x"], "large.pdf", { type: "application/pdf" });
    Object.defineProperty(file, "size", { value: 500 * 1024 * 1024 + 1 });
    expect(validateDocumentFile(file)).toEqual({
      ok: false,
      error: "单个文件不能超过 500MB，请压缩或拆分后重试。",
    });
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- tests/documents/upload-limit.test.ts`

Expected: FAIL because the current fallback is 50MB and the error lacks the recovery instruction.

- [ ] **Step 3: Implement the shared 500MB default**

```ts
export const DEFAULT_MAX_UPLOAD_MB = 500;

export function getUploadLimitBytes() {
  const configured = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB ?? DEFAULT_MAX_UPLOAD_MB);
  const megabytes = Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MAX_UPLOAD_MB;
  return megabytes * 1024 * 1024;
}
```

Use `DEFAULT_MAX_UPLOAD_MB` in `src/app/libraries/[id]/page.tsx`, change both env files to `NEXT_PUBLIC_MAX_UPLOAD_MB=500`, and return `单个文件不能超过 ${limit}MB，请压缩或拆分后重试。` from the validator.

- [ ] **Step 4: Raise the existing Storage bucket limit without recreating it**

```sql
update storage.buckets
set file_size_limit = 524288000
where id = 'documents';
```

- [ ] **Step 5: Run the focused test and commit**

Run: `npm test -- tests/documents/upload-limit.test.ts`

Expected: PASS.

Commit tracked files with: `git commit -m "feat: raise document upload limit to 500mb"`.

---

### Task 2: 保存真实证据卡阅读记录

**Files:**
- Create: `supabase/migrations/202608310002_create_evidence_card_views.sql`
- Create: `src/lib/evidence-views.ts`
- Create: `src/app/api/evidence-views/route.ts`
- Modify: `src/app/api/chat/route.ts`
- Create: `tests/evidence/evidence-views.test.ts`

**Interfaces:**
- Consumes: assistant `messages.id`, `messages.evidence_cards_json`, current authenticated user.
- Produces: `parseEvidenceCardSnapshot(value): EvidenceCard | null`; POST `/api/evidence-views` body `{ messageId: string; cardIndex: number }`; chat response field `evidenceMessageId: string`.

- [ ] **Step 1: Write failing snapshot-validation tests**

```ts
import { describe, expect, it } from "vitest";
import { parseEvidenceCardSnapshot } from "../../src/lib/evidence-views";

describe("parseEvidenceCardSnapshot", () => {
  it("keeps only homepage-safe evidence fields", () => {
    expect(parseEvidenceCardSnapshot({ card_id: "E1", claim: "观点", evidence_text: "原文", document_name: "A.pdf", page_number: 3, retrieval_score: 0.9 })).toEqual({
      card_id: "E1", claim: "观点", evidence_text: "原文", document_name: "A.pdf", page_number: 3,
    });
  });

  it("rejects incomplete cards", () => {
    expect(parseEvidenceCardSnapshot({ claim: "观点" })).toBeNull();
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- tests/evidence/evidence-views.test.ts`

Expected: FAIL because `src/lib/evidence-views.ts` does not exist.

- [ ] **Step 3: Add the RLS-protected table**

```sql
create table public.evidence_card_views (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  card_index integer not null check (card_index >= 0),
  card_json jsonb not null,
  opened_at timestamptz not null default now(),
  unique (owner_id, message_id, card_index)
);
create index evidence_card_views_owner_opened_idx on public.evidence_card_views (owner_id, opened_at desc);
alter table public.evidence_card_views enable row level security;
create policy "Users can view own evidence views" on public.evidence_card_views for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Users can create own evidence views" on public.evidence_card_views for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Users can update own evidence views" on public.evidence_card_views for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
grant select, insert, update on public.evidence_card_views to authenticated;
```

- [ ] **Step 4: Implement trusted snapshot parsing and the record API**

The route authenticates the user, validates UUID-like `messageId` and a non-negative integer `cardIndex`, selects the owned message, extracts `evidence_cards_json[cardIndex]`, passes it through `parseEvidenceCardSnapshot`, then upserts:

```ts
await supabase.from("evidence_card_views").upsert(
  { owner_id: user.id, message_id: messageId, card_index: cardIndex, card_json: card, opened_at: new Date().toISOString() },
  { onConflict: "owner_id,message_id,card_index" },
);
```

Return 204 on success, 400 for invalid input/card, 401 when logged out, 404 when the message is not owned, and 500 only for a database failure.

- [ ] **Step 5: Return the assistant message ID from chat**

Change the assistant message insert to `.select("id").single()`. If saving the response fails, return a plain user-facing error. On success add `evidenceMessageId: savedMessage.id` to the JSON response.

- [ ] **Step 6: Run focused tests and commit**

Run: `npm test -- tests/evidence/evidence-views.test.ts`

Expected: PASS.

Commit: `git commit -m "feat: track recently opened evidence cards"`.

---

### Task 3: 在问答页触发阅读记录

**Files:**
- Modify: `src/components/assistant/assistant-workspace.tsx`

**Interfaces:**
- Consumes: chat response `evidenceMessageId`; POST `/api/evidence-views`.
- Produces: `recordEvidenceView(cardIndex: number): Promise<void>` invoked on details open and source link click.

- [ ] **Step 1: Associate displayed cards with their saved message**

Add `const [evidenceMessageId, setEvidenceMessageId] = useState("")` and set it from a successful chat response before displaying its cards.

- [ ] **Step 2: Add best-effort recording**

```ts
async function recordEvidenceView(cardIndex: number) {
  if (!evidenceMessageId) return;
  await fetch("/api/evidence-views", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messageId: evidenceMessageId, cardIndex }),
  }).catch(() => undefined);
}
```

Call it when a `<details>` element changes to open and before following “查看原文”. A recording failure must never block reading the card or opening the file.

- [ ] **Step 3: Run lint and commit**

Run: `npm run lint -- src/components/assistant/assistant-workspace.tsx`

Expected: PASS.

Commit: `git commit -m "feat: record evidence card opens"`.

---

### Task 4: 首页单卡轮播与新用户示例

**Files:**
- Create: `src/components/home/recent-evidence-carousel.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/lib/evidence-views.ts`
- Extend: `tests/evidence/evidence-views.test.ts`

**Interfaces:**
- Consumes: Supabase `evidence_card_views.card_json`, ordered by `opened_at desc`, limit 3.
- Produces: `<RecentEvidenceCarousel cards={EvidenceCard[]} />`; `parseRecentEvidenceRows(rows): EvidenceCard[]`.

- [ ] **Step 1: Add a failing row-filter test**

```ts
it("returns at most three valid recent cards", () => {
  const rows = [1, 2, 3, 4].map((n) => ({ card_json: { card_id: `E${n}`, claim: `观点${n}`, evidence_text: `原文${n}`, document_name: "A.pdf", page_number: n } }));
  expect(parseRecentEvidenceRows(rows).map((card) => card.card_id)).toEqual(["E1", "E2", "E3"]);
});
```

- [ ] **Step 2: Implement the server query and safe fallback**

Make `Home` async. Resolve the current user, query only when logged in, and parse rows through `parseRecentEvidenceRows`. On any missing configuration, auth, query, or parsing failure, pass an empty list so the component renders the existing Long March sample. Change authenticated navigation and primary CTA to `/dashboard` with plain labels “进入工作区” and “继续使用”.

- [ ] **Step 3: Implement the fixed-size carousel**

The client component keeps one card visible, changes index every 5000ms only when there are at least two cards, pauses on pointer hover and keyboard focus, and exposes accessible previous/next buttons plus one button per position. Add a short opacity/translate transition and use `@media (prefers-reduced-motion: reduce)` to disable automatic movement and transitions.

- [ ] **Step 4: Verify responsive behavior and commit**

Run: `npm test -- tests/evidence/evidence-views.test.ts && npm run lint && npm run build`.

Expected: all commands PASS; homepage retains one-card width at 375px and desktop sizes.

Commit: `git commit -m "feat: show recent evidence on home page"`.

---

### Task 5: 清理用户可见的内部化和 AI 化文案

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/api/chat/route.ts`
- Modify: `src/components/assistant/assistant-workspace.tsx`
- Modify: `src/components/documents/document-manager.tsx`
- Modify other `src/app/**` or `src/components/**` files only when the audit finds the prohibited language in rendered UI.

**Interfaces:**
- Consumes: existing user-visible labels and API error strings.
- Produces: plain Chinese status and recovery messages with no internal provider or model terminology.

- [ ] **Step 1: Audit rendered copy**

Run: `rg -n "AI|人工智能|智能体|提示词|模型|HiAgent|火山|Viking|接口|工作流|检索分数|思考" src/app src/components`

Classify every match as user-visible text or internal code. Do not rename internal APIs or environment variables.

- [ ] **Step 2: Replace user-visible internal language**

Use these exact replacements where the current meaning matches:

- `可溯源学术证据智能体` → `可溯源学术证据工具`
- `HiAgent 安全过滤尚未完成配置，暂不允许发起问答。` → `问答功能尚未配置完成，请稍后再试。`
- `火山知识库尚未配置。` → `文档检索服务尚未配置。`
- Keep progress copy factual, such as `正在查找相关材料…`.

Every error must say what happened and, when actionable, what the user can do next.

- [ ] **Step 3: Run full verification**

Run: `npm test && npm run lint && npm run build`.

Expected: all tests, lint, and production build PASS.

- [ ] **Step 4: Browser acceptance test**

Start `npm run dev`. Check logged-out homepage sample, logged-in empty-history sample, evidence open recording, homepage recent-first ordering, 5-second transition, controls, hover pause, 375px layout, document upload description, and oversize rejection. Confirm all links and buttons remain usable.

- [ ] **Step 5: Commit and integrate**

Commit: `git commit -m "fix: simplify user-facing guidance"`.

Review the isolated branch diff, merge it to `main` without deleting unrelated files, push the project branch, apply both new Supabase migrations to the configured project, restart the local development server, and repeat the homepage/upload smoke test.
