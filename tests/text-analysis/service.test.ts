import { describe, expect, it, vi } from "vitest";

import {
  analyzePastedTextRequest,
  PASTED_TEXT_LIMIT,
  type TextAnalysisDependencies,
} from "../../src/lib/text-analysis";

function createDependencies(overrides: Partial<TextAnalysisDependencies> = {}): TextAnalysisDependencies {
  return {
    libraryExists: vi.fn().mockResolvedValue(true),
    isHiAgentConfigured: vi.fn().mockReturnValue(true),
    createConversation: vi.fn().mockResolvedValue("remote-conversation-1"),
    analyze: vi.fn().mockResolvedValue("分析结果"),
    ...overrides,
  };
}

describe("pasted text analysis service", () => {
  it("rejects unauthenticated requests", async () => {
    const dependencies = createDependencies();

    await expect(analyzePastedTextRequest({ body: { libraryId: "library-1", text: "原文" } }, dependencies)).resolves.toEqual({
      status: 401,
      body: { error: "请先登录。" },
    });
    expect(dependencies.libraryExists).not.toHaveBeenCalled();
  });

  it("rejects empty text and text beyond the limit", async () => {
    const dependencies = createDependencies();

    await expect(analyzePastedTextRequest({ userId: "user-1", body: { libraryId: "library-1", text: "   " } }, dependencies)).resolves.toMatchObject({ status: 400 });
    await expect(analyzePastedTextRequest({ userId: "user-1", body: { libraryId: "library-1", text: "文".repeat(PASTED_TEXT_LIMIT + 1) } }, dependencies)).resolves.toEqual({
      status: 400,
      body: { error: `文字不能超过 ${PASTED_TEXT_LIMIT} 个字符。` },
    });
    expect(dependencies.createConversation).not.toHaveBeenCalled();
  });

  it("accepts exactly the maximum number of characters", async () => {
    const dependencies = createDependencies();
    const text = "文".repeat(PASTED_TEXT_LIMIT);

    await expect(analyzePastedTextRequest({ userId: "user-1", body: { libraryId: "library-1", text } }, dependencies)).resolves.toMatchObject({ status: 200 });
    expect(dependencies.analyze).toHaveBeenCalledOnce();
  });

  it("rejects inaccessible libraries", async () => {
    const dependencies = createDependencies({ libraryExists: vi.fn().mockResolvedValue(false) });

    await expect(analyzePastedTextRequest({ userId: "user-1", body: { libraryId: "library-1", text: "原文" } }, dependencies)).resolves.toEqual({
      status: 404,
      body: { error: "知识库不存在。" },
    });
  });

  it("reports unavailable HiAgent configuration", async () => {
    const dependencies = createDependencies({ isHiAgentConfigured: vi.fn().mockReturnValue(false) });

    await expect(analyzePastedTextRequest({ userId: "user-1", body: { libraryId: "library-1", text: "原文" } }, dependencies)).resolves.toEqual({
      status: 503,
      body: { error: "文字分析功能尚未配置完成，请稍后再试。" },
    });
  });

  it("creates one temporary conversation and returns only the answer", async () => {
    const dependencies = createDependencies();
    const result = await analyzePastedTextRequest({
      userId: "user-1",
      body: { libraryId: "library-1", text: "  这是需要分析的原文。  " },
    }, dependencies);

    expect(result).toEqual({ status: 200, body: { answer: "分析结果" } });
    expect(dependencies.createConversation).toHaveBeenCalledOnce();
    expect(dependencies.createConversation).toHaveBeenCalledWith("user-1");
    expect(dependencies.analyze).toHaveBeenCalledOnce();
    expect(dependencies.analyze).toHaveBeenCalledWith(expect.objectContaining({
      userId: "user-1",
      conversationId: "remote-conversation-1",
      query: expect.stringContaining("这是需要分析的原文。"),
    }));
    const analyzeInput = vi.mocked(dependencies.analyze).mock.calls[0][0];
    expect(analyzeInput.query).toContain("内容摘要");
    expect(analyzeInput.query).toContain("关键观点");
    expect(analyzeInput.query).toContain("可核验的原文依据");
    expect(analyzeInput.query).toContain("信息不足或歧义");
    expect(analyzeInput.query).toContain("不要补充原文以外的事实");
  });

  it("maps HiAgent failures to a safe retry message", async () => {
    const dependencies = createDependencies({ analyze: vi.fn().mockRejectedValue(new Error("secret upstream detail")) });

    await expect(analyzePastedTextRequest({ userId: "user-1", body: { libraryId: "library-1", text: "原文" } }, dependencies)).resolves.toEqual({
      status: 502,
      body: { error: "文字分析暂时失败或超时，请重试。" },
    });
  });
});
