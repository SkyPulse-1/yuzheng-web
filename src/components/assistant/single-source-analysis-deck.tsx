"use client";

import { useState, type ComponentType, type ReactNode } from "react";

import { AnalysisDetailDialog } from "../analysis/analysis-detail-dialog";
import { ANALYSIS_SECTION_META, AnalysisSectionCard } from "../analysis/analysis-result-cards";
import type { AnalysisDeckItem } from "../../lib/analysis-deck";
import type { AnalysisSectionKey, TextAnalysisResult } from "../../lib/analysis-results";
import type { QuestionCard as QuestionCardData } from "../../lib/questions";
import { QuestionCard } from "./question-card";

export type DeckAdapterProps = {
  items: AnalysisDeckItem[];
  renderItem: (item: AnalysisDeckItem) => ReactNode;
};

function StaticAnalysisDeck({ items, renderItem }: DeckAdapterProps) {
  return (
    <div className="analysis-card-grid">
      {items.map((item) => (
        <div key={item.id} className="analysis-deck-item" data-testid="analysis-deck-item" data-deck-item-id={item.id}>
          {renderItem(item)}
        </div>
      ))}
    </div>
  );
}

export function SingleSourceAnalysisDeck({
  items,
  result,
  sourceTitle,
  sourceText,
  onOpenQuestion,
  onDeleteQuestion,
  adapter: Adapter = StaticAnalysisDeck,
}: {
  items: AnalysisDeckItem[];
  result: TextAnalysisResult;
  sourceTitle: string;
  sourceText: string;
  onOpenQuestion: (question: QuestionCardData) => void;
  onDeleteQuestion: (question: QuestionCardData) => void;
  adapter?: ComponentType<DeckAdapterProps>;
}) {
  const [openKey, setOpenKey] = useState<AnalysisSectionKey | null>(null);

  return (
    <>
      <Adapter items={items} renderItem={(item) => item.kind === "section" ? (
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
      )} />

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
