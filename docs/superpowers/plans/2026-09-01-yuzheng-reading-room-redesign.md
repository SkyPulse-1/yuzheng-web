# Yuzheng Academic Reading Room Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn pasted text into a persistent, traceable library source and replace the empty three-column chat with a premium multi-source research-card workspace.

**Architecture:** Extend the existing `documents`, `conversations`, and `messages` model instead of introducing a parallel product. Next.js route handlers own authorization, HiAgent calls, result validation, persistence, soft deletion, and recovery; client components own only interaction state and optimistic presentation. `DESIGN.md` is the visual source of truth.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Supabase Auth/PostgreSQL/Storage, Vitest, school HiAgent HTTP API.

**Spec:** `docs/superpowers/specs/2026-09-01-yuzheng-reading-room-redesign.md`

## Global Constraints

- Do not modify the HiAgent application or school backend configuration.
- Do not read, print, copy, commit, or expose real API keys.
- Do not delete existing user data to make the migration pass.
- Pasted text limit is exactly 30,000 characters.
- Analysis always exposes exactly four sections: 内容摘要、关键观点、原文依据、信息不足与歧义.
- Pasted source title and body become immutable when analysis starts.
- Deleted sources remain recoverable for 30 days.
- UI copy must not expose prompt/system-instruction terminology.
- Respect `prefers-reduced-motion`.
- Local verification precedes deployment; do not deploy in this plan.

---

### Task 1: Persistent Source and Research-Card Schema

**Files:**
- Create: `supabase/migrations/202609010001_create_academic_reading_room.sql`
- Create: `src/lib/text-sources.ts`
- Create: `src/lib/analysis-results.ts`
- Test: `tests/text-sources/domain.test.ts`
- Test: `tests/text-analysis/result-parser.test.ts`

**Interfaces:**
- Produces `TextSourceInput`, `validateTextSourceInput`, `TextAnalysisResult`, `parseTextAnalysisResult`, and `validateSourceQuotes`.
- Extends `documents` with source kind, persisted text, analysis JSON/status, lock and recycle-bin timestamps.
- Extends `conversations` with processing status, selected source IDs, last error, and soft-delete metadata.

- [ ] Write failing domain tests for 30,000-character input, title validation, four fixed result sections, exact quote matching, and invalid quote removal.
- [ ] Run `npm test -- --run tests/text-sources/domain.test.ts tests/text-analysis/result-parser.test.ts` and confirm failure.
- [ ] Add the additive migration with checks, indexes, RLS-compatible grants, and a SQL purge function for records older than 30 days.
- [ ] Implement domain types and pure validation/parsing helpers without logging original text.
- [ ] Re-run the targeted tests and confirm they pass.
- [ ] Commit with `feat: add persistent text source model`.

### Task 2: Formal Text Save, Edit, Analyze, Trash, and Restore APIs

**Files:**
- Create: `src/app/api/libraries/[id]/text-sources/route.ts`
- Create: `src/app/api/documents/[id]/text-source/route.ts`
- Create: `src/app/api/documents/[id]/analyze-text/route.ts`
- Create: `src/app/api/documents/[id]/restore/route.ts`
- Modify: `src/app/api/documents/[id]/route.ts`
- Modify: `src/lib/text-analysis.ts`
- Modify: `src/lib/text-analysis-constants.ts`
- Test: `tests/text-sources/api-contract.test.ts`
- Test: `tests/text-analysis/service.test.ts`

**Interfaces:**
- `POST /api/libraries/:id/text-sources` saves title/body and returns the document.
- `PATCH /api/documents/:id/text-source` edits only unlocked text sources.
- `POST /api/documents/:id/analyze-text` locks, analyzes, validates, and persists four sections.
- `DELETE /api/documents/:id` performs soft deletion; `POST /restore` restores during the retention window.

- [ ] Write failing request-service tests for owner checks, save-before-analysis, lock enforcement, partial results, retry, soft delete, and restore.
- [ ] Run targeted tests and confirm failure.
- [ ] Implement authorization helpers and API handlers using the authenticated Supabase client.
- [ ] Upgrade analysis to a strict JSON request contract, chunk long text, merge sections, and validate every quoted excerpt with `source.includes(quote)`.
- [ ] Preserve stored text and valid partial results on timeout or malformed upstream output.
- [ ] Run targeted tests and confirm pass.
- [ ] Commit with `feat: persist and analyze pasted sources`.

### Task 3: Four-Section Analysis Cards and Fullscreen Context

**Files:**
- Replace: `src/components/documents/pasted-text-analysis.tsx`
- Create: `src/components/documents/text-source-manager.tsx`
- Create: `src/components/analysis/analysis-result-cards.tsx`
- Create: `src/components/analysis/analysis-detail-dialog.tsx`
- Create: `src/components/analysis/source-context-popover.tsx`
- Modify: `src/app/libraries/[id]/page.tsx`
- Test: `tests/components/text-source-manager.test.tsx`
- Test: `tests/components/analysis-result-cards.test.tsx`

**Interfaces:**
- `TextSourceManager` consumes persisted sources and exposes save/edit/analyze/delete interactions.
- `AnalysisResultCards` consumes the fixed `TextAnalysisResult` and always renders four cards.
- Fullscreen detail supports pointer, keyboard, and touch source-context interaction.

