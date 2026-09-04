import { describe, expect, it } from "vitest";

import { buildEvidenceQuestionQuery } from "../../src/lib/question-query";

describe("evidence question query", () => {
  it("keeps the selected scope and applies the shared evidence-card language contract", () => {
    const query = buildEvidenceQuestionQuery({
      selectedNames: ["甲资料", "乙资料"],
      useEntireLibrary: false,
      directContext: "【文字资料：甲资料】\n原文\n【资料结束】",
      message: "比较两份资料的共同观点",
    });

    expect(query).toContain("请比较并综合以下资料：甲资料、乙资料。");
    expect(query).toContain("用户的分析需求：比较两份资料的共同观点");
    expect(query).toContain("以直接结论开头");
    expect(query).toContain("客观、简洁、证据导向");
    expect(query).toContain("不要使用寒暄、对话式称呼或模型自我说明");
    expect(query).toContain("每行只表达一个独立判断");
    expect(query).toContain("资料中未提供足够依据。");
    expect(query).toContain("不要补写资料中不存在的事实");
  });

  it("preserves whole-library and single-source scope wording", () => {
    expect(buildEvidenceQuestionQuery({
      selectedNames: ["甲资料"],
      useEntireLibrary: true,
      directContext: "",
      message: "概括重点",
    })).toContain("请只根据当前知识库内下列资料回答。");

    expect(buildEvidenceQuestionQuery({
      selectedNames: ["甲资料"],
      useEntireLibrary: false,
      directContext: "",
      message: "概括重点",
    })).toContain("请只根据“甲资料”回答。");
  });
});
