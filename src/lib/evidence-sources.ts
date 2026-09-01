import type { EvidenceCard } from "./hiagent/client";

type EvidenceSourceDocument = { id: string; original_name: string };

export function attachUniqueDocumentIds(
  cards: EvidenceCard[],
  documents: EvidenceSourceDocument[],
): EvidenceCard[] {
  const idsByName = new Map<string, string[]>();
  for (const document of documents) {
    const ids = idsByName.get(document.original_name) ?? [];
    ids.push(document.id);
    idsByName.set(document.original_name, ids);
  }

  return cards.map((card) => {
    const { document_id: _discardedDocumentId, ...trustedCard } = card;
    const matches = idsByName.get(card.document_name) ?? [];
    return matches.length === 1
      ? { ...trustedCard, document_id: matches[0] }
      : trustedCard;
  });
}

export function createInlineTextResponse(content: string, originalName: string) {
  return new Response(content, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(originalName)}`,
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
