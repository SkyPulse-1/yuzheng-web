import { getVikingConfig } from "@/lib/vikingdb/config";
import { signVolcRequest } from "@/lib/vikingdb/signer";

type VikingEnvelope<T> = {
  code?: number;
  message?: string;
  data?: T;
};

type DocumentInfo = {
  status?: { process_status?: number; failed_code?: number };
  statistics?: { pages?: number };
};

export class VikingNotConfiguredError extends Error {}
export class VikingRequestError extends Error {}

async function postViking<T>(path: string, payload: Record<string, unknown>) {
  const config = getVikingConfig();
  if (!config) throw new VikingNotConfiguredError("VikingDB is not configured.");
  const body = JSON.stringify(payload);
  const headers = signVolcRequest({ ...config, path, body });
  const response = await fetch(`https://${config.host}${path}`, {
    method: "POST",
    headers,
    body,
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  const result = (await response.json().catch(() => ({}))) as VikingEnvelope<T>;
  if (!response.ok || result.code !== 0) {
    throw new VikingRequestError(`VikingDB request failed (${result.code ?? response.status}).`);
  }
  return (result.data ?? {}) as T;
}

function collectionPayload() {
  const config = getVikingConfig();
  if (!config) throw new VikingNotConfiguredError("VikingDB is not configured.");
  return { resource_id: config.resourceId, project: config.project };
}

export async function addVikingDocument(input: {
  documentId: string;
  ownerId: string;
  libraryId: string;
  originalName: string;
  documentType: string;
  signedUrl: string;
}) {
  const data = await postViking<{ doc_id?: string }>("/api/knowledge/doc/add", {
    ...collectionPayload(),
    add_type: "url",
    doc_id: `d_${input.documentId.replaceAll("-", "")}`,
    doc_name: input.originalName,
    doc_type: input.documentType,
    url: input.signedUrl,
    meta: [
      { field_name: "owner_id", field_type: "string", field_value: input.ownerId },
      { field_name: "library_id", field_type: "string", field_value: input.libraryId },
      { field_name: "paper_name", field_type: "string", field_value: input.originalName },
    ],
  });
  if (!data.doc_id) throw new VikingRequestError("VikingDB did not return a document id.");
  return data.doc_id;
}

export async function getVikingDocumentStatus(kbDocumentId: string) {
  const data = await postViking<DocumentInfo>("/api/knowledge/doc/info", {
    ...collectionPayload(),
    doc_id: kbDocumentId,
  });
  const processStatus = data.status?.process_status;
  if (processStatus === 0) return { status: "READY" as const, pageCount: data.statistics?.pages || null, errorMessage: null };
  if (processStatus === 1) return { status: "FAILED" as const, pageCount: data.statistics?.pages || null, errorMessage: `知识库解析失败（${data.status?.failed_code ?? "未知错误"}）。` };
  if (processStatus === 5) return { status: "DELETING" as const, pageCount: null, errorMessage: null };
  return { status: "PROCESSING" as const, pageCount: data.statistics?.pages || null, errorMessage: null };
}

export async function deleteVikingDocument(kbDocumentId: string) {
  await postViking<Record<string, unknown>>("/api/knowledge/doc/delete", {
    ...collectionPayload(),
    doc_id: kbDocumentId,
  });
}
