import { afterEach, describe, expect, it } from "vitest";

import { getUploadLimitBytes, validateDocumentFile } from "../../src/lib/documents";

describe("document upload limit", () => {
  afterEach(() => delete process.env.NEXT_PUBLIC_MAX_UPLOAD_MB);

  it("defaults to 500MB", () => {
    delete process.env.NEXT_PUBLIC_MAX_UPLOAD_MB;
    expect(getUploadLimitBytes()).toBe(500 * 1024 * 1024);
  });

  it("rejects a file above 500MB with actionable copy", () => {
    const file = new File(["x"], "large.pdf", { type: "application/pdf" });
    Object.defineProperty(file, "size", { value: 500 * 1024 * 1024 + 1 });

    expect(validateDocumentFile(file)).toEqual({
      ok: false,
      error: "单个文件不能超过 500MB，请压缩或拆分后重试。",
    });
  });
});
