// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AssistantWorkspace } from "../../src/components/assistant/assistant-workspace";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AssistantWorkspace", () => {
  it("selects multiple sources and turns a custom request into a persistent card", async () => {
    const user = userEvent.setup();
    const now = "2026-09-01T10:00:00.000Z";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        question: {
          id: "question-1",
          question: "比较两份材料的主要分歧",
          status: "COMPLETED",
          answer: "两份材料的讨论重点不同。",
          evidenceCards: [],
          evidenceCount: 0,
          selectedDocumentIds: ["file-1", "text-1"],
          sourceCount: 2,
          sourceWarning: null,
          error: null,
          createdAt: now,
          updatedAt: now,
        },
      }),
    }));

    render(<AssistantWorkspace
      libraryId="library-1"
      libraryName="我的资料库"
      sources={[
        { id: "file-1", title: "研究报告.pdf", kind: "FILE" },
        { id: "text-1", title: "课堂笔记", kind: "TEXT" },
      ]}
      initialQuestions={[]}
      initialNextCursor={null}
    />);

    await user.click(screen.getByText("研究报告.pdf"));
    await user.click(screen.getByText("课堂笔记"));
    await user.type(screen.getByRole("textbox", { name: "分析需求" }), "比较两份材料的主要分歧");
    await user.click(screen.getByRole("button", { name: "开始分析" }));

    await waitFor(() => expect(screen.getByText("两份材料的讨论重点不同。")).toBeTruthy());
    expect(fetch).toHaveBeenCalledWith("/api/chat", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ libraryId: "library-1", selectedDocumentIds: ["file-1", "text-1"], message: "比较两份材料的主要分歧" }),
    }));
  });
});
