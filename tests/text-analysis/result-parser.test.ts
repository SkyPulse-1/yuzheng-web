import { describe, expect, it } from "vitest";

import {
  createEmptyAnalysisResult,
  parseTextAnalysisResult,
} from "../../src/lib/analysis-results";

const source = "甲认为证据必须能够回到原文。乙指出信息不足时应明确说明。";

describe("text analysis result parser", () => {
  it("returns the four fixed sections and keeps only exact source quotes", () => {
    const result = parseTextAnalysisResult(JSON.stringify({
      content_summary: [
        { text: "材料强调可核验。", sources: [{ quote: "证据必须能够回到原文" }] },
      ],
      key_points: [
        { text: "不能编造证据。", sources: [{ quote: "原文里不存在的句子" }] },
      ],
      source_evidence: [
        { text: "信息不足应明示。", sources: [{ quote: "信息不足时应明确说明" }] },
      ],
      uncertainties: [
        { text: "材料没有说明具体实现方式。", sources: [], basis: "综合判断" },
      ],
    }), source);

    expect(result.content_summary).toHaveLength(1);
    expect(result.key_points).toEqual([]);
    expect(result.source_evidence).toHaveLength(1);
    expect(result.uncertainties).toEqual([
      { text: "材料没有说明具体实现方式。", sources: [], basis: "综合判断" },
    ]);
  });

  it("accepts fenced JSON but never guesses headings from free text", () => {
    const fenced = "```json\n{\"content_summary\":[],\"key_points\":[],\"source_evidence\":[],\"uncertainties\":[]}\n```";
    expect(parseTextAnalysisResult(fenced, source)).toEqual(createEmptyAnalysisResult());
    expect(parseTextAnalysisResult("1. 内容摘要\n这是一段自由文本", source)).toEqual(createEmptyAnalysisResult());
  });

  it("drops malformed items and normal conclusions without a source", () => {
    const result = parseTextAnalysisResult({
      content_summary: [{ text: "没有证据", sources: [] }, null],
      key_points: "wrong",
      source_evidence: [],
      uncertainties: [{ text: "合理缺失", sources: [] }],
    }, source);

    expect(result).toEqual({
      content_summary: [],
      key_points: [],
      source_evidence: [],
      uncertainties: [{ text: "合理缺失", sources: [], basis: "综合判断" }],
    });
  });
});
