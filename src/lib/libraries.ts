export type Library = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type LibraryInput = {
  name: string;
  description: string | null;
};

export function validateLibraryInput(value: unknown):
  | { ok: true; data: LibraryInput }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object") {
    return { ok: false, error: "请求内容无效。" };
  }

  const input = value as Record<string, unknown>;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const rawDescription = typeof input.description === "string" ? input.description.trim() : "";

  if (name.length < 1 || name.length > 50) {
    return { ok: false, error: "知识库名称需为 1–50 个字符。" };
  }

  if (rawDescription.length > 200) {
    return { ok: false, error: "知识库描述不能超过 200 个字符。" };
  }

  return {
    ok: true,
    data: { name, description: rawDescription || null },
  };
}
