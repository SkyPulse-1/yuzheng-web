import { describe, expect, it } from "vitest";

import { buildQuestionCards, splitQuestionAnswer } from "../../src/lib/questions";

describe("question cards", () => {
  it("turns a free-form answer into stable analysis statements", () => {
    expect(splitQuestionAnswer("### 核心结论\n1. **核心结论**\n\n- 补充判断\n> `资料边界`\n---\n### 关键证据")).toEqual([
      "核心结论",
      "补充判断",
      "资料边界",
    ]);
  });

  it("uses the latest assistant answer and keeps evidence metadata", () => {
    const cards = buildQuestionCards([{
      id: "q1",
      title: "比较两份材料",
      status: "COMPLETED",
      selected_document_ids: ["d1", "d2"],
      source_scope_count: 2,
      source_warning: null,
      last_error: null,
      created_at: "2026-09-01T01:00:00Z",
      updated_at: "2026-09-01T01:03:00Z",
    }], [{
      id: "m1",
      conversation_id: "q1",
      role: "assistant",
      content: "较早回答",
      evidence_cards_json: [],
      created_at: "2026-09-01T01:01:00Z",
    }, {
      id: "m2",
      conversation_id: "q1",
      role: "assistant",
      content: "最终回答",
      evidence_cards_json: [{ claim: "主张", evidence_text: "原文", document_name: "A.pdf", page_number: 2 }],
      created_at: "2026-09-01T01:02:00Z",
    }]);

    expect(cards[0]).toMatchObject({
      question: "比较两份材料",
      answer: "最终回答",
      evidenceCount: 1,
      selectedDocumentIds: ["d1", "d2"],
      sourceCount: 2,
    });
  });
});
