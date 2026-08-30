import { describe, expect, it } from "vitest";

import {
  digestRecoveryCode,
  generateRecoveryCode,
  openRecoveryDelivery,
  recoveryCodeMatches,
  sealRecoveryDelivery,
} from "../../src/lib/auth/recovery";

describe("recovery codes", () => {
  it("generates four readable groups", () => {
    expect(generateRecoveryCode()).toMatch(/^[A-HJ-NP-Z2-9]{5}(?:-[A-HJ-NP-Z2-9]{5}){3}$/);
  });

  it("matches after case, space, and dash normalization", () => {
    const secret = "r".repeat(32);
    const digest = digestRecoveryCode("ABCDE-FGHIJ-KLMNP-QRSTU", secret);
    expect(recoveryCodeMatches("abcde fghij klmnp qrstu", digest, secret)).toBe(true);
    expect(recoveryCodeMatches("XXXXX-FGHIJ-KLMNP-QRSTU", digest, secret)).toBe(false);
  });

  it("seals and opens a one-time delivery payload", () => {
    const secret = "d".repeat(32);
    const payload = sealRecoveryDelivery("ABCDE-FGHIJ-KLMNP-QRSTU", secret);
    expect(payload).not.toContain("ABCDE");
    expect(openRecoveryDelivery(payload, secret)).toBe("ABCDE-FGHIJ-KLMNP-QRSTU");
  });

  it("rejects a tampered delivery payload", () => {
    const secret = "d".repeat(32);
    const payload = sealRecoveryDelivery("ABCDE-FGHIJ-KLMNP-QRSTU", secret);
    expect(openRecoveryDelivery(`${payload.slice(0, -1)}x`, secret)).toBeNull();
  });
});
