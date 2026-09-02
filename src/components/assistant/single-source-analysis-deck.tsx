"use client";

import { useState, type ReactNode } from "react";

import { AnalysisDetailDialog } from "../analysis/analysis-detail-dialog";
import { ANALYSIS_SECTION_META, AnalysisSectionCard } from "../analysis/analysis-result-cards";
import type { AnalysisDeckItem } from "../../lib/analysis-deck";
import type { AnalysisSectionKey, TextAnalysisResult } from "../../lib/analysis-results";
import type { QuestionCard as QuestionCardData } from "../../lib/questions";
import { NativeAnalysisDeck } from "./native-analysis-deck";
import { QuestionCard } from "./question-card";

export type DeckAdapterProps = {
  items: AnalysisDeckItem[];
  renderItem: (item: AnalysisDeckItem) => ReactNode;
};

export function SingleSourceAnalysisDeck({
  items,
  result,
  sourceTitle,
  sourceText,
  onOpenQuestion,
  onDeleteQuestion,
}: {
  items: AnalysisDeckItem[];
  result: TextAnalysisResult;
  sourceTitle: string;
  sourceText: string;
  onOpenQuestion: (question: QuestionCardData) => void;
  onDeleteQuestion: (question: QuestionCardData) => void;
}) {
  const [openKey, setOpenKey] = useState<AnalysisSectionKey | null>(null);
  const renderItem = (item: AnalysisDeckItem) => item.kind === "section" ? (
    <AnalysisSectionCard
      sectionKey={item.sectionKey}
      items={result[item.sectionKey]}
      onOpen={() => setOpenKey(item.sectionKey)}
    />
  ) : (
    <QuestionCard
      question={item.question}
      onOpen={() => onOpenQuestion(item.question)}
      onDelete={() => onDeleteQuestion(item.question)}
    />
  );
  return (
    <>
      <NativeAnalysisDeck items={items} renderItem={renderItem} />

      {openKey ? (
        <AnalysisDetailDialog
          open
          title={ANALYSIS_SECTION_META[openKey].title}
          items={result[openKey]}
          sourceTitle={sourceTitle}
          sourceText={sourceText}
          onClose={() => setOpenKey(null)}
        />
      ) : null}
    </>
  );
}
