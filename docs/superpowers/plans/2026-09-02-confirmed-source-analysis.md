# Confirmed Source Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an explicit source-confirmation step that turns one selected source into four reliable evidence conclusion cards and two or more selected sources into the existing custom analysis flow.

**Architecture:** Keep draft and confirmed source ids separate in `AssistantWorkspace`. A dedicated single-source analysis service produces the existing `TextAnalysisResult` shape, validates every quoted source, persists results on the document, and feeds the existing fullscreen four-card components; multi-source questions continue through `/api/chat`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase, HiAgent, Vitest, Testing Library, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-09-02-confirmed-source-analysis-design.md`

## Global Constraints

- Checking a source must never call HiAgent; only the left-side confirmation button submits the scope.
- Confirming exactly one source renders all four fixed analysis cards and hides the free-form composer.
- Confirming two or more sources renders the research board and free-form composer without an automatic model request.
- Every non-uncertainty conclusion must contain a quote that exactly matches trusted source text or a HiAgent evidence snippet.
- API keys remain server-only and must not appear in responses, logs, tests, or client bundles.
- Do not modify HiAgent configuration or deployment.

---

### Task 1: Reliable single-source analysis service

**Files:**
- Create: `src/lib/single-source-analysis.ts`
- Modify: `src/lib/analysis-results.ts`
- Create: `tests/text-analysis/single-source-analysis.test.ts`
- Modify: `tests/text-analysis/result-parser.test.ts`

**Interfaces:**
- Consumes: `sourceKind`, `sourceName`, optional complete `sourceText`, and dependencies returning `HiAgentResult`.
- Produces: `analyzeSingleSource(input): Promise<{ result: TextAnalysisResult; contextText: string }>` and source excerpts whose context is derived from trusted text.

- [ ] **Step 1: Write failing service tests**

```ts
const analyzed = await analyzeSingleSource({
  userId: "user-1",
  sourceKind: "FILE",
  sourceName: "第一章.pdf",
  sourceText: null,
  dependencies: {
    createConversation: vi.fn().mockResolvedValue("remote-1"),
    analyze: vi.fn().mockResolvedValue({
      answer: JSON.stringify(structuredResult),
      evidenceCards: [{ card_id: "E1", claim: "证据", evidence_text: "前文。可靠原句。后文。", document_name: "第一章.pdf", page_number: 2 }],
    }),
  },
});
expect(analyzed.result.content_summary[0].sources[0].quote).toBe("可靠原句");
```

Add a negative case where the quote is absent from the evidence snippet and must be removed.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `npm test -- tests/text-analysis/single-source-analysis.test.ts tests/text-analysis/result-parser.test.ts`
Expected: FAIL because `analyzeSingleSource` and derived-context assertions do not exist.

- [ ] **Step 3: Implement trusted structured analysis**

For text, delegate to `analyzeTextSourceContent`. For files, send one strict JSON query, concatenate only returned `evidence_text` values as the validation corpus, parse with `parseTextAnalysisResult`, and throw `SOURCE_ANALYSIS_NO_RELIABLE_RESULT` when no section contains a reliable item.

Update `readExcerpt` so `context_before` and `context_after` are sliced from the validation corpus around the exact quote instead of trusting model-supplied context.

- [ ] **Step 4: Run focused tests and commit**

Run: `npm test -- tests/text-analysis/single-source-analysis.test.ts tests/text-analysis/result-parser.test.ts`
Expected: PASS.

```bash
git add src/lib/single-source-analysis.ts src/lib/analysis-results.ts tests/text-analysis/single-source-analysis.test.ts tests/text-analysis/result-parser.test.ts
git commit -m "feat: add reliable single source analysis"
```

### Task 2: Persisted analysis API and initial source data

**Files:**
- Create: `src/app/api/documents/[id]/analyze-source/route.ts`
- Modify: `src/app/assistant/page.tsx`
- Modify: `src/components/assistant/source-shelf.tsx`
- Create: `tests/components/source-shelf.test.tsx`

**Interfaces:**
- Consumes: one authenticated document id.
- Produces: `POST /api/documents/:id/analyze-source -> { result, status }` and `AssistantSource` entries containing `analysisResult`, `sourceText`, and `analysisStatus`.

- [ ] **Step 1: Write failing source-shelf confirmation tests**

```tsx
render(<SourceShelf sources={sources} selectedIds={[]} pending={false} onChange={onChange} onConfirm={onConfirm} />);
await user.click(screen.getByRole("checkbox", { name: /第一章/ }));
expect(onConfirm).not.toHaveBeenCalled();
await user.click(screen.getByRole("button", { name: "确认资料" }));
expect(onConfirm).toHaveBeenCalledTimes(1);
```

- [ ] **Step 2: Run the component test and confirm failure**

Run: `npm test -- tests/components/source-shelf.test.tsx`
Expected: FAIL because the confirmation interface is missing.

- [ ] **Step 3: Implement the authenticated API route**

Query the owned, non-deleted document, return a valid cached result when present, lock only `analysis_status`, call `analyzeSingleSource`, save `analysis_result_json`, set `analysis_status` to `READY` or `FAILED`, and preserve the document ingestion `status`.

- [ ] **Step 4: Extend server source data and left confirmation UI**

Select `text_content`, `analysis_result_json`, and `analysis_status` on the assistant page. Add a sticky footer to `SourceShelf` with selection count and a disabled-safe `确认资料` button. Keep checkboxes as draft-only state.

- [ ] **Step 5: Run focused tests and commit**

Run: `npm test -- tests/components/source-shelf.test.tsx`
Expected: PASS.

```bash
git add src/app/api/documents/[id]/analyze-source/route.ts src/app/assistant/page.tsx src/components/assistant/source-shelf.tsx tests/components/source-shelf.test.tsx
git commit -m "feat: confirm source scope before analysis"
```

### Task 3: Single-card mode, multi-source mode, and fullscreen context

**Files:**
- Create: `src/components/assistant/single-source-analysis-panel.tsx`
- Modify: `src/components/assistant/assistant-workspace.tsx`
- Modify: `src/components/assistant/question-composer.tsx`
- Modify: `src/app/globals.css`
- Create: `tests/components/assistant-workspace.test.tsx`
- Modify: `tests/components/analysis-result-cards.test.tsx`

**Interfaces:**
- Consumes: confirmed source ids and the analyze-source API response.
- Produces: three explicit right-side modes: unconfirmed prompt, one-source four-card analysis, and multi-source custom questions.

- [ ] **Step 1: Write failing workspace mode tests**

```tsx
expect(screen.getByText("选择资料并确认")).toBeTruthy();
await confirmSources(["source-1"]);
expect(fetch).toHaveBeenCalledWith("/api/documents/source-1/analyze-source", { method: "POST" });
expect(await screen.findByText("内容摘要")).toBeTruthy();

