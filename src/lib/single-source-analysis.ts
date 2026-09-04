import {
  ANALYSIS_SECTION_KEYS,
  hasReliableAnalysis,
  parseTextAnalysisResult,
  type TextAnalysisResult,
} from "./analysis-results";
import type { HiAgentFile, HiAgentResult } from "./hiagent/client";
import { analyzeTextSourceContent } from "./text-analysis";

type SingleSourceAnalysisDependencies = {
  createConversation: (userId: string) => Promise<string>;
  analyze: (input: { userId: string; conversationId: string; query: string; files?: HiAgentFile[] }) => Promise<HiAgentResult>;
};

function buildFileAnalysisQuery(sourceName: string) {
  return [
    `请只检索并分析名为“${sourceName}”的这一份资料，不要引用其他资料。`,
    "请只返回一个 JSON 对象，不要使用 Markdown，也不要补充证据片段之外的事实。",
    "JSON 必须只包含 content_summary、key_points、source_evidence、uncertainties 四个数组。",
    "每个数组项格式为 {\"text\":\"结论\",\"sources\":[{\"quote\":\"逐字复制的原文短句\"}]}。",
    "前三个数组的每条结论必须至少提供一段能够在返回证据中逐字找到的 quote；找不到时不要输出。",
    "uncertainties 可以没有 quote，但没有时必须增加 \"basis\":\"综合判断\"。",
  ].join("\n");
}

export function readStoredSingleSourceAnalysis(value: unknown): TextAnalysisResult | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const trustedCorpus = ANALYSIS_SECTION_KEYS.flatMap((key) => {
    const items = record[key];
    if (!Array.isArray(items)) return [];
    return items.flatMap((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];
      const sources = (item as Record<string, unknown>).sources;
      if (!Array.isArray(sources)) return [];
      return sources.flatMap((source) => {
        if (!source || typeof source !== "object" || Array.isArray(source)) return [];
        const excerpt = source as Record<string, unknown>;
        const quote = typeof excerpt.quote === "string" ? excerpt.quote.trim() : "";
        if (!quote) return [];
        const before = typeof excerpt.context_before === "string" ? excerpt.context_before : "";
        const after = typeof excerpt.context_after === "string" ? excerpt.context_after : "";
        return [`${before}${quote}${after}`];
      });
    });
  }).join("\n".repeat(120));
  const result = parseTextAnalysisResult(value, trustedCorpus);
  return hasReliableAnalysis(result) ? result : null;
}

export async function analyzeSingleSource(input: {
  userId: string;
  sourceKind: "FILE" | "TEXT";
  sourceName: string;
  sourceText: string | null;
  files?: HiAgentFile[];
  dependencies: SingleSourceAnalysisDependencies;
}): Promise<{ result: TextAnalysisResult; contextText: string; status: "READY" | "PARTIAL" }> {
  if (input.sourceKind === "TEXT") {
    const sourceText = input.sourceText?.trim() ?? "";
    if (!sourceText) throw new Error("SOURCE_TEXT_MISSING");
    const analyzed = await analyzeTextSourceContent({
      userId: input.userId,
      text: sourceText,
      dependencies: {
        createConversation: input.dependencies.createConversation,
        analyze: async (request) => (await input.dependencies.analyze(request)).answer,
      },
    });
    return { result: analyzed.result, contextText: sourceText, status: analyzed.status };
  }

  const conversationId = await input.dependencies.createConversation(input.userId);
  const response = await input.dependencies.analyze({
    userId: input.userId,
    conversationId,
    query: buildFileAnalysisQuery(input.sourceName),
    files: input.files,
  });
  const contextText = response.evidenceCards
    .filter((card) => card.document_name === input.sourceName)
    .map((card) => card.evidence_text.trim())
    .filter(Boolean)
    .join("\n\n");
  const result = parseTextAnalysisResult(response.answer, contextText);
  if (!contextText || !hasReliableAnalysis(result)) {
    throw new Error("SOURCE_ANALYSIS_NO_RELIABLE_RESULT");
  }
  return { result, contextText, status: "READY" as const };
}
