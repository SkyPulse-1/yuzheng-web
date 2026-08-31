import type { EvidenceCard } from "@/lib/hiagent/client";

type EvidenceViewRow = { card_json?: unknown };

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
