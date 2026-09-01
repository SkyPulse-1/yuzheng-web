export type EvidenceCard = {
  card_id: string;
  card_role?: "DIFFERENCE" | "SHARED_SUPPORT";
  dimension?: string;
  claim: string;
  claim_type?: string;
  evidence_status?: "SUPPORTED";
  evidence_text: string;
  document_name: string;
  page_number: number | null;
  segment_id?: string;
  rects?: number[];
  retrieval_score?: number | null;
  document_id?: string;
};

export type HiAgentResult = { answer: string; evidenceCards: EvidenceCard[] };

function getTransportConfig() {
  const baseUrl = process.env.HIAGENT_BASE_URL?.replace(/\/$/, "");
  const apiKey = process.env.HIAGENT_API_KEY?.trim();
  if (!baseUrl || !apiKey) return null;
  return {
    baseUrl,
    apiKey,
    createConversationPath: process.env.HIAGENT_CREATE_CONVERSATION_PATH?.trim() || "/create_conversation",
    chatPath: process.env.HIAGENT_CHAT_PATH?.trim() || "/chat_query_v2",
  };
}

export function isHiAgentConfigured() {
  return getTransportConfig() !== null && process.env.HIAGENT_TRUSTED_FILTERS_ENABLED === "true";
}

export function isHiAgentTransportConfigured() {
  return getTransportConfig() !== null;
}

function extractOutput(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  return record.output ?? record.Output ?? record.result ?? record.Result ?? (record.data && extractOutput(record.data)) ?? value;
}

export function parseHiAgentOutput(value: unknown): HiAgentResult {
  let output = extractOutput(value);
  if (typeof output === "string") {
    const outputText = output;
    try { output = JSON.parse(outputText); } catch { return { answer: outputText, evidenceCards: [] }; }
  }
  const record = output && typeof output === "object" ? output as Record<string, unknown> : {};
  const answer = typeof record.answer === "string" ? record.answer : "";
  let rawCards: unknown = record.evidence_cards ?? record.evidenceCards ?? [];
  if (typeof rawCards === "string") {
    try { rawCards = JSON.parse(rawCards); } catch { rawCards = []; }
  }
  const evidenceCards = Array.isArray(rawCards) ? rawCards.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const card = item as Record<string, unknown>;
    if (typeof card.claim !== "string" || typeof card.evidence_text !== "string" || typeof card.document_name !== "string") return [];
    return [{
      ...card,
      card_id: typeof card.card_id === "string" ? card.card_id : `E${index + 1}`,
      claim: card.claim,
      evidence_text: card.evidence_text,
      document_name: card.document_name,
      page_number: typeof card.page_number === "number" ? card.page_number : null,
    } as EvidenceCard];
  }) : [];
  return { answer, evidenceCards };
}

function parseEventData(data: string): unknown {
  try { return JSON.parse(data); } catch { return data; }
}

function eventName(value: Record<string, unknown>) {
  return String(value.event ?? value.Event ?? value.event_type ?? value.EventType ?? "").toLowerCase();
}

export function parseHiAgentSse(text: string): HiAgentResult {
  const chunks: string[] = [];
  let structured: HiAgentResult | null = null;

  for (const block of text.split(/\r?\n\r?\n/)) {
    const declaredEvent = block
      .split(/\r?\n/)
      .find((line) => line.startsWith("event:"))
      ?.slice(6)
      .trim()
      .toLowerCase() ?? "";
    const data = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (!data || data === "[DONE]") continue;

    const payload = parseEventData(data);
    if (typeof payload === "string") {
      chunks.push(payload);
      continue;
    }
    if (!payload || typeof payload !== "object") continue;
    const record = payload as Record<string, unknown>;
    const parsed = parseHiAgentOutput(record);
    if (parsed.evidenceCards.length || record.output !== undefined || record.Output !== undefined) structured = parsed;
    const event = declaredEvent || eventName(record);
    if (["message", "text"].includes(event) && parsed.answer) chunks.push(parsed.answer);
  }

  if (structured && (structured.answer || structured.evidenceCards.length)) return structured;
  return { answer: chunks.join(""), evidenceCards: [] };
}

function requestHeaders(apiKey: string) {
  return { "Content-Type": "application/json", ApiKey: apiKey };
}

export async function createHiAgentConversation(input: { userId: string; inputs?: Record<string, unknown> }): Promise<string> {
  const config = getTransportConfig();
  if (!config) throw new Error("HIAGENT_NOT_CONFIGURED");
  const response = await fetch(`${config.baseUrl}${config.createConversationPath}`, {
    method: "POST",
    headers: requestHeaders(config.apiKey),
    body: JSON.stringify(input.inputs ? { UserID: input.userId, Inputs: input.inputs } : { UserID: input.userId }),
    signal: AbortSignal.timeout(60000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("HIAGENT_CREATE_CONVERSATION_FAILED");
  const result = await response.json().catch(() => ({})) as Record<string, unknown>;
  const nested = result.data && typeof result.data === "object" ? result.data as Record<string, unknown> : {};
  const conversation = result.Conversation && typeof result.Conversation === "object"
    ? result.Conversation as Record<string, unknown>
    : {};
  const conversationId = result.AppConversationID ?? result.appConversationId ?? result.ConversationID
    ?? conversation.AppConversationID ?? conversation.appConversationId ?? conversation.ConversationID
    ?? nested.AppConversationID ?? nested.appConversationId ?? nested.ConversationID;
  if (typeof conversationId !== "string" || !conversationId) throw new Error("HIAGENT_INVALID_CONVERSATION");
  return conversationId;
}

export async function chatWithHiAgent(input: {
  userId: string;
  conversationId: string;
  query: string;
}): Promise<HiAgentResult> {
  const config = getTransportConfig();
  if (!config) throw new Error("HIAGENT_NOT_CONFIGURED");
  const response = await fetch(`${config.baseUrl}${config.chatPath}`, {
    method: "POST",
    headers: requestHeaders(config.apiKey),
    body: JSON.stringify({
      UserID: input.userId,
      AppConversationID: input.conversationId,
      Query: input.query,
      ResponseMode: "streaming",
    }),
    signal: AbortSignal.timeout(120000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("HIAGENT_CHAT_FAILED");
  const text = await response.text();
  const contentType = response.headers.get("content-type") ?? "";
  const result = contentType.includes("text/event-stream") || /^data:/m.test(text)
    ? parseHiAgentSse(text)
    : parseHiAgentOutput(parseEventData(text));
  if (!result.answer && !result.evidenceCards.length) throw new Error("HIAGENT_EMPTY_RESPONSE");
  return result;
}
