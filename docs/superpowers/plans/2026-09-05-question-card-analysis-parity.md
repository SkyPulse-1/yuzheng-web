# Custom Question Card Analysis Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every user-created question result look, open, read, and speak like the four fixed analysis cards while remaining one card per question.

**Architecture:** Extract a shared visual card frame used by fixed analysis sections and custom questions. Convert free-form answer text into numbered display statements for a matching fullscreen detail layout, while keeping HiAgent answer and evidence payloads unchanged in storage. Add a concise server-side response-style instruction so new answers are objective, conclusion-first, and evidence-bound.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Vitest, Testing Library

**Spec:** `docs/superpowers/specs/2026-09-05-question-card-analysis-parity-design.md`

## Global Constraints

- Keep one custom question result as one card; do not split it into four cards.
- Preserve the existing Conversation, Message, Evidence Card, Supabase, and HiAgent protocols.
- Do not modify the document status machine, school HiAgent backend, or deployment.
- Do not expose or read `.env.local` values.
- Keep wording objective and evidence-bound; state when the selected materials are insufficient.

---

### Task 1: Shared Analysis Card Frame

**Files:**
- Create: `src/components/analysis/analysis-card-frame.tsx`
- Modify: `src/components/analysis/analysis-result-cards.tsx`
- Modify: `src/components/assistant/question-card.tsx`
- Test: `tests/components/analysis-card-parity.test.tsx`

**Interfaces:**
- Produces: `AnalysisCardFrame(props)` with eyebrow, title, description, count label, preview, action label, processing state, open callback, and optional secondary action.
- Consumes: existing `glass-hover-card`, `analysis-card`, `metadata-chip`, and typography classes.

- [ ] **Step 1: Write a failing component test**

Render one fixed analysis card and one completed question card. Assert both expose `data-analysis-card="true"`, use the same main card class, show the same “打开详情” action, and retain question deletion as a secondary control.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm test -- tests/components/analysis-card-parity.test.tsx`

Expected: FAIL because the shared frame and parity marker do not exist.

- [ ] **Step 3: Implement the shared frame and refactor both consumers**

Create a focused client component that owns pointer glow calculation and the shared card hierarchy. Keep domain-specific labels and callbacks in each consumer.

- [ ] **Step 4: Run focused card tests**

Run: `npm test -- tests/components/analysis-card-parity.test.tsx tests/components/analysis-result-cards.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/analysis/analysis-card-frame.tsx src/components/analysis/analysis-result-cards.tsx src/components/assistant/question-card.tsx tests/components/analysis-card-parity.test.tsx
git commit -m "refactor: unify analysis and question card frames"
```

### Task 2: Matching Fullscreen Result Structure

**Files:**
- Modify: `src/lib/questions.ts`
- Modify: `src/components/assistant/question-detail-dialog.tsx`
- Modify: `src/app/globals.css`
- Modify: `tests/questions/domain.test.ts`
- Modify: `tests/components/dialog-transition.test.tsx`

**Interfaces:**
- Produces: `splitQuestionAnswer(answer: string): string[]`, which removes empty lines and list prefixes and returns stable conclusion statements.
- Consumes: `QuestionCard.answer`, `QuestionCard.evidenceCards`, the existing dialog transition hook, and local document links.

- [ ] **Step 1: Write failing domain and dialog tests**

Assert that answer text such as `"1. 核心结论\n\n- 补充判断"` becomes `["核心结论", "补充判断"]`. Assert the question dialog uses the fullscreen analysis surface, renders numbered conclusion statements, evidence entries, and the exact insufficient-evidence message when evidence is empty.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- tests/questions/domain.test.ts tests/components/dialog-transition.test.tsx`

Expected: FAIL because answer splitting and fullscreen parity are absent.

- [ ] **Step 3: Implement answer display normalization and unified detail layout**

Use the existing `.analysis-dialog`, `.analysis-dialog-header`, `.analysis-statement`, and `.evidence-detail-card` styles. Preserve raw stored answer text; normalization applies only to rendering.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- tests/questions/domain.test.ts tests/components/dialog-transition.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/questions.ts src/components/assistant/question-detail-dialog.tsx src/app/globals.css tests/questions/domain.test.ts tests/components/dialog-transition.test.tsx
git commit -m "feat: align question result detail with analysis cards"
```

### Task 3: Evidence-Bound Answer Language and Final Verification

**Files:**
- Create: `src/lib/question-query.ts`
- Modify: `src/app/api/chat/route.ts`
- Create: `tests/hiagent/question-query.test.ts`

**Interfaces:**
- Produces: a pure query-building helper that appends the exact language contract: direct conclusion first, objective Chinese, no greetings or AI self-reference, evidence-only claims, and explicit insufficiency.
- Consumes: selected source names, direct text context, and the user analysis request.

- [ ] **Step 1: Write a failing query-contract test**

Assert the generated query contains all language constraints without altering the user question or selected-source scope.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm test -- tests/hiagent/question-query.test.ts`

Expected: FAIL because the helper and explicit contract do not exist.

- [ ] **Step 3: Extract and use the query builder**

Keep the existing HiAgent endpoints, `AppKey`, `UserID`, conversation creation, SSE parsing, Evidence Cards, and database writes unchanged. Only make the answer-style instruction deterministic and testable.

- [ ] **Step 4: Run complete verification**

```bash
npm test
npm run lint
npm run build
```

Expected: all tests pass; lint and production build exit successfully.

- [ ] **Step 5: Security and commit-scope check**

Run `git diff --check`, confirm `.env.local` remains ignored and untracked, and inspect staged files before committing.

- [ ] **Step 6: Commit and sync**

```bash
git add src/app/api/chat/route.ts src/lib/question-query.ts tests/hiagent/question-query.test.ts
git commit -m "feat: standardize evidence answer language"
git push origin feat/hiagent-supported-basic-product
```
