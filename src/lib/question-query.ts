export function buildEvidenceQuestionQuery({
  selectedNames,
  useEntireLibrary,
  directContext,
  message,
}: {
  selectedNames: string[];
  useEntireLibrary: boolean;
  directContext: string;
  message: string;
}) {
  const scopeInstruction = useEntireLibrary
    ? "请只根据当前知识库内下列资料回答。"
    : selectedNames.length === 1
      ? `请只根据“${selectedNames[0]}”回答。`
      : `请比较并综合以下资料：${selectedNames.join("、")}。`;

  return [
    scopeInstruction,
    directContext,
    `用户的分析需求：${message}`,
    "请以直接结论开头，使用客观、简洁、证据导向的中文陈述句。",
    "不要使用寒暄、对话式称呼或模型自我说明，也不要重复用户问题。",
    "请将回答按独立结论分行，每行只表达一个独立判断，便于形成统一的研究卡片。",
    "每项判断必须能由所选资料支持；证据不足时只写“资料中未提供足够依据。”",
    "不要补写资料中不存在的事实。",
  ].filter(Boolean).join("\n\n");
}
