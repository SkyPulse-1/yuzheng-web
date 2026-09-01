# Home Real Workspace Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fake homepage evidence sample with a reliable 20-second carousel of the signed-in user’s most recently analyzed workspaces and working source links.

**Architecture:** Build a pure aggregation layer that joins completed conversations, assistant messages, libraries, and live document records into trusted homepage slides. The server page performs bounded Supabase reads, the client carousel only renders prevalidated links, and the existing document file endpoint serves both stored files and pasted text.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase, Vitest, Testing Library, CSS.

**Spec:** `docs/superpowers/specs/2026-09-01-home-real-workspace-carousel-design.md`

## Global Constraints

- Show at most three unique workspaces ordered by their most recent completed analysis.
- Each carousel item remains active for exactly 20 seconds unless paused or reduced motion is enabled.
- Never show demo evidence or a source link that has not been matched to a live, owned, non-deleted document in the same workspace.
- Never expose API keys or service credentials to client code, logs, tests, or rendered content.
- Do not modify HiAgent configuration or deployment.

---

### Task 1: Trusted homepage research aggregation

**Files:**
- Modify: `src/lib/evidence-views.ts`
- Test: `tests/evidence/evidence-views.test.ts`

**Interfaces:**
- Consumes: completed conversation rows, assistant message rows, library rows, and live document rows returned by the homepage server.
- Produces: `HomeResearchWorkspace`, `buildRecentResearchWorkspaces(input)`, and `buildUniqueDocumentIdMap(documents)`.

- [ ] **Step 1: Write failing aggregation tests**

```ts
expect(buildRecentResearchWorkspaces(input).map((item) => item.libraryId))
  .toEqual(["library-new", "library-old"]);
expect(buildRecentResearchWorkspaces(input)[0].sourceHref)
  .toBe("/api/documents/document-1/file?page=8");
expect(buildRecentResearchWorkspaces(inputWithDeletedDocument)[0].card).toBeNull();
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `npm test -- tests/evidence/evidence-views.test.ts`
Expected: FAIL because the aggregation interfaces do not exist.

- [ ] **Step 3: Implement deterministic trusted aggregation**

```ts
export type HomeResearchWorkspace = {
  libraryId: string;
  libraryName: string;
  workspaceHref: string;
  question: string;
  updatedAt: string;
  card: EvidenceCard | null;
  sourceHref: string | null;
};
```

Sort completed conversations descending, keep the first conversation for each library, parse the latest assistant evidence cards, and accept a card only when its `document_id` matches a live document whose `library_id` matches. Hydrate `document_name` from the document row and limit the result to three workspaces.

- [ ] **Step 4: Run the focused test and confirm pass**

Run: `npm test -- tests/evidence/evidence-views.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit the aggregation unit**

```bash
git add src/lib/evidence-views.ts tests/evidence/evidence-views.test.ts
git commit -m "feat: build trusted recent workspace evidence"
```

### Task 2: Server data flow and 20-second carousel

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/home/recent-evidence-carousel.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/components/recent-evidence-carousel.test.tsx`

**Interfaces:**
- Consumes: `HomeResearchWorkspace[]` from Task 1.
- Produces: `<RecentEvidenceCarousel workspaces={...} loggedIn={...} loadFailed={...} />` with working workspace and source links.

- [ ] **Step 1: Replace the sample-card tests with real-state tests**

```tsx
render(<RecentEvidenceCarousel workspaces={[]} loggedIn loadFailed={false} />);
expect(screen.queryByText("长征战略意义比较")).toBeNull();
expect(screen.getByRole("link", { name: "进入知识库" })).toHaveAttribute("href", "/libraries");

