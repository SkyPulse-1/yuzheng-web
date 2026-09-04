// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

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

  it("uses the fullscreen analysis layout and numbers question conclusions", () => {
    stubMotionPreference(false);
    render(<QuestionDetailDialog question={{
      ...question,
      answer: "1. 材料给出了可核验依据。\n\n- 结论只适用于所选资料。",
      evidenceCards: [{
        card_id: "e1",
        claim: "材料支持该判断",
        evidence_text: "这是能够核验的原文。",
        document_name: "资料.pdf",
        page_number: 2,
        document_id: "document-1",
      }],
      evidenceCount: 1,
    }} onClose={vi.fn()} />);

    const dialog = screen.getByRole("dialog", { name: "问题卡片详情" });
    expect(dialog.classList.contains("analysis-dialog")).toBe(true);
    expect(within(dialog).getByText("01")).toBeTruthy();
    expect(within(dialog).getByText("02")).toBeTruthy();
    expect(within(dialog).getByText("材料给出了可核验依据。")).toBeTruthy();
    expect(within(dialog).getByRole("link", { name: "查看原文" })).toBeTruthy();
  });

  it("states the evidence boundary when a question has no evidence", () => {
    stubMotionPreference(false);
    render(<QuestionDetailDialog question={question} onClose={vi.fn()} />);

    expect(screen.getByText("资料中未提供足够依据。")).toBeTruthy();
  });

  it("closes a question dialog from the backdrop without unmounting it early", () => {
    vi.useFakeTimers();
    stubMotionPreference(false);
    const onClose = vi.fn();
    const view = render(<QuestionDetailDialog question={question} onClose={onClose} />);
    const backdrop = view.container.querySelector(".dialog-backdrop");

    expect(backdrop).toBeTruthy();
    fireEvent.mouseDown(backdrop!);
    expect(screen.getByRole("dialog").getAttribute("data-state")).toBe("closing");
    expect(onClose).not.toHaveBeenCalled();
    vi.advanceTimersByTime(220);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not lock body scrolling while an analysis dialog is closed", () => {
    stubMotionPreference(false);
    document.body.style.overflow = "auto";

    render(<AnalysisDetailDialog open={false} title="内容摘要" items={[]} sourceTitle="资料" sourceText="" onClose={vi.fn()} />);

    expect(document.body.style.overflow).toBe("auto");
  });

  it("closes synchronously when reduced motion is enabled", () => {
    stubMotionPreference(true);
    const onClose = vi.fn();

    render(<QuestionDetailDialog question={question} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "关闭" }));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
