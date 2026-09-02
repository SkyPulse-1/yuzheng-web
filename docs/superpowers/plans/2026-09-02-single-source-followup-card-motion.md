# Single Source Follow-up Card Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the custom analysis composer in single-source mode, insert each generated research card immediately after the summary card, and provide switchable native FLIP and Motion animation implementations.

**Architecture:** A pure deck-model function creates stable ordered items from the four fixed analysis sections and single-source question history. `SingleSourceAnalysisPanel` renders that model through either a native Web Animations adapter or a Motion adapter, while `AssistantWorkspace` continues to own persistence, optimistic questions, errors, and dialogs. Both adapters share the same cards, copy, state, and detail components so the A/B comparison changes motion only.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Web Animations API, View Transitions API with CSS fallback, `motion/react`, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-02-single-source-followup-card-motion-design.md`

## Global Constraints

- The summary section remains the first card; the newest custom research card is always second.
- Only questions whose scope is exactly the confirmed single document appear in this deck.
- A and B use identical data, layout, copy, and card components.
- A uses native FLIP and View Transitions; B uses `motion/react` layout animation.
- The mode switch does not refetch data or clear state.
- `prefers-reduced-motion: reduce` disables position, scale, blur, and shared-element animation.
- Do not modify HiAgent configuration, deployment, API credentials, or user-owned untracked files.

---

### Task 1: Build the ordered single-source deck model

**Files:**
- Create: `src/lib/analysis-deck.ts`
- Create: `tests/assistant/analysis-deck.test.ts`

**Interfaces:**
- Consumes: `AnalysisSectionKey` and `QuestionCard`.
- Produces: `MotionMode`, `AnalysisDeckItem`, and `buildSingleSourceDeckItems(questions, sourceId)`.

- [ ] **Step 1: Write the failing ordering and filtering tests**

```ts
import { describe, expect, it } from "vitest";
import { buildSingleSourceDeckItems } from "../../src/lib/analysis-deck";

function question(id: string, selectedDocumentIds: string[], createdAt: string) {
  return {
    id,
    question: `问题 ${id}`,
    status: "COMPLETED" as const,
    answer: `回答 ${id}`,
    evidenceCards: [],
    evidenceCount: 0,
    selectedDocumentIds,
    sourceCount: selectedDocumentIds.length,
    sourceWarning: null,
    error: null,
    createdAt,
    updatedAt: createdAt,
  };
}

it("inserts newest matching questions immediately after the summary", () => {
  const items = buildSingleSourceDeckItems([
    question("old", ["source-1"], "2026-09-02T08:00:00Z"),
    question("other", ["source-2"], "2026-09-02T10:00:00Z"),
    question("new", ["source-1"], "2026-09-02T09:00:00Z"),
  ], "source-1");
  expect(items.map((item) => item.id)).toEqual([
    "section:content_summary",
    "question:new",
    "question:old",
    "section:key_points",
    "section:source_evidence",
    "section:uncertainties",
  ]);
});
```

- [ ] **Step 2: Run the focused test and verify the red state**

Run: `npm test -- tests/assistant/analysis-deck.test.ts`

Expected: FAIL because `src/lib/analysis-deck.ts` does not exist.

- [ ] **Step 3: Implement the pure deck model**

```ts
import type { AnalysisSectionKey } from "./analysis-results";
import type { QuestionCard } from "./questions";

export type MotionMode = "native" | "motion";

export type AnalysisDeckItem =
  | { id: `section:${AnalysisSectionKey}`; kind: "section"; sectionKey: AnalysisSectionKey }
  | { id: `question:${string}`; kind: "question"; question: QuestionCard };

const TRAILING_SECTIONS: AnalysisSectionKey[] = ["key_points", "source_evidence", "uncertainties"];

