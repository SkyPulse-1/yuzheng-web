import { describe, expect, it, vi } from "vitest";

import { analyzeSingleSource } from "../../src/lib/single-source-analysis";

const structuredAnswer = JSON.stringify({
  content_summary: [{ text: "资料强调可靠性。", sources: [{ quote: "可靠原句" }] }],
  key_points: [],
  source_evidence: [],
  uncertainties: [],
});

describe("analyzeSingleSource", () => {
  it("validates uploaded-file conclusions against returned evidence snippets", async () => {
    const analyzed = await analyzeSingleSource({
      userId: "user-1",
      sourceKind: "FILE",
      sourceName: "第一章.pdf",
      sourceText: null,
      dependencies: {
        createConversation: vi.fn().mockResolvedValue("remote-1"),
        analyze: vi.fn().mockResolvedValue({
          answer: structuredAnswer,
          evidenceCards: [{
            card_id: "E1",
            claim: "证据",
            evidence_text: "前文。可靠原句。后文。",
            document_name: "第一章.pdf",
            page_number: 2,
          }],
        }),
      },
    });

    expect(analyzed.result.content_summary[0].sources[0]).toMatchObject({
      quote: "可靠原句",
      context_before: "前文。",
      context_after: "。后文。",
    });
    expect(analyzed.contextText).toContain("可靠原句");
  });

  it("rejects file conclusions whose quote is absent from trusted evidence", async () => {
    await expect(analyzeSingleSource({
      userId: "user-1",
      sourceKind: "FILE",
      sourceName: "第一章.pdf",
      sourceText: null,
      dependencies: {
        createConversation: vi.fn().mockResolvedValue("remote-1"),
        analyze: vi.fn().mockResolvedValue({
          answer: structuredAnswer,
          evidenceCards: [{
            card_id: "E1",
            claim: "别的内容",
            evidence_text: "证据片段中没有目标句。",
            document_name: "第一章.pdf",
            page_number: 2,
          }],
        }),
      },
    })).rejects.toThrow("SOURCE_ANALYSIS_NO_RELIABLE_RESULT");
  });

  it("analyzes pasted text against the complete stored source", async () => {
    const analyzed = await analyzeSingleSource({
      userId: "user-1",
      sourceKind: "TEXT",
      sourceName: "课堂笔记",
      sourceText: "前文。可靠原句。后文。",
      dependencies: {
        createConversation: vi.fn().mockResolvedValue("remote-1"),
        analyze: vi.fn().mockResolvedValue({ answer: structuredAnswer, evidenceCards: [] }),
      },
    });

    expect(analyzed.result.content_summary).toHaveLength(1);
    expect(analyzed.contextText).toBe("前文。可靠原句。后文。");
  });
});
