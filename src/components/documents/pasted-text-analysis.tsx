import type { LibraryDocument } from "../../lib/documents";
import { TextSourceManager } from "./text-source-manager";

export function PastedTextAnalysis({ libraryId, sources = [] }: { libraryId: string; sources?: LibraryDocument[] }) {
  return <TextSourceManager libraryId={libraryId} sources={sources} />;
}