export function buildSingleSourceDeckItems(questions: QuestionCard[], sourceId: string): AnalysisDeckItem[] {
  const matching = questions
    .filter((question) => question.selectedDocumentIds.length === 1 && question.selectedDocumentIds[0] === sourceId)
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  return [
    { id: "section:content_summary", kind: "section", sectionKey: "content_summary" },
    ...matching.map((question) => ({ id: `question:${question.id}` as const, kind: "question" as const, question })),
    ...TRAILING_SECTIONS.map((sectionKey) => ({ id: `section:${sectionKey}` as const, kind: "section" as const, sectionKey })),
  ];
}
```

- [ ] **Step 4: Run focused tests**

Run: `npm test -- tests/assistant/analysis-deck.test.ts`

Expected: PASS for newest-first ordering, exact source filtering, and fixed four-section presence.

- [ ] **Step 5: Commit the model**

```powershell
git add -- src/lib/analysis-deck.ts tests/assistant/analysis-deck.test.ts
git commit -m "feat: order single source research cards"
```

---

### Task 2: Keep the composer in single-source mode and render generated cards

**Files:**
- Create: `src/components/assistant/single-source-analysis-deck.tsx`
- Modify: `src/components/analysis/analysis-result-cards.tsx`
- Modify: `src/components/assistant/single-source-analysis-panel.tsx`
- Modify: `src/components/assistant/assistant-workspace.tsx`
- Modify: `src/components/assistant/question-composer.tsx`
- Modify: `tests/components/assistant-workspace.test.tsx`

**Interfaces:**
- Consumes: `buildSingleSourceDeckItems`, `AnalysisResultCards` section metadata, `QuestionCard`, and existing `submitQuestion`.
- Produces: `SingleSourceAnalysisDeck` and expanded `SingleSourceAnalysisPanel` props for questions, composer, opening, and deletion.

- [ ] **Step 1: Add failing single-source composer and insertion tests**

Extend `tests/components/assistant-workspace.test.tsx` with a fetch mock that returns a completed custom question. Assert that after confirming one source:

```ts
expect(screen.getByRole("textbox", { name: "分析需求" })).toBeTruthy();
await user.type(screen.getByRole("textbox", { name: "分析需求" }), "核对作者的主要判断");
await user.click(screen.getByRole("button", { name: "开始分析" }));
await waitFor(() => expect(screen.getByText("核对作者的主要判断")).toBeTruthy());

const cards = screen.getAllByTestId("analysis-deck-item");
expect(cards[0].getAttribute("data-deck-item-id")).toBe("section:content_summary");
expect(cards[1].getAttribute("data-deck-item-id")).toBe("question:question-1");
expect(fetch).toHaveBeenCalledWith("/api/chat", expect.objectContaining({
  body: JSON.stringify({
    libraryId: "library-1",
    selectedDocumentIds: ["text-1"],
    message: "核对作者的主要判断",
  }),
}));
```

Use DOM attributes rather than visual position calculations in jsdom.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- tests/components/assistant-workspace.test.tsx`

Expected: FAIL because single-source mode does not render `QuestionComposer` or research cards.

- [ ] **Step 3: Extract a reusable fixed-section card**

In `analysis-result-cards.tsx`, export the existing metadata and a focused component:

```tsx
export const ANALYSIS_SECTION_META = SECTION_META;

export function AnalysisSectionCard({ sectionKey, items, onOpen }: {
  sectionKey: AnalysisSectionKey;
  items: AnalysisItem[];
  onOpen: () => void;
}) {
  // Move the existing single-card article markup here without changing copy.
}
```

Keep `AnalysisResultCards` as a compatibility wrapper that maps four sections through `AnalysisSectionCard` and preserves its current tests.

- [ ] **Step 4: Implement the shared deck renderer**

```tsx
export function SingleSourceAnalysisDeck({ items, result, onOpenSection, onOpenQuestion, onDeleteQuestion, adapter: Adapter }: Props) {
  return (
    <Adapter items={items} renderItem={(item) => item.kind === "section" ? (
      <AnalysisSectionCard sectionKey={item.sectionKey} items={result[item.sectionKey]} onOpen={() => onOpenSection(item.sectionKey)} />
    ) : (
      <QuestionCard question={item.question} onOpen={() => onOpenQuestion(item.question)} onDelete={() => onDeleteQuestion(item.question)} />
    )} />
  );
}
```

Every adapter wrapper must set `data-testid="analysis-deck-item"` and `data-deck-item-id={item.id}`.

- [ ] **Step 5: Pass single-source questions and submission through the workspace**

Expand `SingleSourceAnalysisPanel` props:

```ts
questions: QuestionCard[];
questionPending: boolean;
onSubmitQuestion: (message: string) => Promise<void>;
onOpenQuestion: (question: QuestionCard) => void;
onDeleteQuestion: (question: QuestionCard) => void;
```

