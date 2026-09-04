// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PastedTextAnalysis } from "../../src/components/documents/pasted-text-analysis";
import type { LibraryDocument } from "../../src/lib/documents";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  refresh.mockReset();
});

function createSource(overrides: Partial<LibraryDocument> = {}): LibraryDocument {
  return {
    id: "source-1",
    owner_id: "user-1",
    library_id: "library-1",
    original_name: "第一章",
    mime_type: "text/plain",
    size_bytes: 12,
    storage_path: null,
    kb_document_id: null,
    status: "STORED",
    error_message: null,
    page_count: null,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    source_kind: "TEXT",
    text_content: "证据必须能够回到原文。",
    analysis_status: "NOT_STARTED",
    analysis_result_json: { content_summary: [], key_points: [], source_evidence: [], uncertainties: [] },
    analysis_started_at: null,
    deleted_at: null,
    purge_after: null,
    ...overrides,
  };
}

describe("formal pasted text source manager", () => {
  it("shows the formal save-first flow and the 30,000 character limit", async () => {
    const user = userEvent.setup();
    render(<PastedTextAnalysis libraryId="library-1" />);

    expect(screen.queryByText("测试功能")).toBeNull();
    expect(screen.getByText("0 / 30000")).toBeTruthy();
    const save = screen.getByRole("button", { name: "保存文字资料" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);

    await user.type(screen.getByLabelText("资料标题"), "第一章");
    await user.type(screen.getByLabelText("文字资料正文"), "证据必须能够回到原文。");
    expect(save.disabled).toBe(false);
  });

  it("saves title and content before analysis", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ document: createSource() }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);
    render(<PastedTextAnalysis libraryId="library-1" />);

    await user.type(screen.getByLabelText("资料标题"), "第一章");
    await user.type(screen.getByLabelText("文字资料正文"), "证据必须能够回到原文。");
    await user.click(screen.getByRole("button", { name: "保存文字资料" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/libraries/library-1/text-sources", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ title: "第一章", content: "证据必须能够回到原文。" }),
    }));
    expect(refresh).toHaveBeenCalled();
  });

  it("locks editing after analysis has started", () => {
    render(<PastedTextAnalysis libraryId="library-1" sources={[createSource({
      analysis_started_at: "2026-09-01T01:00:00Z",
      analysis_status: "FAILED",
    })]} />);

    expect(screen.queryByRole("button", { name: "修改" })).toBeNull();
    expect(screen.queryByRole("button", { name: /分析/ })).toBeNull();
    expect(screen.queryByText("内容摘要")).toBeNull();
    expect(screen.getByRole("link", { name: "前往证据问答" }).getAttribute("href")).toBe("/assistant?libraryId=library-1");
  });
});
