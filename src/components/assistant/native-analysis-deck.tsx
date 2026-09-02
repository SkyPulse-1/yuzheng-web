"use client";

import { useLayoutEffect, useRef } from "react";

import { deckTransitionName } from "../../lib/view-transitions";
import type { DeckAdapterProps } from "./single-source-analysis-deck";

const MOVE_DURATION = 520;

export function NativeAnalysisDeck({ items, renderItem, activeItemId }: DeckAdapterProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const previousRects = useRef(new Map<string, DOMRect>());

  useLayoutEffect(() => {
    const nodes = [...(rootRef.current?.querySelectorAll<HTMLElement>("[data-deck-item-id]") ?? [])];
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const nextRects = new Map(nodes.flatMap((node) => {
      const id = node.dataset.deckItemId;
      return id ? [[id, node.getBoundingClientRect()] as const] : [];
    }));
    const hadPreviousLayout = previousRects.current.size > 0;

    if (!reduce) {
      nodes.forEach((node) => {
        if (typeof node.animate !== "function") return;
        const id = node.dataset.deckItemId;
        if (!id) return;
        const before = previousRects.current.get(id);
        const after = nextRects.get(id);
        if (!after) return;
        if (before) {
          const x = before.left - after.left;
          const y = before.top - after.top;
          if (x || y) {
            node.animate([
              { transform: `translate(${x}px, ${y}px)` },
              { transform: "translate(0, 0)" },
            ], { duration: MOVE_DURATION, easing: "cubic-bezier(.2,.78,.2,1)" });
          }
        } else if (hadPreviousLayout) {
          node.classList.add("is-new-card");
          node.animate([
            { opacity: 0, transform: "translateY(12px) scale(.965)", filter: "blur(7px)" },
            { opacity: 1, transform: "translateY(0) scale(1)", filter: "blur(0)" },
          ], { duration: MOVE_DURATION, easing: "cubic-bezier(.2,.78,.2,1)" });
          window.setTimeout(() => node.classList.remove("is-new-card"), 760);
        }
      });
    }
    previousRects.current = nextRects;
  }, [items]);

  return (
    <div ref={rootRef} className="analysis-card-grid">
      {items.map((item) => (
        <div
          key={item.id}
          className="analysis-deck-item"
          data-testid="analysis-deck-item"
          data-deck-item-id={item.id}
          style={{ viewTransitionName: activeItemId === item.id ? "none" : deckTransitionName(item.id) }}
        >
          {renderItem(item)}
        </div>
      ))}
    </div>
  );
}
