# Formal Card Motion Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the A/B animation experiment with one lightweight native card-motion system and eliminate the duplicated card/dialog layers that cause visual clipping and ghosting.

**Architecture:** `NativeAnalysisDeck` remains responsible only for FLIP list insertion and reordering. A small shared `useDialogTransition` hook owns dialog closing state, reduced-motion timing, and background scroll locking; both detail dialogs render a single stable surface animated only by CSS. The workspace no longer carries an animation-mode state, and the `motion` runtime and experiment-only components are removed.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Web Animations API, CSS keyframes, Vitest, Testing Library

**Spec:** `docs/superpowers/specs/2026-09-02-formal-card-motion-polish-design.md`

## Global Constraints

- Do not call HiAgent during browser QA and do not wait for AI responses.
- Do not modify HiAgent endpoints, API keys, environment secrets, publishing settings, evidence data, or source-reliability rules.
- Do not delete `artifacts/` or `public/assets/research-document-backdrop.png`.
- Keep the newest follow-up card immediately after `section:content_summary`.
- Respect `prefers-reduced-motion` by removing movement, scaling, blur, and close delay.
- Do not deploy the application.

---

### Task 1: Remove the A/B experiment and keep the native list adapter

**Files:**
- Modify: `src/components/assistant/assistant-workspace.tsx`
- Modify: `src/components/assistant/single-source-analysis-panel.tsx`
- Modify: `src/components/assistant/single-source-analysis-deck.tsx`
- Modify: `src/components/assistant/native-analysis-deck.tsx`
- Modify: `src/lib/analysis-deck.ts`
- Delete: `src/components/assistant/motion-analysis-deck.tsx`
- Delete: `src/components/assistant/motion-mode-toggle.tsx`
- Delete: `src/components/assistant/deck-motion-boundary.tsx`
- Delete: `tests/components/motion-mode-toggle.test.tsx`
- Modify: `tests/components/assistant-workspace.test.tsx`
- Modify: `tests/components/native-analysis-deck.test.tsx`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: `buildSingleSourceDeckItems(questions: QuestionCard[], sourceId: string): AnalysisDeckItem[]`
- Produces: `NativeAnalysisDeck(props: DeckAdapterProps)` as the only deck implementation; `SingleSourceAnalysisDeck` no longer accepts `motionMode` or `adapter`.

- [ ] **Step 1: Write the failing tests for the formal single-mode UI**

Update the single-source workspace test so it asserts the experiment controls are absent while the composer value and card order remain stable:

```tsx
expect(screen.queryByRole("button", { name: "A 原生" })).toBeNull();
expect(screen.queryByRole("button", { name: "B Motion" })).toBeNull();
expect(screen.getByRole("textbox", { name: "分析需求" })).toBeTruthy();
```

Extend the native deck test to assert that deck items do not receive shared transition names:

```tsx
expect(screen.getAllByTestId("analysis-deck-item")[0].style.viewTransitionName).toBe("");
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run:

```powershell
npx vitest run tests/components/assistant-workspace.test.tsx tests/components/native-analysis-deck.test.tsx tests/components/motion-mode-toggle.test.tsx
```

Expected: FAIL because the toggle still renders, deck items still set `viewTransitionName`, and the experiment test still exists.

- [ ] **Step 3: Remove the mode state, experiment components, and shared-transition attributes**

Make `SingleSourceAnalysisDeck` always render the native adapter:

```tsx
<NativeAnalysisDeck items={items} renderItem={renderItem} />
```

Open fixed and follow-up cards with direct state updates:

```tsx
onOpen={() => setOpenKey(item.sectionKey)}
onOpen={() => onOpenQuestion(item.question)}
```

Remove `motionMode`, `onMotionModeChange`, `activeItemId`, `deckTransitionName`, `runViewTransition`, the toggle markup, the Motion adapter, and the error boundary. Delete the three experiment-only component files and their toggle test. Run:

```powershell
npm uninstall motion
```

Remove the `MotionMode` type when no references remain.

- [ ] **Step 4: Run focused tests and verify success**

Run:

```powershell
npx vitest run tests/components/assistant-workspace.test.tsx tests/components/native-analysis-deck.test.tsx
```

Expected: PASS; single-source mode still shows four fixed cards and a composer, and the deck uses no View Transition name.

- [ ] **Step 5: Commit the single-mode cleanup**

```powershell
git add package.json package-lock.json src/components/assistant src/lib/analysis-deck.ts tests/components
git commit -m "refactor: keep one native evidence card motion"
```

---

### Task 2: Add a shared stable dialog lifecycle

**Files:**
- Create: `src/hooks/use-dialog-transition.ts`
- Modify: `src/components/analysis/analysis-detail-dialog.tsx`
- Modify: `src/components/assistant/question-detail-dialog.tsx`
- Create: `tests/components/dialog-transition.test.tsx`

**Interfaces:**
- Consumes: `onClose: () => void` supplied by each dialog owner.
- Produces: `useDialogTransition(onClose: () => void): { closing: boolean; requestClose: () => void }`.

- [ ] **Step 1: Write failing lifecycle tests**

Create a test that verifies both stable mounting during close and background scroll restoration:

```tsx
vi.useFakeTimers();
document.body.style.overflow = "auto";
render(<AnalysisDetailDialog open title="内容摘要" items={[]} sourceTitle="资料" sourceText="" onClose={onClose} />);
expect(document.body.style.overflow).toBe("hidden");
fireEvent.click(screen.getByRole("button", { name: "关闭" }));
expect(screen.getByRole("dialog")).toBeTruthy();
expect(onClose).not.toHaveBeenCalled();
vi.advanceTimersByTime(240);
expect(onClose).toHaveBeenCalledOnce();
cleanup();
expect(document.body.style.overflow).toBe("auto");
```

Add a reduced-motion case by stubbing `matchMedia(...).matches` to `true`; clicking close must call `onClose` synchronously.

- [ ] **Step 2: Run the lifecycle test and verify failure**

Run:

```powershell
npx vitest run tests/components/dialog-transition.test.tsx
```

Expected: FAIL because the shared hook and stable native close lifecycle do not exist.

- [ ] **Step 3: Implement the hook**

Create a hook with one guarded close path and body-scroll restoration:

```ts
export function useDialogTransition(onClose: () => void) {
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reduce) return onClose();
    closingRef.current = true;
    setClosing(true);
    timerRef.current = window.setTimeout(onClose, 220);
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return { closing, requestClose };
}
```

- [ ] **Step 4: Convert both dialogs to one stable DOM surface**

Remove all `motion/react`, `layoutId`, `transitionName`, `animationMode`, and View Transition style usage. Render state on the existing elements:

```tsx
<div className="dialog-backdrop" data-state={closing ? "closing" : "open"}>
  <section className="analysis-dialog dialog-surface" data-state={closing ? "closing" : "open"}>