render(<RecentEvidenceCarousel workspaces={[workspace]} loggedIn loadFailed={false} />);
expect(screen.getByRole("link", { name: "查看原文" })).toHaveAttribute(
  "href",
  "/api/documents/document-1/file?page=8",
);
```

Use fake timers to advance `19_999ms` and `1ms`, proving the active workspace changes only at 20 seconds. Cover pause on mouse enter and no automatic movement when reduced motion is true.

- [ ] **Step 2: Run component tests and confirm failure**

Run: `npm test -- tests/components/recent-evidence-carousel.test.tsx`
Expected: FAIL because the component still accepts `cards` and uses `SAMPLE_CARD`.

- [ ] **Step 3: Query bounded real data on the server**

In `src/app/page.tsx`, fetch the newest completed conversations, their assistant messages, referenced libraries, and referenced non-deleted documents. Pass the raw rows through `buildRecentResearchWorkspaces`; keep failures as `loadFailed=true` and never synthesize cards.

- [ ] **Step 4: Implement the carousel states and timing**

Remove `SAMPLE_CARD`. Render one of three states: trusted workspace evidence, signed-in empty/error state, or signed-out product explanation. Use a `20_000` millisecond interval, pause on hover/focus, reset after manual selection, and stop rotation for reduced motion.

- [ ] **Step 5: Apply restrained transition styling**

Add a 20-second active progress fill, a 360ms opacity/translate/blur transition, a maximum hover scale of `1.012`, visible keyboard focus, and mobile-safe wrapping. Keep the existing paper backdrop, colors, type, and layout.

- [ ] **Step 6: Run focused tests and commit**

Run: `npm test -- tests/components/recent-evidence-carousel.test.tsx tests/evidence/evidence-views.test.ts`
Expected: PASS.

```bash
git add src/app/page.tsx src/components/home/recent-evidence-carousel.tsx src/app/globals.css tests/components/recent-evidence-carousel.test.tsx
git commit -m "feat: show real workspace carousel on homepage"
```

### Task 3: Reliable source destinations

**Files:**
- Modify: `src/app/api/documents/[id]/file/route.ts`
- Modify: `src/app/api/chat/route.ts`
- Create: `src/lib/evidence-sources.ts`
- Create: `tests/evidence/evidence-sources.test.ts`

**Interfaces:**
- Consumes: selected document records and evidence cards returned by HiAgent.
- Produces: `attachUniqueDocumentIds(cards, documents)` and a file endpoint that returns either a signed file redirect or UTF-8 pasted text.

- [ ] **Step 1: Write failing unique-source tests**

```ts
expect(attachUniqueDocumentIds([card], [{ id: "d1", original_name: "A.pdf" }])[0].document_id)
  .toBe("d1");
expect(attachUniqueDocumentIds([card], duplicateNameDocuments)[0].document_id)
  .toBeUndefined();
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `npm test -- tests/evidence/evidence-sources.test.ts`
Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Implement unambiguous document matching**

Build a name-to-list map and attach `document_id` only when exactly one selected document has the returned `document_name`. Use this helper in the chat route instead of `new Map(...)`, which silently chooses one duplicate.

- [ ] **Step 4: Extend the source route safely**

Select `source_kind`, `text_content`, `storage_path`, `original_name`, and `deleted_at`; require `deleted_at is null`. For `TEXT`, return the stored content as `text/plain; charset=utf-8` with an inline filename. For `FILE`, preserve the 60-second signed URL and validated PDF page fragment.

- [ ] **Step 5: Run focused tests and commit**

Run: `npm test -- tests/evidence/evidence-sources.test.ts`
Expected: PASS.

```bash
git add src/app/api/documents/[id]/file/route.ts src/app/api/chat/route.ts src/lib/evidence-sources.ts tests/evidence/evidence-sources.test.ts
git commit -m "fix: keep evidence source links trustworthy"
```

### Task 4: Full verification and local handoff

**Files:**
- Modify: `design-qa.md`

**Interfaces:**
- Consumes: completed implementation from Tasks 1–3.
- Produces: a verified homepage preview with documented interaction and source-link results.

- [ ] **Step 1: Run all automated checks**

Run: `npm test && npm run lint && npx tsc --noEmit && npm run build`
Expected: all commands exit successfully.

- [ ] **Step 2: Verify the signed-in homepage in the in-app browser**

Open the existing local server at port 3100. Verify there is no long-march sample, the first slide names a real workspace, workspace links open the correct assistant route, a source link opens the owned source, manual switching works, and hover/focus pauses rotation.

- [ ] **Step 3: Verify empty, failure, mobile, and reduced-motion states**

Use test fixtures or component tests for empty/failure states; inspect desktop and narrow viewport layouts; confirm reduced motion disables automatic transitions and all interactive elements retain visible focus.

- [ ] **Step 4: Record QA and commit**

Update `design-qa.md` with the tested routes, states, viewport sizes, and any non-blocking limitations.

```bash
git add design-qa.md
git commit -m "test: verify real homepage workspace carousel"
```
