import type { EvidenceCard } from "@/lib/hiagent/client";
import { splitQuestionAnswer } from "./questions";

type EvidenceViewRow = { card_json?: unknown };

export type HomeResearchWorkspace = {
  libraryId: string;
  libraryName: string;
  workspaceHref: string;
  question: string;
  answerSummary: string | null;
  updatedAt: string;
  card: EvidenceCard | null;
  sourceHref: string | null;
};

type HomeConversationRow = {
  id: string;
  library_id: string;
  title: string;
  status: string;
  updated_at: string;
};

type HomeMessageRow = {
  conversation_id: string;
  content: string | null;
  evidence_cards_json: unknown;
  created_at: string;
};

type HomeLibraryRow = { id: string; name: string };
type HomeDocumentRow = {
  id: string;
  library_id: string;
  original_name: string;
  deleted_at?: string | null;
};

export function parseEvidenceCardSnapshot(value: unknown): EvidenceCard | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.card_id !== "string"
    || typeof record.claim !== "string"
    || typeof record.evidence_text !== "string"
    || typeof record.document_name !== "string"
    || !(typeof record.page_number === "number" || record.page_number === null)
  ) return null;

  const card: EvidenceCard = {
    card_id: record.card_id,
    claim: record.claim,
    evidence_text: record.evidence_text,
    document_name: record.document_name,
    page_number: record.page_number,
  };
  if (typeof record.claim_type === "string") card.claim_type = record.claim_type;
  if (typeof record.document_id === "string") card.document_id = record.document_id;
  return card;
}

export function parseRecentEvidenceRows(rows: EvidenceViewRow[] | null | undefined) {
  return (rows ?? [])
    .flatMap((row) => {
      const card = parseEvidenceCardSnapshot(row.card_json);
      return card ? [card] : [];
    })
    .slice(0, 3);
}

function buildSourceHref(documentId: string, pageNumber: number | null) {
  const page = typeof pageNumber === "number" && Number.isInteger(pageNumber) && pageNumber > 0
    ? `?page=${pageNumber}`
    : "";
  return `/api/documents/${documentId}/file${page}`;
}

export function summarizeRecentAnswer(content: string | null | undefined, maxLength = 180) {
  const normalized = splitQuestionAnswer(content ?? "").join(" ").replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function buildRecentResearchWorkspaces(input: {
  conversations: HomeConversationRow[];
  messages: HomeMessageRow[];
  libraries: HomeLibraryRow[];
  documents: HomeDocumentRow[];
}): HomeResearchWorkspace[] {
  const libraries = new Map(input.libraries.map((library) => [library.id, library]));
  const documents = new Map(
    input.documents
      .filter((document) => !document.deleted_at)
      .map((document) => [document.id, document]),
  );
  const messages = new Map<string, HomeMessageRow>();
  for (const message of input.messages) {
    const current = messages.get(message.conversation_id);
    if (!current || current.created_at.localeCompare(message.created_at) < 0) {
      messages.set(message.conversation_id, message);
    }
  }

  const results: HomeResearchWorkspace[] = [];
  const seenLibraries = new Set<string>();
  const conversations = input.conversations
    .filter((conversation) => conversation.status === "COMPLETED")
    .slice()
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  for (const conversation of conversations) {
    if (results.length >= 3) break;
    if (seenLibraries.has(conversation.library_id)) continue;
    const library = libraries.get(conversation.library_id);
    if (!library) continue;
    seenLibraries.add(conversation.library_id);

    const message = messages.get(conversation.id);
    const rawCards = Array.isArray(message?.evidence_cards_json) ? message.evidence_cards_json : [];
    let trustedCard: EvidenceCard | null = null;
    for (const rawCard of rawCards) {
      const card = parseEvidenceCardSnapshot(rawCard);
      if (!card?.document_id) continue;
      const document = documents.get(card.document_id);
      if (!document || document.library_id !== conversation.library_id) continue;
      trustedCard = { ...card, document_name: document.original_name };
      break;
    }

    results.push({
      libraryId: library.id,
      libraryName: library.name,
      workspaceHref: `/assistant?libraryId=${encodeURIComponent(library.id)}`,
      question: conversation.title,
      answerSummary: summarizeRecentAnswer(message?.content),
      updatedAt: conversation.updated_at,
      card: trustedCard,
      sourceHref: trustedCard?.document_id
        ? buildSourceHref(trustedCard.document_id, trustedCard.page_number)
        : null,
    });
  }

  return results;
}
