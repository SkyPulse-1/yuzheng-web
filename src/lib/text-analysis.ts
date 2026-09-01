import { PASTED_TEXT_LIMIT } from "./text-analysis-constants";

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
