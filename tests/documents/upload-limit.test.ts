import { describe, expect, it } from "vitest";

import { getUploadLimitBytes, validateDocumentFile } from "../../src/lib/documents";

describe("document upload limit", () => {
  it("uses HiAgent's limit for each supported type", () => {
    expect(getUploadLimitBytes("pdf")).toBe(100 * 1024 * 1024);
    expect(getUploadLimitBytes("docx")).toBe(50 * 1024 * 1024);
    expect(getUploadLimitBytes("txt")).toBe(30 * 1024 * 1024);
  });

  it.each([
    ["paper.pdf", "application/pdf", 100, "PDF"],
    ["paper.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 50, "DOCX"],
    ["notes.txt", "text/plain", 30, "TXT"],
  ])("accepts %s at its limit and rejects one extra byte", (name, mime, maxMb, label) => {
    const accepted = new File(["x"], name, { type: mime });
    Object.defineProperty(accepted, "size", { value: maxMb * 1024 * 1024 });
    expect(validateDocumentFile(accepted)).toEqual({
      ok: true,
      extension: name.split(".").pop(),
      maxMb,
    });

    const rejected = new File(["x"], name, { type: mime });
    Object.defineProperty(rejected, "size", { value: maxMb * 1024 * 1024 + 1 });
    expect(validateDocumentFile(rejected)).toEqual({
      ok: false,
      error: `${label} 文件不能超过 ${maxMb}MB，请压缩或拆分后重试。`,
    });
  });
});