Render `QuestionComposer` after the deck with `selectedCount={1}` and add an optional `scopeLabel="仅分析当前资料"` prop so single-source copy is explicit. `AssistantWorkspace` passes the existing `questions`, `pending`, `submitQuestion`, `setActiveQuestion`, and `deleteQuestion` callbacks.

- [ ] **Step 6: Run the component tests**

Run: `npm test -- tests/components/assistant-workspace.test.tsx tests/components/analysis-result-cards.test.tsx`

Expected: PASS; a new single-source question appears second and persists through the existing question response shape.

- [ ] **Step 7: Commit the functional deck**

```powershell
git add -- src/components/assistant/single-source-analysis-deck.tsx src/components/analysis/analysis-result-cards.tsx src/components/assistant/single-source-analysis-panel.tsx src/components/assistant/assistant-workspace.tsx src/components/assistant/question-composer.tsx tests/components/assistant-workspace.test.tsx
git commit -m "feat: add follow-up cards to single source analysis"
```

---

### Task 3: Implement native FLIP and View Transition mode

**Files:**
- Create: `src/components/assistant/native-analysis-deck.tsx`
- Create: `src/lib/view-transitions.ts`
- Create: `tests/components/native-analysis-deck.test.tsx`
- Modify: `src/components/assistant/single-source-analysis-deck.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `AnalysisDeckItem[]`, a `renderItem` function, and stable `item.id` values.
- Produces: `NativeAnalysisDeck` and `runViewTransition(update)`.

- [ ] **Step 1: Write failing adapter tests**

Mock `HTMLElement.prototype.animate` and bounding rectangles, then render one item followed by a rerender with a new second item:

```tsx
const animate = vi.fn();
Object.defineProperty(HTMLElement.prototype, "animate", { configurable: true, value: animate });
vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));

const first = [{ id: "section:content_summary", kind: "section", sectionKey: "content_summary" }] as AnalysisDeckItem[];
const second = [first[0], { id: "question:q1", kind: "question", question: questionCard }] as AnalysisDeckItem[];
const { rerender } = render(<NativeAnalysisDeck items={first} renderItem={(item) => <span>{item.id}</span>} />);
animate.mockClear();
rerender(<NativeAnalysisDeck items={second} renderItem={(item) => <span>{item.id}</span>} />);

expect(screen.getAllByTestId("analysis-deck-item").map((node) => node.dataset.deckItemId)).toEqual([
  "section:content_summary",
  "question:q1",
]);
expect(animate).toHaveBeenCalled();
```

Add a second test with `matchMedia` returning `matches: true`; after rerender, assert `animate` has not been called.

- [ ] **Step 2: Run the native adapter test and verify it fails**

Run: `npm test -- tests/components/native-analysis-deck.test.tsx`

Expected: FAIL because `NativeAnalysisDeck` is missing.

- [ ] **Step 3: Implement FLIP measurement**

```tsx
export function NativeAnalysisDeck({ items, renderItem }: DeckAdapterProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const previousRects = useRef(new Map<string, DOMRect>());

  useLayoutEffect(() => {
    const nodes = [...(rootRef.current?.querySelectorAll<HTMLElement>("[data-deck-item-id]") ?? [])];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nextRects = new Map(nodes.map((node) => [node.dataset.deckItemId!, node.getBoundingClientRect()]));
    if (!reduce) nodes.forEach((node) => {
      const id = node.dataset.deckItemId!;
      const before = previousRects.current.get(id);
      const after = nextRects.get(id)!;
      if (before) {
        node.animate([
          { transform: `translate(${before.left - after.left}px, ${before.top - after.top}px)` },
          { transform: "translate(0, 0)" },
        ], { duration: 520, easing: "cubic-bezier(.2,.78,.2,1)" });
      } else {
        node.animate([
          { opacity: 0, transform: "translateY(12px) scale(.965)", filter: "blur(7px)" },
          { opacity: 1, transform: "translateY(0) scale(1)", filter: "blur(0)" },
        ], { duration: 520, easing: "cubic-bezier(.2,.78,.2,1)" });
      }
    });
    previousRects.current = nextRects;
  }, [items]);

  return <div ref={rootRef} className="analysis-card-grid">{items.map(/* stable wrappers */)}</div>;
}
```

- [ ] **Step 4: Implement the native detail transition helper**

```ts
type ViewTransitionDocument = Document & { startViewTransition?: (update: () => void) => { finished: Promise<void> } };