- [ ] Write failing component tests for save-first flow, 30,000 count, lock after analysis, four cards, missing-state copy, dialog focus entry, and source context.
- [ ] Run targeted tests and confirm failure.
- [ ] Build the formal source form and persisted source rows.
- [ ] Build hover-lift cards, fullscreen detail, quote binding, progressive context fading, and reduced-motion behavior.
- [ ] Remove “测试功能” and temporary-only copy.
- [ ] Run targeted tests and confirm pass.
- [ ] Commit with `feat: add traceable analysis cards`.

### Task 4: Persistent Evidence Q&A Card Board

**Files:**
- Create: `src/lib/questions.ts`
- Create: `src/app/api/questions/route.ts`
- Create: `src/app/api/questions/[id]/route.ts`
- Modify: `src/app/api/chat/route.ts`
- Replace: `src/components/assistant/assistant-workspace.tsx`
- Create: `src/components/assistant/source-shelf.tsx`
- Create: `src/components/assistant/question-board.tsx`
- Create: `src/components/assistant/question-card.tsx`
- Create: `src/components/assistant/question-detail-dialog.tsx`
- Create: `src/components/assistant/question-composer.tsx`
- Modify: `src/app/assistant/page.tsx`
- Test: `tests/questions/domain.test.ts`
- Test: `tests/components/assistant-workspace.test.tsx`

**Interfaces:**
- `GET /api/questions?libraryId=&query=&cursor=` returns newest-first pages of 12.
- `POST /api/chat` persists processing/completed/failed state and selected document IDs.
- `DELETE /api/questions/:id` deletes after client confirmation.
- Source shelf mixes ready uploaded files and analyzed pasted sources and supports multi-select.

- [ ] Write failing tests for mixed-source selection, all-library default, processing cards, pagination, search, completion, failure retry, and delete confirmation.
- [ ] Run targeted tests and confirm failure.
- [ ] Implement question queries and persistence without exposing source text in list responses.
- [ ] Replace the three-column chat with the 300px source shelf plus large right card board and fixed composer.
- [ ] Add fullscreen question detail with complete answer, evidence cards, and source-context display.
- [ ] Run targeted tests and confirm pass.
- [ ] Commit with `feat: build evidence question board`.

### Task 5: Trash and 30-Day Retention Experience

**Files:**
- Create: `src/app/trash/page.tsx`
- Create: `src/components/trash/trash-manager.tsx`
- Modify: `src/components/app-navigation.tsx`
- Modify: `src/app/api/questions/[id]/route.ts`
- Test: `tests/trash/retention.test.ts`
- Test: `tests/components/trash-manager.test.tsx`

**Interfaces:**
- Trash page lists `deleted_at`, `purge_after`, type, title, restore action, and days remaining.
- Source relationship policy removes unusable evidence after permanent deletion while preserving valid multi-source cards.

- [ ] Write failing tests for restore window, expiry calculation, single-source question removal, and partial-source labeling.
- [ ] Run targeted tests and confirm failure.
- [ ] Build the trash page and recovery action.
- [ ] Implement deterministic retention helpers and purge SQL behavior.
- [ ] Run targeted tests and confirm pass.
- [ ] Commit with `feat: add thirty day source trash`.

### Task 6: Apply the Academic Reading Room Design System

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Modify: `src/components/app-header.tsx`
- Modify: `src/components/app-navigation.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/libraries/page.tsx`
- Modify: `src/components/libraries/library-manager.tsx`
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/account/setup/page.tsx`
- Modify: `src/app/account/recovery/page.tsx`
- Modify: `src/app/account/recovery-code/page.tsx`
- Test: `tests/navigation/navigation.test.ts`

**Interfaces:**
- CSS utilities implement `DESIGN.md` tokens, glass interaction, hover sheen, card entry, modal entry, context fade, and reduced-motion overrides.
- Existing routes and data interfaces remain compatible.

- [ ] Export and translate `DESIGN.md` tokens into Tailwind v4 CSS variables and reusable classes.
- [ ] Apply shared navigation, typography, buttons, inputs, surfaces, states, and responsive spacing across user-visible routes.
- [ ] Keep the landing page distinct from the library and question workspace.
- [ ] Verify keyboard focus, 44px targets, mobile reflow, and reduced-motion CSS.
- [ ] Run navigation and component tests.
- [ ] Commit with `feat: apply academic reading room design`.

### Task 7: Full Verification and Local Handoff

**Files:**
- Modify tests only when they assert intentionally replaced behavior.
- Create: `docs/share/academic-reading-room-test-guide.md`

**Interfaces:**
- Produces a locally verified app and a novice-friendly test guide.

- [ ] Run `npm test` and require all tests to pass.
- [ ] Run `npm run lint` and require zero errors.
- [ ] Run `npm run build` and require a successful production build.
- [ ] Start or reuse the local server on port 3100.
- [ ] Browser-test login, library detail, formal text save/analyze states, four cards, mixed-source selection, question creation, fullscreen details, trash, responsive layout, and console errors.
- [ ] Compare final screenshots against the accepted “学术阅览室” hierarchy and fix visible defects.
- [ ] Write the test guide without secrets or deployment instructions.
- [ ] Commit with `test: verify academic reading room product`.
