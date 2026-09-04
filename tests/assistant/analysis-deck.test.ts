import { describe, expect, it } from "vitest";

import { buildSingleSourceDeckItems } from "../../src/lib/analysis-deck";
import type { QuestionCard } from "../../src/lib/questions";

function question(id: string, selectedDocumentIds: string[], createdAt: string): QuestionCard {
  return {
    id,
    question: `问题 ${id}`,
    status: "COMPLETED",
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

describe("buildSingleSourceDeckItems", () => {
  it("inserts matching questions newest-first immediately after the summary", () => {
    const items = buildSingleSourceDeckItems([
      question("old", ["source-1"], "2026-09-02T08:00:00Z"),
      question("other", ["source-2"], "2026-09-02T10:00:00Z"),
      question("multi", ["source-1", "source-2"], "2026-09-02T10:30:00Z"),
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

  it("always returns all four fixed sections", () => {
    expect(buildSingleSourceDeckItems([], "source-1").map((item) => item.id)).toEqual([
      "section:content_summary",
      "section:key_points",
      "section:source_evidence",
      "section:uncertainties",
    ]);
  });
});
