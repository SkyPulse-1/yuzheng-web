import { describe, expect, it } from "vitest";

import {
  PASTED_TEXT_LIMIT,
  validateTextSourceInput,
} from "../../src/lib/text-sources";

describe("formal pasted text sources", () => {
  it("accepts a trimmed title and exactly 30,000 characters", () => {
    const result = validateTextSourceInput({
      title: "  第一章  ",
      content: "文".repeat(PASTED_TEXT_LIMIT),
    });

    expect(result).toEqual({
      ok: true,
      data: { title: "第一章", content: "文".repeat(PASTED_TEXT_LIMIT) },
    });
  });

  it("rejects empty titles, oversized titles, empty content, and content over the limit", () => {
    expect(validateTextSourceInput({ title: " ", content: "正文" })).toMatchObject({ ok: false });
    expect(validateTextSourceInput({ title: "题".repeat(121), content: "正文" })).toMatchObject({ ok: false });
    expect(validateTextSourceInput({ title: "标题", content: "   " })).toMatchObject({ ok: false });
    expect(validateTextSourceInput({ title: "标题", content: "文".repeat(PASTED_TEXT_LIMIT + 1) })).toEqual({
      ok: false,
      error: `文字资料不能超过 ${PASTED_TEXT_LIMIT} 个字符，请按章节拆分。`,
    });
  });
});