export function runViewTransition(update: () => void) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return update();
  const documentWithTransition = document as ViewTransitionDocument;
  if (!documentWithTransition.startViewTransition) return update();
  documentWithTransition.startViewTransition(update);
}
```

Call this helper around section/question detail state updates in native mode. Add `view-transition-name` only to the active card and detail surface to avoid duplicate names.

- [ ] **Step 5: Add restrained native motion CSS**

Add `::view-transition-old(analysis-detail)` and `::view-transition-new(analysis-detail)` rules, a one-pass `.is-new-card::after` edge sweep, and reduced-motion overrides. Keep scale at or below `1.016` and duration between 420–560ms.

- [ ] **Step 6: Run native tests and existing dialog tests**

Run: `npm test -- tests/components/native-analysis-deck.test.tsx tests/components/analysis-result-cards.test.tsx`

Expected: PASS in normal and reduced-motion cases.

- [ ] **Step 7: Commit native mode**

```powershell
git add -- src/components/assistant/native-analysis-deck.tsx src/lib/view-transitions.ts tests/components/native-analysis-deck.test.tsx src/components/assistant/single-source-analysis-deck.tsx src/app/globals.css
git commit -m "feat: animate evidence deck with native FLIP"
```

---

### Task 4: Implement the Motion comparison mode and A/B switch

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/components/assistant/motion-analysis-deck.tsx`
- Create: `src/components/assistant/deck-motion-boundary.tsx`
- Create: `src/components/assistant/motion-mode-toggle.tsx`
- Create: `tests/components/motion-mode-toggle.test.tsx`
- Modify: `src/components/assistant/single-source-analysis-panel.tsx`
- Modify: `src/components/assistant/single-source-analysis-deck.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `DeckAdapterProps` from the shared deck, `MotionMode`, and `NativeAnalysisDeck` as fallback.
- Produces: `MotionAnalysisDeck`, `DeckMotionBoundary`, and `MotionModeToggle`.

- [ ] **Step 1: Install and pin Motion in the lockfile**

Run: `npm install motion`

Expected: `package.json` contains `motion` and `package-lock.json` records the resolved version.

- [ ] **Step 2: Write failing A/B switch tests**

```tsx
render(<MotionModeToggle value="native" onChange={onChange} />);
expect(screen.getByRole("button", { name: "A 原生" }).getAttribute("aria-pressed")).toBe("true");
await user.click(screen.getByRole("button", { name: "B Motion" }));
expect(onChange).toHaveBeenCalledWith("motion");
```

Add a workspace test that switches modes after a generated card exists and asserts the card and composer value remain visible.

- [ ] **Step 3: Run the switch tests and verify they fail**

Run: `npm test -- tests/components/motion-mode-toggle.test.tsx tests/components/assistant-workspace.test.tsx`

Expected: FAIL because the toggle and Motion adapter are missing.

- [ ] **Step 4: Implement the Motion layout adapter**

```tsx
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";

