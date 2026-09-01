import { describe, expect, it } from "vitest";

import { filterAssistantSources, isAssistantSourceAvailable } from "../../src/lib/assistant-sources";

describe("assistant source availability", () => {
  it("accepts saved text sources and only ready uploaded files", () => {
    expect(isAssistantSourceAvailable({ source_kind: "TEXT", status: "STORED" })).toBe(true);
    expect(isAssistantSourceAvailable({ source_kind: "TEXT", status: "READY" })).toBe(true);
    expect(isAssistantSourceAvailable({ source_kind: "FILE", status: "READY" })).toBe(true);
    expect(isAssistantSourceAvailable({ source_kind: "FILE", status: "STORED" })).toBe(false);
    expect(isAssistantSourceAvailable({ source_kind: "FILE", status: "PROCESSING" })).toBe(false);
  });

  it("keeps saved text and ready files when building a question scope", () => {
    const sources = [
      { id: "text-stored", source_kind: "TEXT", status: "STORED" },
      { id: "file-ready", source_kind: "FILE", status: "READY" },
      { id: "file-stored", source_kind: "FILE", status: "STORED" },
    ];

    expect(filterAssistantSources(sources).map((source) => source.id)).toEqual([
      "text-stored",
      "file-ready",
    ]);
  });
});
