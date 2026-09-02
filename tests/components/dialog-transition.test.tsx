// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { AnalysisDetailDialog } from "../../src/components/analysis/analysis-detail-dialog";
import { QuestionDetailDialog } from "../../src/components/assistant/question-detail-dialog";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.style.overflow = "";
});

function stubMotionPreference(reduce: boolean) {
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({
    matches: reduce,
    media: "(prefers-reduced-motion: reduce)",
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

const question = {
  id: "question-1",
  question: "材料如何支持结论？",
  status: "COMPLETED" as const,
  answer: "材料给出了可核验依据。",
  evidenceCards: [],
  evidenceCount: 0,
  selectedDocumentIds: ["source-1"],
  sourceCount: 1,
  sourceWarning: null,
  error: null,
  createdAt: "2026-09-02T10:00:00.000Z",
  updatedAt: "2026-09-02T10:00:00.000Z",
};

describe("detail dialog transitions", () => {
  it("keeps the analysis dialog mounted during close and restores body scrolling", () => {
    vi.useFakeTimers();
    stubMotionPreference(false);
    const onClose = vi.fn();
    document.body.style.overflow = "auto";

    const view = render(
      <AnalysisDetailDialog open title="内容摘要" items={[]} sourceTitle="资料" sourceText="" onClose={onClose} />,
    );

    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(screen.getByRole("button", { name: "关闭" }));
    expect(screen.getByRole("dialog", { name: "内容摘要详情" })).toBeTruthy();
    expect(screen.getByRole("dialog").getAttribute("data-state")).toBe("closing");
    expect(onClose).not.toHaveBeenCalled();

    vi.advanceTimersByTime(220);
    expect(onClose).toHaveBeenCalledOnce();
    view.unmount();
    expect(document.body.style.overflow).toBe("auto");
  });

  it("uses the same delayed close lifecycle for question dialogs", () => {
    vi.useFakeTimers();
    stubMotionPreference(false);
    const onClose = vi.fn();

    render(<QuestionDetailDialog question={question} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.getByRole("dialog", { name: "问题卡片详情" }).getAttribute("data-state")).toBe("closing");
    expect(onClose).not.toHaveBeenCalled();
    vi.advanceTimersByTime(220);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes synchronously when reduced motion is enabled", () => {
    stubMotionPreference(true);
    const onClose = vi.fn();

    render(<QuestionDetailDialog question={question} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "关闭" }));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
