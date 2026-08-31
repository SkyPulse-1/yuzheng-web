import { describe, expect, it } from "vitest";

import { buildStoragePath, getResumableStorageEndpoint, splitStoragePath } from "../../src/lib/uploads/paths";

describe("document upload flow", () => {
  it("builds a storage path from server-owned identifiers", () => {
    expect(buildStoragePath({
      ownerId: "owner-1",
      libraryId: "library-1",
      documentId: "document-1",
      extension: "pdf",
    })).toBe("owner-1/library-1/document-1.pdf");
  });

  it("splits a storage path for object verification", () => {
    expect(splitStoragePath("owner-1/library-1/document-1.pdf")).toEqual({
      directory: "owner-1/library-1",
      filename: "document-1.pdf",
    });
  });

  it("uses Supabase's direct storage hostname for resumable uploads", () => {
    expect(getResumableStorageEndpoint("https://project-ref.supabase.co")).toBe(
      "https://project-ref.storage.supabase.co/storage/v1/upload/resumable",
    );
  });
});
