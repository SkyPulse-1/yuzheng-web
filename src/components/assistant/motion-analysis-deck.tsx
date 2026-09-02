"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { deckTransitionName } from "../../lib/view-transitions";
import type { DeckAdapterProps } from "./single-source-analysis-deck";

export function MotionAnalysisDeck({ items, renderItem }: DeckAdapterProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div layout={!reduce} className="analysis-card-grid">
      <AnimatePresence initial={false} mode="popLayout">
          {items.map((item) => (
            <motion.div
              layout={!reduce}
              layoutId={reduce ? undefined : deckTransitionName(item.id)}
              key={item.id}
              className="analysis-deck-item"
              data-testid="analysis-deck-item"
              data-deck-item-id={item.id}
              initial={reduce ? false : { opacity: 0, y: 12, scale: .965, filter: "blur(7px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={reduce ? undefined : { opacity: 0, scale: .98, filter: "blur(4px)" }}
              transition={{
                layout: { duration: .52, ease: [.2, .78, .2, 1] },
                opacity: { duration: .28 },
                filter: { duration: .36 },
              }}
            >
              {renderItem(item)}
            </motion.div>
          ))}
      </AnimatePresence>
    </motion.div>
  );
}
