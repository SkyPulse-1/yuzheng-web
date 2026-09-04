// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { AnalysisSectionCard } from "../../src/components/analysis/analysis-result-cards";
import { QuestionCard } from "../../src/components/assistant/question-card";

afterEach(cleanup);

describe("analysis card parity", () => {
  it("uses one shared card frame for fixed analysis and custom questions", () => {
    const fixed = render(
      <AnalysisSectionCard
        sectionKey="content_summary"
        items={[{ text: "资料的核心结论。", sources: [{ quote: "核心原文" }] }]}
        onOpen={vi.fn()}
      />,
    );

    const fixedCard = fixed.container.querySelector('[data-analysis-card="true"]');
    expect(fixedCard).toBeTruthy();
    expect(fixedCard?.classList.contains("analysis-card")).toBe(true);
    fixed.unmount();

    const question = render(
      <QuestionCard
        question={{
          id: "question-1",
          question: "材料如何支持结论？",
          status: "COMPLETED",
          answer: "### 核心结论\n**材料给出了可核验依据。**\n- 结论仅适用于所选资料。",
          evidenceCards: [],
          evidenceCount: 0,
          selectedDocumentIds: ["source-1"],
          sourceCount: 1,
          sourceWarning: null,
          error: null,
          createdAt: "2026-09-05T00:00:00.000Z",
          updatedAt: "2026-09-05T00:00:00.000Z",
        }}
        onOpen={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const questionCard = question.container.querySelector('[data-analysis-card="true"]');
    expect(questionCard).toBeTruthy();
    expect(questionCard?.classList.contains("analysis-card")).toBe(true);
    expect(screen.getByText("研究结论")).toBeTruthy();
    expect(screen.getByText("打开详情")).toBeTruthy();
    expect(screen.getByText("材料给出了可核验依据。")).toBeTruthy();
    expect(screen.getByText("结论仅适用于所选资料。")).toBeTruthy();
    expect(screen.queryByText(/###|\*\*/)).toBeNull();
    expect(screen.getByRole("button", { name: "删除" })).toBeTruthy();
  });
});
