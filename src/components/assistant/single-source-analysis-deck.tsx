"use client";

import { useState, type ComponentType, type ReactNode } from "react";

import { AnalysisDetailDialog } from "../analysis/analysis-detail-dialog";
import { ANALYSIS_SECTION_META, AnalysisSectionCard } from "../analysis/analysis-result-cards";
import type { AnalysisDeckItem, MotionMode } from "../../lib/analysis-deck";
import type { AnalysisSectionKey, TextAnalysisResult } from "../../lib/analysis-results";
import type { QuestionCard as QuestionCardData } from "../../lib/questions";
import { deckTransitionName, runViewTransition } from "../../lib/view-transitions";
import { DeckMotionBoundary } from "./deck-motion-boundary";
import { MotionAnalysisDeck } from "./motion-analysis-deck";
import { NativeAnalysisDeck } from "./native-analysis-deck";
import { QuestionCard } from "./question-card";

export type DeckAdapterProps = {
  items: AnalysisDeckItem[];
  renderItem: (item: AnalysisDeckItem) => ReactNode;
  activeItemId?: string | null;
};

export function SingleSourceAnalysisDeck({
  items,
  result,
  sourceTitle,
  sourceText,
  onOpenQuestion,
  onDeleteQuestion,
  activeQuestionId,
  motionMode,
  adapter,
}: {
  items: AnalysisDeckItem[];
  result: TextAnalysisResult;
  sourceTitle: string;
  sourceText: string;
  onOpenQuestion: (question: QuestionCardData) => void;
  onDeleteQuestion: (question: QuestionCardData) => void;
  activeQuestionId?: string | null;
  motionMode: MotionMode;
  adapter?: ComponentType<DeckAdapterProps>;
}) {
  const [openKey, setOpenKey] = useState<AnalysisSectionKey | null>(null);
  const activeItemId = openKey ? `section:${openKey}` : activeQuestionId ? `question:${activeQuestionId}` : null;
  const transitionUpdate = (update: () => void) => motionMode === "native" ? runViewTransition(update) : update();
  const renderItem = (item: AnalysisDeckItem) => item.kind === "section" ? (
    <AnalysisSectionCard
      sectionKey={item.sectionKey}
      items={result[item.sectionKey]}
      onOpen={() => transitionUpdate(() => setOpenKey(item.sectionKey))}
    />
  ) : (
    <QuestionCard
      question={item.question}
      onOpen={() => transitionUpdate(() => onOpenQuestion(item.question))}
      onDelete={() => onDeleteQuestion(item.question)}
    />
  );
  const Adapter = adapter ?? (motionMode === "motion" ? MotionAnalysisDeck : NativeAnalysisDeck);
  const nativeFallback = <NativeAnalysisDeck activeItemId={activeItemId} items={items} renderItem={renderItem} />;

  return (
    <>
      <DeckMotionBoundary fallback={nativeFallback} resetKey={motionMode}>
        <Adapter activeItemId={activeItemId} items={items} renderItem={renderItem} />
      </DeckMotionBoundary>

      {openKey ? (
        <AnalysisDetailDialog
          open
          title={ANALYSIS_SECTION_META[openKey].title}
          items={result[openKey]}
          sourceTitle={sourceTitle}
          sourceText={sourceText}
          animationMode={motionMode}
          transitionName={deckTransitionName(`section:${openKey}`)}
          onClose={() => transitionUpdate(() => setOpenKey(null))}
        />
      ) : null}
    </>
  );
}
