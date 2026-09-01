// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PastedTextAnalysis } from "../../src/components/documents/pasted-text-analysis";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("PastedTextAnalysis", () => {
  it("shows the test label, character count, and disables empty submissions", async () => {
    const user = userEvent.setup();
    render(<PastedTextAnalysis libraryId="library-1" />);

    expect(screen.getByText("粘贴文字分析")).toBeTruthy();
    expect(screen.getByText("测试功能")).toBeTruthy();
    const submit = screen.getByRole("button", { name: "开始分析" });
    expect((submit as HTMLButtonElement).disabled).toBe(true);

    await user.type(screen.getByLabelText("需要分析的文字"), "两字");
    expect(screen.getByText("2 / 8000")).toBeTruthy();
    expect((submit as HTMLButtonElement).disabled).toBe(false);
  });

  it("submits text, displays the answer, and clears local content", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ answer: "这是分析结果。" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);
    render(<PastedTextAnalysis libraryId="library-1" />);

    const textarea = screen.getByLabelText("需要分析的文字") as HTMLTextAreaElement;
    await user.type(textarea, "需要分析的原文");
    await user.click(screen.getByRole("button", { name: "开始分析" }));

    await screen.findByText("这是分析结果。");
    expect(fetchMock).toHaveBeenCalledWith("/api/text-analysis", expect.objectContaining({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ libraryId: "library-1", text: "需要分析的原文" }),
    }));

    await user.click(screen.getByRole("button", { name: "清空内容" }));
    expect(textarea.value).toBe("");
    expect(screen.queryByText("这是分析结果。")).toBeNull();
  });

  it("disables duplicate submissions while pending", async () => {
    const user = userEvent.setup();
    let resolveRequest!: (value: Response) => void;
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise<Response>((resolve) => { resolveRequest = resolve; })));
    render(<PastedTextAnalysis libraryId="library-1" />);

    await user.type(screen.getByLabelText("需要分析的文字"), "原文");
    await user.click(screen.getByRole("button", { name: "开始分析" }));
    const pendingButton = screen.getByRole("button", { name: "正在分析内容…" }) as HTMLButtonElement;
    expect(pendingButton.disabled).toBe(true);

    resolveRequest(new Response(JSON.stringify({ answer: "完成" }), { status: 200 }));
    await screen.findByText("完成");
  });

  it("keeps the text and shows a readable error after failure", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "文字分析暂时失败或超时，请重试。" }), { status: 502 })));
    render(<PastedTextAnalysis libraryId="library-1" />);

    const textarea = screen.getByLabelText("需要分析的文字") as HTMLTextAreaElement;
    await user.type(textarea, "保留这段原文");
    await user.click(screen.getByRole("button", { name: "开始分析" }));

    await waitFor(() => expect(screen.getByText("文字分析暂时失败或超时，请重试。")).toBeTruthy());
    expect(textarea.value).toBe("保留这段原文");
  });
});
