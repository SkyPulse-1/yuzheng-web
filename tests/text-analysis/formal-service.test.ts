import { describe, expect, it, vi } from "vitest";

import {
  analyzeTextSourceContent,
  splitTextForAnalysis,
} from "../../src/lib/text-analysis";

describe("formal text analysis service", () => {
  it("keeps chunks within the upstream size while preserving all text", () => {
    const source = `${"甲".repeat(8_000)}\n\n${"乙".repeat(8_000)}\n\n${"丙".repeat(8_000)}`;
    const chunks = splitTextForAnalysis(source, 9_000);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= 9_000)).toBe(true);
    expect(chunks.join("")).toBe(source);
  });

  it("merges valid chunk results and marks partial failures", async () => {
    const analyze = vi.fn()
      .mockResolvedValueOnce(JSON.stringify({
        content_summary: [{ text: "第一部分", sources: [{ quote: "第一段证据" }] }],
        key_points: [],
        source_evidence: [],
        uncertainties: [],
      }))
      .mockRejectedValueOnce(new Error("upstream timeout"));

    const result = await analyzeTextSourceContent({
      userId: "user-1",
      text: `第一段证据${"甲".repeat(8_990)}\n\n第二段内容`,
      chunkSize: 9_000,
      dependencies: {
        createConversation: vi.fn().mockResolvedValue("remote-1"),
        analyze,
      },
    });

    expect(result.status).toBe("PARTIAL");
    expect(result.result.content_summary[0].text).toBe("第一部分");
    expect(result.failedChunks).toBe(1);
  });

  it("fails safely when no chunk returns a reliable result", async () => {
    await expect(analyzeTextSourceContent({
      userId: "user-1",
      text: "原文",
      dependencies: {
        createConversation: vi.fn().mockResolvedValue("remote-1"),
        analyze: vi.fn().mockResolvedValue("普通自由文本"),
      },
    })).rejects.toThrow("TEXT_ANALYSIS_NO_RELIABLE_RESULT");
  });
});
