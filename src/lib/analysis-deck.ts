import type { AnalysisSectionKey } from "./analysis-results";
import type { QuestionCard } from "./questions";

export type AnalysisDeckItem =
  | { id: `section:${AnalysisSectionKey}`; kind: "section"; sectionKey: AnalysisSectionKey }
  | { id: `question:${string}`; kind: "question"; question: QuestionCard };

const TRAILING_SECTIONS: AnalysisSectionKey[] = [
  "key_points",
  "source_evidence",
  "uncertainties",
];

export function buildSingleSourceDeckItems(questions: QuestionCard[], sourceId: string): AnalysisDeckItem[] {
  const matching = questions
    .filter((question) => question.selectedDocumentIds.length === 1 && question.selectedDocumentIds[0] === sourceId)
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return [
    { id: "section:content_summary", kind: "section", sectionKey: "content_summary" },
    ...matching.map((question) => ({
      id: `question:${question.id}` as const,
      kind: "question" as const,
      question,
    })),
    ...TRAILING_SECTIONS.map((sectionKey) => ({
      id: `section:${sectionKey}` as const,
      kind: "section" as const,
      sectionKey,
    })),
  ];
}