```

Keep Escape, backdrop click, close-button focus, focus restoration, dialog roles, and existing content behavior intact.

- [ ] **Step 5: Run dialog and workspace tests**

Run:

```powershell
npx vitest run tests/components/dialog-transition.test.tsx tests/components/assistant-workspace.test.tsx tests/components/analysis-result-cards.test.tsx
```

Expected: PASS; dialogs stay mounted for the exit animation, restore background scrolling, and retain accessible close behavior.

- [ ] **Step 6: Commit the stable dialog lifecycle**

```powershell
git add src/hooks/use-dialog-transition.ts src/components/analysis/analysis-detail-dialog.tsx src/components/assistant/question-detail-dialog.tsx tests/components/dialog-transition.test.tsx
git commit -m "fix: prevent evidence dialog transition ghosting"
```

---

### Task 3: Polish CSS, documentation, and non-AI browser QA

**Files:**
- Modify: `src/app/globals.css`
- Modify: `DESIGN.md`
- Test: `tests/components/dialog-transition.test.tsx`

**Interfaces:**
- Consumes: `data-state="open" | "closing"` from both detail dialogs.
- Produces: consistent `dialog-backdrop` and `dialog-surface` enter/exit animations with reduced-motion overrides.

- [ ] **Step 1: Remove experiment and shared-transition CSS**

Delete `.motion-mode-toggle`, `.is-motion-dialog`, all `::view-transition-*` rules, and the unused shared-element keyframes. Keep native deck insertion and hover rules.

- [ ] **Step 2: Add stable enter and exit animations**

Use a single compositor-friendly surface animation:

```css
.dialog-backdrop[data-state="open"] { animation: veil-in 160ms ease-out both; }
.dialog-backdrop[data-state="closing"] { animation: veil-out 200ms ease-in both; }
.dialog-surface[data-state="open"] { animation: dialog-settle 240ms cubic-bezier(.2,.78,.2,1) both; }
.dialog-surface[data-state="closing"] { animation: dialog-leave 200ms cubic-bezier(.4,0,1,1) both; pointer-events: none; }

@keyframes dialog-settle {
  from { opacity: 0; transform: translateY(10px) scale(.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes dialog-leave {
  from { opacity: 1; transform: translateY(0) scale(1); }
  to { opacity: 0; transform: translateY(6px) scale(.992); }
}
```

Add a reduced-motion block that sets the animation duration to `1ms` and removes transforms for `.dialog-backdrop` and `.dialog-surface`.

- [ ] **Step 3: Update the design system documentation**

Remove the `motion-mode-toggle` token and A/B language from `DESIGN.md`. Document the one formal native animation: 520ms deck reorder, 160ms veil, 240ms detail settle, and no shared-element morphing.

- [ ] **Step 4: Run full automated verification**

Run:

```powershell
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Expected: all test files pass, lint exits 0, TypeScript exits 0, and the production build completes.

- [ ] **Step 5: Perform browser QA without invoking AI**

Use the existing analyzed source so no network analysis is required:

1. Open `/assistant?libraryId=fb7fe5b9-d58a-45d8-be06-4c6c076e46e7`.
2. Select `前端验收测试文字 09/01` and confirm.
3. Verify there is no A/B toggle.
4. Open `内容摘要`, capture the opening frame and stable frame, and confirm only one title and one panel surface are visible.
5. Close by button, backdrop, and Escape; confirm the page returns to the same scroll position.
6. Open the existing follow-up card without submitting a new request and confirm the same clean transition.
7. Confirm the input composer and card order remain unchanged.

- [ ] **Step 6: Commit final polish**

```powershell
git add src/app/globals.css DESIGN.md tests/components/dialog-transition.test.tsx
git commit -m "style: polish formal evidence card transitions"
```

