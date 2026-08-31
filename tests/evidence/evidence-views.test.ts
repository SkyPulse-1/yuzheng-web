import { describe, expect, it } from "vitest";

import {
  parseEvidenceCardSnapshot,
  parseRecentEvidenceRows,
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
