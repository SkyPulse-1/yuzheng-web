import { flushSync } from "react-dom";

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<void> };
};

export function deckTransitionName(itemId: string) {
  return `deck-${itemId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

export function runViewTransition(update: () => void) {
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const documentWithTransition = typeof document === "undefined" ? null : document as ViewTransitionDocument;
  if (reduce || !documentWithTransition?.startViewTransition) {
    update();
    return;
  }
  documentWithTransition.startViewTransition(() => flushSync(update));
}
