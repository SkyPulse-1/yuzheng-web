# 语证统一证据问答分析流程实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 知识库详情只负责保存和管理资料，所有文件与文字分析统一从证据问答页提交。

**Architecture:** 新增纯函数统一判断问答可用资料：文字资料只要已保存即可使用，上传文件仍须为 `READY`。知识库页移除独立分析 UI；问答接口在发送 HiAgent 请求前锁定所有本次使用的文字资料，同时保留旧分析接口兼容历史调用。

**Tech Stack:** Next.js 16、React 19、TypeScript、Supabase、Vitest、Testing Library。

**Spec:** `docs/superpowers/specs/2026-09-01-unified-evidence-analysis-flow-design.md`

## Global Constraints

- 不删除旧分析接口或数据库字段。
- 不修改学校 HiAgent 应用、工作流、密钥或发布配置。
- 上传文件只有 `READY` 状态可进入证据问答。
- `TEXT` 资料在 `STORED` 或 `READY` 状态均可进入证据问答。
- 文字资料首次用于问答时写入 `analysis_started_at`，失败或超时后仍保持锁定。
- 不提交现有未跟踪的 `artifacts/`。

---

### Task 1: 统一可用资料规则

**Files:**
- Create: `src/lib/assistant-sources.ts`
- Create: `tests/assistant/sources.test.ts`
- Modify: `src/app/assistant/page.tsx`
- Modify: `src/app/libraries/[id]/page.tsx`
- Modify: `src/app/api/libraries/[id]/text-sources/route.ts`

**Interfaces:**
- Produces: `isAssistantSourceAvailable(source: { source_kind: string; status: string }): boolean`
- Consumes: server-loaded document rows on library and assistant pages.

- [ ] Write tests proving `TEXT/STORED` and `TEXT/READY` are available, `FILE/READY` is available, and `FILE/STORED` is not.
- [ ] Run `npm test -- tests/assistant/sources.test.ts` and verify failure before implementation.
- [ ] Implement the availability helper and use it when building the assistant source shelf and library ready counts.
- [ ] Save new text sources with `status: "READY"` while retaining support for old `STORED` rows.
- [ ] Run the focused test and commit with `feat: unify assistant source availability`.

### Task 2: 移除知识库页独立分析 UI

**Files:**
- Modify: `src/components/documents/text-source-manager.tsx`
- Modify: `tests/components/pasted-text-analysis.test.tsx`

**Interfaces:**
- Consumes: existing text-source create, edit and trash endpoints.
- Produces: save/manage-only text source panel with a link to `/assistant?libraryId=<id>`.

- [ ] Update component tests to require no “开始分析/重新分析” button, no four result headings, and a “前往证据问答” link.
- [ ] Remove analysis imports, parsing state, request function, status copy and result cards from `TextSourceManager`.
- [ ] Keep editing available only when `analysis_started_at` is null; keep trash and recovery behavior unchanged.
- [ ] Run `npm test -- tests/components/pasted-text-analysis.test.tsx` and commit with `feat: route text analysis through evidence questions`.

### Task 3: 提问前锁定文字资料

**Files:**
- Modify: `src/app/api/chat/route.ts`
- Modify: `tests/assistant/sources.test.ts`

**Interfaces:**
- Consumes: selected/all available documents from Task 1.
- Produces: validated document scope and a Supabase update that sets `analysis_started_at` for used text rows before the HiAgent request.

- [ ] Add tests for filtering selected/all documents with the shared availability rule.
- [ ] Replace the `status = READY` chat queries with library-owned, non-deleted rows filtered through the shared helper.
- [ ] After the question card and user message are saved and transport configuration is valid, lock every used text source whose lock is null.
- [ ] If locking fails, mark the conversation failed and return a user-safe error; on HiAgent timeout preserve the lock.
- [ ] Run assistant, question and component tests; commit with `feat: lock text sources when evidence analysis starts`.

### Task 4: 完整验证与浏览器验收

**Files:**
- Update: `design-qa.md` only if visual findings require documentation.

**Interfaces:**
- Consumes: local knowledge-library and assistant routes.
- Produces: verified local workflow without deployment.

- [ ] Run `npm test`, `npm run lint`, `npx tsc --noEmit`, and `npm run build`.
- [ ] In the application browser verify the knowledge page has upload/save/manage controls but no four analysis cards or independent analysis button.
- [ ] Verify saved text appears in the assistant source shelf and that existing question-card behavior remains visible.
- [ ] Keep the local preview running and report the exact remaining external HiAgent limitation separately.
