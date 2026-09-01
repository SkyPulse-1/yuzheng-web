import { describe, expect, it } from "vitest";

import { isAssistantSourceAvailable } from "../../src/lib/assistant-sources";

describe("assistant source availability", () => {
  it("accepts saved text sources and only ready uploaded files", () => {
    expect(isAssistantSourceAvailable({ source_kind: "TEXT", status: "STORED" })).toBe(true);
    expect(isAssistantSourceAvailable({ source_kind: "TEXT", status: "READY" })).toBe(true);
    expect(isAssistantSourceAvailable({ source_kind: "FILE", status: "READY" })).toBe(true);
    expect(isAssistantSourceAvailable({ source_kind: "FILE", status: "STORED" })).toBe(false);
    expect(isAssistantSourceAvailable({ source_kind: "FILE", status: "PROCESSING" })).toBe(false);
  });
});
