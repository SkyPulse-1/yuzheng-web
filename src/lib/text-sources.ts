export const PASTED_TEXT_LIMIT = 30_000;
export const TEXT_SOURCE_TITLE_LIMIT = 120;

export type TextSourceInput = {
  title: string;
  content: string;
};

export type TextSourceValidation =
  | { ok: true; data: TextSourceInput }
  | { ok: false; error: string };

export function validateTextSourceInput(value: unknown): TextSourceValidation {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "文字资料内容无效。" };
  }

  const input = value as Record<string, unknown>;
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const content = typeof input.content === "string" ? input.content.trim() : "";

  if (!title || title.length > TEXT_SOURCE_TITLE_LIMIT) {
    return { ok: false, error: `标题需为 1–${TEXT_SOURCE_TITLE_LIMIT} 个字符。` };
  }
  if (!content) return { ok: false, error: "请输入需要保存的文字内容。" };
  if (content.length > PASTED_TEXT_LIMIT) {
    return { ok: false, error: `文字资料不能超过 ${PASTED_TEXT_LIMIT} 个字符，请按章节拆分。` };
  }

  return { ok: true, data: { title, content } };
}

export function estimateAnalysisMinutes(characterCount: number) {
  if (characterCount <= 6_000) return 1;
  if (characterCount <= 15_000) return 2;
  return 3;
}

export function daysUntilPurge(purgeAfter: string, now = new Date()) {
  const milliseconds = new Date(purgeAfter).getTime() - now.getTime();
  return Math.max(0, Math.ceil(milliseconds / 86_400_000));
}
