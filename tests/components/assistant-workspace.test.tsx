// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
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
        { id: "file-1", title: "研究报告.pdf", kind: "FILE", sourceText: "", analysisResult: null, analysisStatus: "NOT_STARTED" },
        { id: "text-1", title: "课堂笔记", kind: "TEXT", sourceText: "课堂原文", analysisResult: null, analysisStatus: "NOT_STARTED" },
      ]}
      initialQuestions={[]}
      initialNextCursor={null}
    />);

    await user.click(screen.getByText("研究报告.pdf"));
    await user.click(screen.getByText("课堂笔记"));
    expect(screen.queryByRole("textbox", { name: "分析需求" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "确认资料" }));
    expect(screen.getByText("从一个分析需求开始")).toBeTruthy();
    await user.type(screen.getByRole("textbox", { name: "分析需求" }), "比较两份材料的主要分歧");
    await user.click(screen.getByRole("button", { name: "开始分析" }));

    await waitFor(() => expect(screen.getByText("两份材料的讨论重点不同。")).toBeTruthy());
    expect(fetch).toHaveBeenCalledWith("/api/chat", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ libraryId: "library-1", selectedDocumentIds: ["file-1", "text-1"], message: "比较两份材料的主要分歧" }),
    }));
  });

  it("automatically creates four evidence cards after one source is confirmed", async () => {
    const user = userEvent.setup();
    const result = {
      content_summary: [{ text: "材料强调可核验。", sources: [{ quote: "结论应回到原文" }] }],
      key_points: [{ text: "主要观点清楚。", sources: [{ quote: "主要观点" }] }],
      source_evidence: [{ text: "存在直接依据。", sources: [{ quote: "直接依据" }] }],
      uncertainties: [{ text: "样本范围未说明。", sources: [], basis: "综合判断" as const }],
    };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result, status: "READY" }) });
    vi.stubGlobal("fetch", fetchMock);

    render(<AssistantWorkspace
      libraryId="library-1"
      libraryName="我的资料库"
      sources={[{
        id: "text-1",
        title: "课堂笔记",
        kind: "TEXT",
        sourceText: "前文。结论应回到原文。主要观点。直接依据。后文。",
        analysisResult: null,
        analysisStatus: "NOT_STARTED",
      }]}
      initialQuestions={[]}
      initialNextCursor={null}
    />);

    expect(screen.getByText("选择资料并确认")).toBeTruthy();
    await user.click(screen.getByText("课堂笔记"));
    await user.click(screen.getByRole("button", { name: "确认资料" }));

    await waitFor(() => expect(screen.getByText("四项证据结论")).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledWith("/api/documents/text-1/analyze-source", { method: "POST" });
    expect(screen.getByText("内容摘要")).toBeTruthy();
    expect(screen.getByText("关键观点")).toBeTruthy();
    expect(screen.getByText("原文依据")).toBeTruthy();
    expect(screen.getByText("信息不足与歧义")).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: "分析需求" })).toBeNull();

    await user.click(screen.getByRole("button", { name: /内容摘要/ }));
    const dialog = screen.getByRole("dialog", { name: "内容摘要详情" });
    await user.hover(within(dialog).getByRole("button", { name: "材料强调可核验。" }));
    expect(screen.getByRole("complementary", { name: "来源原文上下文" })).toBeTruthy();
    expect(screen.getByText("结论应回到原文")).toBeTruthy();
  });
});
