import { PASTED_TEXT_LIMIT } from "./text-analysis-constants";
import {
  hasReliableAnalysis,
  mergeAnalysisResults,
  parseTextAnalysisResult,
  type TextAnalysisResult,
} from "./analysis-results";

export { PASTED_TEXT_LIMIT } from "./text-analysis-constants";

export type TextAnalysisRequestInput = {
  userId?: string;
  body: unknown;
};

export type TextAnalysisDependencies = {
  libraryExists: (libraryId: string) => Promise<boolean>;
  isHiAgentConfigured: () => boolean;
  createConversation: (userId: string) => Promise<string>;
  analyze: (input: { userId: string; conversationId: string; query: string }) => Promise<string>;
};

export type TextAnalysisResponse = {
  status: 200 | 400 | 401 | 404 | 502 | 503;
  body: { answer?: string; error?: string };
};

function readBody(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { libraryId: "", text: "" };
  const input = body as Record<string, unknown>;
  return {
    libraryId: typeof input.libraryId === "string" ? input.libraryId.trim() : "",
    text: typeof input.text === "string" ? input.text.trim() : "",
  };
}

function buildAnalysisQuery(text: string) {
  return [
    "请仅根据下方用户提供的原文进行分析，不要补充原文以外的事实。",
    "请按以下结构清晰回答：",
    "1. 内容摘要",
    "2. 关键观点",
    "3. 可核验的原文依据",
    "4. 信息不足或歧义",
    "若某一部分没有足够内容，请直接说明，不要猜测。",
    "",
    "【原文开始】",
    text,
    "【原文结束】",
  ].join("\n");
}

const FORMAL_ANALYSIS_CHUNK_SIZE = 9_000;

export function splitTextForAnalysis(text: string, maxLength = FORMAL_ANALYSIS_CHUNK_SIZE) {
  if (maxLength < 1) throw new Error("INVALID_CHUNK_SIZE");
  const chunks: string[] = [];
  let offset = 0;
  while (offset < text.length) {
    const remaining = text.length - offset;
    if (remaining <= maxLength) {
      chunks.push(text.slice(offset));
      break;
    }
    const window = text.slice(offset, offset + maxLength);
    const paragraphBoundary = window.lastIndexOf("\n\n");
    const lineBoundary = window.lastIndexOf("\n");
    const safeBoundary = paragraphBoundary >= Math.floor(maxLength * 0.55)
      ? paragraphBoundary + 2
      : lineBoundary >= Math.floor(maxLength * 0.7)
        ? lineBoundary + 1
        : maxLength;
    chunks.push(text.slice(offset, offset + safeBoundary));
    offset += safeBoundary;
  }
  return chunks;
}

function buildStructuredAnalysisQuery(text: string, index: number, total: number) {
  return [
    "请只根据【原文】返回一个 JSON 对象，不要使用 Markdown，不要补充原文之外的事实。",
    "JSON 必须只包含 content_summary、key_points、source_evidence、uncertainties 四个数组。",
    "每个数组项格式为 {\"text\":\"结论\",\"sources\":[{\"quote\":\"从原文逐字复制的短句\",\"context_before\":\"可选上文\",\"context_after\":\"可选下文\"}]}。",
    "前三个数组的每条结论必须至少提供一段逐字复制的 quote；不能找到原句时不要输出该结论。",
    "uncertainties 可以没有 quote，但没有时必须增加 \"basis\":\"综合判断\"。",
    `这是第 ${index + 1}/${total} 段。`,
    "【原文】",
    text,
    "【原文结束】",
  ].join("\n");
}

export type FormalTextAnalysisDependencies = {
  createConversation: (userId: string) => Promise<string>;
  analyze: (input: { userId: string; conversationId: string; query: string }) => Promise<string>;
};

export async function analyzeTextSourceContent(input: {
  userId: string;
  text: string;
  chunkSize?: number;
  dependencies: FormalTextAnalysisDependencies;
}): Promise<{
  result: TextAnalysisResult;
  status: "READY" | "PARTIAL";
  failedChunks: number;
}> {
  const chunks = splitTextForAnalysis(input.text, input.chunkSize);
  const conversationId = await input.dependencies.createConversation(input.userId);
  const results: TextAnalysisResult[] = [];
  let failedChunks = 0;

  for (let index = 0; index < chunks.length; index += 1) {
    try {
      const answer = await input.dependencies.analyze({
        userId: input.userId,
        conversationId,
        query: buildStructuredAnalysisQuery(chunks[index], index, chunks.length),
      });
      const parsed = parseTextAnalysisResult(answer, chunks[index]);
      if (hasReliableAnalysis(parsed)) results.push(parsed);
      else failedChunks += 1;
    } catch {
      failedChunks += 1;
    }
  }

  const result = mergeAnalysisResults(results);
  if (!hasReliableAnalysis(result)) throw new Error("TEXT_ANALYSIS_NO_RELIABLE_RESULT");
  return { result, status: failedChunks ? "PARTIAL" : "READY", failedChunks };
}

export async function analyzePastedTextRequest(
  input: TextAnalysisRequestInput,
  dependencies: TextAnalysisDependencies,
): Promise<TextAnalysisResponse> {
  if (!input.userId) return { status: 401, body: { error: "请先登录。" } };

  const { libraryId, text } = readBody(input.body);
  if (!libraryId) return { status: 400, body: { error: "请选择有效的知识库。" } };
  if (!text) return { status: 400, body: { error: "请输入需要分析的文字。" } };
  if (text.length > PASTED_TEXT_LIMIT) {
    return { status: 400, body: { error: `文字不能超过 ${PASTED_TEXT_LIMIT} 个字符。` } };
  }

  if (!(await dependencies.libraryExists(libraryId))) {
    return { status: 404, body: { error: "知识库不存在。" } };
  }
  if (!dependencies.isHiAgentConfigured()) {
    return { status: 503, body: { error: "文字分析功能尚未配置完成，请稍后再试。" } };
  }

  try {
    const conversationId = await dependencies.createConversation(input.userId);
    const answer = (await dependencies.analyze({
      userId: input.userId,
      conversationId,
      query: buildAnalysisQuery(text),
    })).trim();
    if (!answer) throw new Error("EMPTY_ANALYSIS");
    return { status: 200, body: { answer } };
  } catch {
    return { status: 502, body: { error: "文字分析暂时失败或超时，请重试。" } };
  }
}
