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
};

type HiAgentResult = { answer: string; evidenceCards: EvidenceCard[] };

function getConfig() {
  const baseUrl = process.env.HIAGENT_BASE_URL?.replace(/\/$/, "");
  const appId = process.env.HIAGENT_APP_ID?.trim();
  const apiKey = process.env.HIAGENT_API_KEY?.trim();
  const trusted = process.env.HIAGENT_TRUSTED_FILTERS_ENABLED === "true";
  if (!baseUrl || !appId || !apiKey || !trusted) return null;
  return {
    baseUrl,
    appId,
    apiKey,
    runPath: process.env.HIAGENT_RUN_PATH?.trim() || "/run_app_workflow",
    queryPath: process.env.HIAGENT_QUERY_PATH?.trim() || "/query_app_workflow",
  };
}

export function isHiAgentConfigured() {
  return getConfig() !== null;
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

export async function callHiAgent(input: {
  userId: string;
  query: string;
  ownerId: string;
  libraryId: string;
  selectedDocuments: string[];
}): Promise<HiAgentResult> {
  const config = getConfig();
  if (!config) throw new Error("HIAGENT_NOT_CONFIGURED");
  const headers = { "Content-Type": "application/json", ApiKey: config.apiKey };
  const runResponse = await fetch(`${config.baseUrl}${config.runPath}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      AppID: config.appId,
      UserID: input.userId,
      NoDebug: true,
      InputData: JSON.stringify({
        query: input.query,
        owner_id: input.ownerId,
        library_id: input.libraryId,
        selected_documents: input.selectedDocuments,
      }),
    }),
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  const run = await runResponse.json().catch(() => ({})) as Record<string, unknown>;
  const runId = run.runId ?? run.RunID ?? (run.data as Record<string, unknown> | undefined)?.runId;
  if (!runResponse.ok || typeof runId !== "string") throw new Error("HIAGENT_RUN_FAILED");

  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const queryResponse = await fetch(`${config.baseUrl}${config.queryPath}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ RunID: runId, UserID: input.userId }),
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    });
    const result = await queryResponse.json().catch(() => ({})) as Record<string, unknown>;
    if (!queryResponse.ok) throw new Error("HIAGENT_QUERY_FAILED");
    const status = String(result.status ?? result.Status ?? (result.data as Record<string, unknown> | undefined)?.status ?? "").toUpperCase();
    if (["SUCCESS", "SUCCEEDED", "COMPLETED"].includes(status)) return parseHiAgentOutput(result);
    if (["FAILED", "ERROR", "STOPPED"].includes(status)) throw new Error("HIAGENT_WORKFLOW_FAILED");
  }
  throw new Error("HIAGENT_TIMEOUT");
}
