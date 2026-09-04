import { createHash } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildUpUploadRequest,
  getUpConfig,
  isUpUploadConfigured,
  uploadFileToUp,
} from "../../src/lib/hiagent/up-upload";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("HiAgent up-upload client", () => {
  it("reports configuration from the expected server-only variables", () => {
    vi.stubEnv("HIAGENT_UP_UPLOAD_ENDPOINT", "school.internal:31010");
    vi.stubEnv("VOLCENGINE_ACCESS_KEY_ID", "test-ak");
    vi.stubEnv("VOLCENGINE_SECRET_ACCESS_KEY", "test-sk");

    expect(isUpUploadConfigured()).toBe(true);
    expect(getUpConfig()).toMatchObject({
      origin: "http://school.internal:31010",
      host: "school.internal:31010",
    });
  });

  it("builds a signed UploadRaw request with the file hash", () => {
    const content = Buffer.from("hello evidence", "utf8");
    const fileHash = sha256("hello evidence");
    const request = buildUpUploadRequest({
      config: {
        origin: "http://school.internal:31010",
        host: "school.internal:31010",
        accessKeyId: "test-ak",
        secretAccessKey: "test-sk",
      },
      id: "fixed-id",
      content,
      contentType: "text/plain",
      now: new Date("2026-09-02T08:00:00.000Z"),
    });

    expect(request.url).toContain("http://school.internal:31010/up?");
    expect(request.url).toContain("Action=UploadRaw");
    expect(request.url).toContain("Version=2022-01-01");
    expect(request.url).toContain("ContentType=text%2Fplain");
    expect(request.url).toContain("Id=fixed-id");
    expect(request.sha256).toBe(fileHash);
    expect(request.headers["X-Content-Sha256"]).toBe(fileHash);
    expect(request.headers.Authorization).toMatch(/^HMAC-SHA256 Credential=test-ak\/20260902\/cn-north-1\/up\/request,/);
  });

  it("uploads a raw file and parses the returned path", async () => {
    vi.stubEnv("HIAGENT_UP_UPLOAD_ENDPOINT", "school.internal:31010");
    vi.stubEnv("VOLCENGINE_ACCESS_KEY_ID", "test-ak");
    vi.stubEnv("VOLCENGINE_SECRET_ACCESS_KEY", "test-sk");

    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({
        Result: {
          Path: "upload/full/ab/cd/file-hash",
          Size: 13,
          Sha256: sha256("hello evidence"),
          ShortLink: "abc123",
          PresignKey: "xyz456",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));
    vi.stubGlobal("fetch", fetchMock);

    await expect(uploadFileToUp({
      content: Buffer.from("hello evidence", "utf8"),
      contentType: "text/plain",
    })).resolves.toEqual({
      path: "upload/full/ab/cd/file-hash",
      size: 13,
      sha256: sha256("hello evidence"),
      shortLink: "abc123",
      presignKey: "xyz456",
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("Action=UploadRaw");
    expect(init.headers).toMatchObject({ "Content-Type": "text/plain" });
  });
});
