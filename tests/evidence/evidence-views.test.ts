import { describe, expect, it } from "vitest";

import {
  buildRecentResearchWorkspaces,
  parseEvidenceCardSnapshot,
  parseRecentEvidenceRows,
  summarizeRecentAnswer,
} from "../../src/lib/evidence-views";

describe("parseEvidenceCardSnapshot", () => {
  it("keeps only homepage-safe evidence fields", () => {
    expect(parseEvidenceCardSnapshot({
      card_id: "E1",
      claim: "观点",
      evidence_text: "原文",
      document_name: "A.pdf",
      page_number: 3,
      retrieval_score: 0.9,
    })).toEqual({
      card_id: "E1",
      claim: "观点",
      evidence_text: "原文",
      document_name: "A.pdf",
      page_number: 3,
    });
  });

  it("rejects incomplete cards", () => {
    expect(parseEvidenceCardSnapshot({ claim: "观点" })).toBeNull();
  });
});

describe("parseRecentEvidenceRows", () => {
  it("returns at most three valid recent cards", () => {
    const rows = [1, 2, 3, 4].map((number) => ({
      card_json: {
        card_id: `E${number}`,
        claim: `观点${number}`,
        evidence_text: `原文${number}`,
        document_name: "A.pdf",
        page_number: number,
      },
    }));

    expect(parseRecentEvidenceRows(rows).map((card) => card.card_id)).toEqual(["E1", "E2", "E3"]);
  });

  it("skips malformed rows", () => {
    expect(parseRecentEvidenceRows([
      { card_json: { claim: "缺少来源" } },
      { card_json: { card_id: "E2", claim: "观点", evidence_text: "原文", document_name: "B.pdf", page_number: null } },
    ])).toHaveLength(1);
  });
});

describe("buildRecentResearchWorkspaces", () => {
  const input = {
    conversations: [
      { id: "conversation-old", library_id: "library-old", title: "旧问题", status: "COMPLETED", updated_at: "2026-09-01T08:00:00Z" },
      { id: "conversation-new", library_id: "library-new", title: "新问题", status: "COMPLETED", updated_at: "2026-09-01T10:00:00Z" },
      { id: "conversation-newer-same-library", library_id: "library-new", title: "同库最新问题", status: "COMPLETED", updated_at: "2026-09-01T11:00:00Z" },
      { id: "conversation-failed", library_id: "library-failed", title: "失败问题", status: "FAILED", updated_at: "2026-09-01T12:00:00Z" },
    ],
    messages: [
      {
        conversation_id: "conversation-newer-same-library",
        created_at: "2026-09-01T11:01:00Z",
        content: "  新回答\n包含   多余空格  ",
        evidence_cards_json: [{ card_id: "new", claim: "新结论", evidence_text: "新原文", document_id: "document-new", document_name: "错误快照名.pdf", page_number: 8 }],
      },
      {
        conversation_id: "conversation-old",
        created_at: "2026-09-01T08:01:00Z",
        content: null,
        evidence_cards_json: [{ card_id: "old", claim: "旧结论", evidence_text: "旧原文", document_id: "document-old", document_name: "旧资料.pdf", page_number: null }],
      },
    ],
    libraries: [
      { id: "library-new", name: "新工作台" },
      { id: "library-old", name: "旧工作台" },
    ],
    documents: [
      { id: "document-new", library_id: "library-new", original_name: "真实资料.pdf", deleted_at: null },
      { id: "document-old", library_id: "library-old", original_name: "旧资料.pdf", deleted_at: null },
    ],
  };

  it("sorts and deduplicates completed workspaces using real library data", () => {
    const workspaces = buildRecentResearchWorkspaces(input);

    expect(workspaces.map((item) => item.libraryId)).toEqual(["library-new", "library-old"]);
    expect(workspaces[0]).toMatchObject({
      libraryName: "新工作台",
      question: "同库最新问题",
      answerSummary: "新回答 包含 多余空格",
      workspaceHref: "/assistant?libraryId=library-new",
      sourceHref: "/api/documents/document-new/file?page=8",
    });
    expect(workspaces[0].card?.document_name).toBe("真实资料.pdf");
  });

  it("keeps the real workspace but removes an invalid source", () => {
    const workspaces = buildRecentResearchWorkspaces({
      ...input,
      documents: [{ id: "document-new", library_id: "library-new", original_name: "已删除.pdf", deleted_at: "2026-09-01T12:00:00Z" }],
    });

    expect(workspaces[0]).toMatchObject({ libraryId: "library-new", card: null, sourceHref: null });
  });

  it("rejects a source document that belongs to another workspace", () => {
    const workspaces = buildRecentResearchWorkspaces({
      ...input,
      documents: [{ id: "document-new", library_id: "library-old", original_name: "错库资料.pdf", deleted_at: null }],
    });

    expect(workspaces[0].card).toBeNull();
  });
});

describe("summarizeRecentAnswer", () => {
  it("normalizes whitespace and truncates long answers without exposing markup", () => {
    expect(summarizeRecentAnswer("  第一段\n\n第二段   继续  ")).toBe("第一段 第二段 继续");
    expect(summarizeRecentAnswer("### 核心结论\n**重点判断**\n> 一段引文")).toBe("重点判断 一段引文");
    expect(summarizeRecentAnswer("一二三四五六", 5)).toBe("一二三四…");
    expect(summarizeRecentAnswer("   ")).toBeNull();
  });
});
