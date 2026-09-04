import type { EvidenceCard } from "./hiagent/client";

export const QUESTION_PAGE_SIZE = 12;

export type QuestionStatus = "PROCESSING" | "COMPLETED" | "FAILED";

export type QuestionConversationRow = {
  id: string;
  title: string;
  status: QuestionStatus;
  selected_document_ids: string[] | null;
  source_scope_count: number | null;
  source_warning: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export type QuestionMessageRow = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  evidence_cards_json: unknown;
  created_at: string;
};

export type QuestionCard = {
  id: string;
  question: string;
  status: QuestionStatus;
  answer: string;
  evidenceCards: EvidenceCard[];
  evidenceCount: number;
  selectedDocumentIds: string[];
  sourceCount: number;
  sourceWarning: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

export function splitQuestionAnswer(answer: string): string[] {
  return answer
    .split(/\r?\n+/)
    .map((line) => line.trim().replace(/^(?:#{1,6}\s*|[-*•]\s+|\d+[.)、]\s*)/, "").trim())
    .filter(Boolean);
}

function readEvidenceCards(value: unknown): EvidenceCard[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const card = entry as Partial<EvidenceCard>;
    if (typeof card.claim !== "string" || typeof card.evidence_text !== "string" || typeof card.document_name !== "string") return [];
    return [{
      ...card,
      card_id: typeof card.card_id === "string" ? card.card_id : `evidence-${index + 1}`,
      claim: card.claim,
      evidence_text: card.evidence_text,
      document_name: card.document_name,
      page_number: typeof card.page_number === "number" ? card.page_number : null,
    }];
  });
}

export function buildQuestionCards(conversations: QuestionConversationRow[], messages: QuestionMessageRow[]): QuestionCard[] {
  const grouped = new Map<string, QuestionMessageRow[]>();
  for (const message of messages) {
    const current = grouped.get(message.conversation_id) ?? [];
    current.push(message);
    grouped.set(message.conversation_id, current);
  }

  return conversations.map((conversation) => {
    const conversationMessages = (grouped.get(conversation.id) ?? [])
      .slice()
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    const assistant = conversationMessages.filter((message) => message.role === "assistant").at(-1);
    const evidenceCards = readEvidenceCards(assistant?.evidence_cards_json);
    const selectedDocumentIds = Array.isArray(conversation.selected_document_ids)
      ? conversation.selected_document_ids
      : [];
    return {
      id: conversation.id,
      question: conversation.title,
      status: conversation.status,
      answer: assistant?.content ?? "",
      evidenceCards,
      evidenceCount: evidenceCards.length,
      selectedDocumentIds,
      sourceCount: conversation.source_scope_count ?? selectedDocumentIds.length,
      sourceWarning: conversation.source_warning,
      error: conversation.last_error,
      createdAt: conversation.created_at,
      updatedAt: conversation.updated_at,
    };
  });
}

export function formatQuestionTime(value: string, locale = "zh-CN") {
  return new Intl.DateTimeFormat(locale, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
