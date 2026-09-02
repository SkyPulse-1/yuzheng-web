"use client";

import { useState, type ComponentType, type ReactNode } from "react";

import { AnalysisDetailDialog } from "../analysis/analysis-detail-dialog";
import { ANALYSIS_SECTION_META, AnalysisSectionCard } from "../analysis/analysis-result-cards";
import type { AnalysisDeckItem } from "../../lib/analysis-deck";
import type { AnalysisSectionKey, TextAnalysisResult } from "../../lib/analysis-results";
import type { QuestionCard as QuestionCardData } from "../../lib/questions";
import { deckTransitionName, runViewTransition } from "../../lib/view-transitions";
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
  adapter: Adapter = NativeAnalysisDeck,
}: {
  items: AnalysisDeckItem[];
  result: TextAnalysisResult;
  sourceTitle: string;
  sourceText: string;
  onOpenQuestion: (question: QuestionCardData) => void;
  onDeleteQuestion: (question: QuestionCardData) => void;
  activeQuestionId?: string | null;
  adapter?: ComponentType<DeckAdapterProps>;
}) {
  const [openKey, setOpenKey] = useState<AnalysisSectionKey | null>(null);
  const activeItemId = openKey ? `section:${openKey}` : activeQuestionId ? `question:${activeQuestionId}` : null;

  return (
    <>
      <Adapter activeItemId={activeItemId} items={items} renderItem={(item) => item.kind === "section" ? (
        <AnalysisSectionCard
          sectionKey={item.sectionKey}
          items={result[item.sectionKey]}
          onOpen={() => runViewTransition(() => setOpenKey(item.sectionKey))}
        />
      ) : (
        <QuestionCard
          question={item.question}
          onOpen={() => runViewTransition(() => onOpenQuestion(item.question))}
          onDelete={() => onDeleteQuestion(item.question)}
        />
      )} />

      {openKey ? (
        <AnalysisDetailDialog
          open
          title={ANALYSIS_SECTION_META[openKey].title}
          items={result[openKey]}
          sourceTitle={sourceTitle}
          sourceText={sourceText}
          transitionName={deckTransitionName(`section:${openKey}`)}
          onClose={() => runViewTransition(() => setOpenKey(null))}
        />
      ) : null}
    </>
  );
}
