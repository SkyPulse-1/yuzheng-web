import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const documentManager = readFileSync(fileURLToPath(new URL("../../src/components/documents/document-manager.tsx", import.meta.url)), "utf8");
const assistantWorkspace = readFileSync(fileURLToPath(new URL("../../src/components/assistant/assistant-workspace.tsx", import.meta.url)), "utf8");
const userInterfaceSource = `${documentManager}\n${assistantWorkspace}`;

describe("document status copy", () => {
  it("labels stored documents accurately", () => {
    expect(documentManager).toContain('STORED: { label: "已保存"');
    expect(documentManager).toContain("文件已安全保存。学校文档处理服务接通后，可继续生成证据卡。");
  });

  it("explains why the assistant is unavailable", () => {
    expect(assistantWorkspace).toContain("当前知识库还没有可分析的文档。");
  });

  it.each(["Viking", "火山", "提示词", "owner_id", "API Key"])("does not show internal term %s", (term) => {
    expect(userInterfaceSource).not.toContain(term);
  });
});