export function MotionAnalysisDeck({ items, renderItem }: DeckAdapterProps) {
  const reduce = useReducedMotion();
  return (
    <LayoutGroup id="single-source-analysis-deck">
      <motion.div layout={!reduce} className="analysis-card-grid">
        <AnimatePresence initial={false} mode="popLayout">
          {items.map((item) => (
            <motion.div
              layout={!reduce}
              layoutId={reduce ? undefined : item.id}
              key={item.id}
              data-testid="analysis-deck-item"
              data-deck-item-id={item.id}
              initial={reduce ? false : { opacity: 0, y: 12, scale: .965, filter: "blur(7px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0)" }}
              exit={reduce ? undefined : { opacity: 0, scale: .98 }}
              transition={{ layout: { duration: .52, ease: [.2, .78, .2, 1] }, opacity: { duration: .28 } }}
            >
              {renderItem(item)}
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </LayoutGroup>
  );
}
```

- [ ] **Step 5: Add the fallback boundary and segmented switch**

`DeckMotionBoundary` is a focused class error boundary whose fallback renders `NativeAnalysisDeck` with the same props:

```tsx
type Props = DeckAdapterProps & { children: ReactNode };

export class DeckMotionBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed
      ? <NativeAnalysisDeck items={this.props.items} renderItem={this.props.renderItem} />
      : this.props.children;
  }
}
```

Load `MotionAnalysisDeck` with `next/dynamic` and `ssr: false`; wrap it in `DeckMotionBoundary`. Use `NativeAnalysisDeck` as both the loading UI and error fallback so a chunk failure cannot remove the deck.

`MotionModeToggle` renders two `aria-pressed` buttons and never owns business state:

```tsx
export function MotionModeToggle({ value, onChange }: { value: MotionMode; onChange: (value: MotionMode) => void }) {
  return <div className="motion-mode-toggle" aria-label="卡片动效版本">
    <button type="button" aria-pressed={value === "native"} onClick={() => onChange("native")}>A 原生</button>
    <button type="button" aria-pressed={value === "motion"} onClick={() => onChange("motion")}>B Motion</button>
  </div>;
}
```

`SingleSourceAnalysisPanel` owns `motionMode` state initialized to `"native"` and passes the selected adapter to the deck.

- [ ] **Step 6: Add Motion detail surface transitions**

When `motionMode === "motion"`, wrap the active detail backdrop and surface in `AnimatePresence`; use the matching card ID as `layoutId`, `initial={{ opacity: 0, scale: .985 }}`, `animate={{ opacity: 1, scale: 1 }}`, and `exit={{ opacity: 0, scale: .985 }}`. Keep the close button and Esc behavior unchanged. Native mode continues to use `runViewTransition`.

- [ ] **Step 7: Run Motion, workspace, and dialog tests**

Run: `npm test -- tests/components/motion-mode-toggle.test.tsx tests/components/assistant-workspace.test.tsx tests/components/analysis-result-cards.test.tsx`

Expected: PASS; switching A/B preserves the generated card and no second API request is made.

- [ ] **Step 8: Commit the comparison mode**

```powershell
git add -- package.json package-lock.json src/components/assistant/motion-analysis-deck.tsx src/components/assistant/deck-motion-boundary.tsx src/components/assistant/motion-mode-toggle.tsx tests/components/motion-mode-toggle.test.tsx src/components/assistant/single-source-analysis-panel.tsx src/components/assistant/single-source-analysis-deck.tsx src/app/globals.css tests/components/assistant-workspace.test.tsx
git commit -m "feat: add motion comparison for evidence cards"
```

---

### Task 5: Polish, verify, and hand off both variants

**Files:**
- Modify: `src/app/globals.css`
- Modify: `DESIGN.md`
- Test: all files under `tests/`

**Interfaces:**
- Consumes: completed native and Motion variants.
- Produces: verified A/B local experience with documented motion behavior.

- [ ] **Step 1: Update design tokens and behavioral documentation**

Add the A/B switch, 520ms insertion duration, newest-card position, maximum hover scale `1.016`, and reduced-motion behavior to `DESIGN.md`. Do not change the established palette or typography.

- [ ] **Step 2: Run the complete automated verification**

Run:

```powershell
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Expected: all tests pass, ESLint and TypeScript emit no errors, and Next.js completes the production build.

- [ ] **Step 3: Verify A mode in the in-app browser**

On the existing local assistant URL:

1. Confirm one text source.
2. Select `A 原生`.
3. Submit two different analysis requirements.
4. Confirm each optimistic card appears second and earlier cards move backward.
5. Open and close a fixed card and a generated card; verify source context and focus restoration.

- [ ] **Step 4: Verify B mode and narrow layout**

Switch to `B Motion` without reloading. Confirm existing results remain, submit one more request, then test the same open/close path. Resize to a narrow viewport and confirm the single-column deck and fixed composer do not overlap the final card.

- [ ] **Step 5: Verify reduced motion**

Enable reduced motion through browser emulation, repeat one card insertion in each mode, and confirm position/scale/blur animations are absent while content and ordering remain correct.

- [ ] **Step 6: Commit the verified polish**

```powershell
git add -- src/app/globals.css DESIGN.md
git commit -m "style: polish evidence card motion variants"
```