await confirmSources(["source-1", "source-2"]);
expect(screen.getByText("从一个分析需求开始")).toBeTruthy();
expect(screen.getByRole("textbox", { name: "分析需求" })).toBeTruthy();
```

- [ ] **Step 2: Run the workspace test and confirm failure**

Run: `npm test -- tests/components/assistant-workspace.test.tsx tests/components/analysis-result-cards.test.tsx`
Expected: FAIL because the mode controller and panel do not exist.

- [ ] **Step 3: Implement mode control and analysis panel**

Maintain `draftSelectedIds` and `confirmedSelectedIds`. On single confirmation, reuse an initial result or fetch once and render `AnalysisResultCards`; on multi confirmation, render `QuestionBoard` and `QuestionComposer` using only confirmed ids. Show human-readable loading and retry states without exposing technical error text.

- [ ] **Step 4: Finish interaction styling**

Add the left sticky confirmation footer, one-source heading, four-card grid spacing, restrained processing shimmer, visible focus, and narrow-screen stacking. Reuse existing full-screen detail and faded source-context styles.

- [ ] **Step 5: Run focused tests and commit**

Run: `npm test -- tests/components/assistant-workspace.test.tsx tests/components/analysis-result-cards.test.tsx`
Expected: PASS.

```bash
git add src/components/assistant/single-source-analysis-panel.tsx src/components/assistant/assistant-workspace.tsx src/components/assistant/question-composer.tsx src/app/globals.css tests/components/assistant-workspace.test.tsx tests/components/analysis-result-cards.test.tsx
git commit -m "feat: add confirmed source analysis modes"
```

### Task 4: Full regression and browser verification

**Files:**
- Modify: `design-qa.md`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: verified local assistant flow and QA record.

- [ ] **Step 1: Run all automated checks**

Run: `npm test && npm run lint && npx tsc --noEmit && npm run build`
Expected: all commands exit successfully.

- [ ] **Step 2: Verify the current local library in the in-app browser**

Confirm one pasted-text source and verify exactly four cards appear; open a card fullscreen; hover a summary and verify source context with faded surrounding text. Return, confirm both sources, and verify the custom analysis composer appears without an automatic request.

- [ ] **Step 3: Record QA and commit**

Document tested states, source reliability limits for uploaded files, viewport checks, and any remaining school-interface dependency in `design-qa.md`.

```bash
git add design-qa.md
git commit -m "test: verify confirmed source analysis flow"
```
