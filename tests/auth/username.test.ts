import { describe, expect, it } from "vitest";

import { deriveInternalEmail, validateUsername } from "../../src/lib/auth/username";

describe("username authentication", () => {
  it("normalizes case and surrounding spaces", () => {
    expect(validateUsername("  SkyPulse_1 ")).toEqual({ ok: true, username: "skypulse_1" });
  });

  it.each(["ab", "a-b", "用户名", "a".repeat(25)])("rejects invalid username %s", (value) => {
    expect(validateUsername(value).ok).toBe(false);
  });

  it("derives the same hidden identity for equivalent usernames", () => {
    const secret = "s".repeat(32);
    expect(deriveInternalEmail("SkyPulse_1", secret)).toBe(deriveInternalEmail("skypulse_1", secret));
  });

  it("does not reveal the username in the hidden identity", () => {
    expect(deriveInternalEmail("skypulse_1", "s".repeat(32))).toMatch(/^u_[a-f0-9]{64}@auth\.yuzheng\.invalid$/);
  });
});
