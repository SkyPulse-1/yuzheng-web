import { describe, expect, it } from "vitest";

import { attachUniqueDocumentIds, createInlineTextResponse } from "../../src/lib/evidence-sources";
import type { EvidenceCard } from "../../src/lib/hiagent/client";

const card: EvidenceCard = {
  card_id: "E1",
  claim: "结论",
  evidence_text: "原文",
  document_name: "A.pdf",
  page_number: 3,
};

describe("attachUniqueDocumentIds", () => {
  it("attaches an id only when the document name has one exact match", () => {
    expect(attachUniqueDocumentIds([card], [{ id: "d1", original_name: "A.pdf" }])[0].document_id)
      .toBe("d1");
  });

  it("does not guess when two selected documents share the same name", () => {
    const result = attachUniqueDocumentIds(
      [{ ...card, document_id: "stale-id" }],
      [
        { id: "d1", original_name: "A.pdf" },
        { id: "d2", original_name: "A.pdf" },
      ],
    );

    expect(result[0].document_id).toBeUndefined();
  });

  it("does not attach an id when HiAgent returns an unknown name", () => {
    expect(attachUniqueDocumentIds([{ ...card, document_name: "不存在.pdf" }], [{ id: "d1", original_name: "A.pdf" }])[0].document_id)
      .toBeUndefined();
  });
});

describe("createInlineTextResponse", () => {
  it("returns pasted text as UTF-8 inline content without exposing other data", async () => {
    const response = createInlineTextResponse("第一段原文", "课堂笔记");

    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(response.headers.get("content-disposition")).toContain("inline");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.text()).toBe("第一段原文");
  });
});
