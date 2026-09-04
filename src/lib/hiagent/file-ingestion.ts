import { createServiceClient } from "@/lib/supabase/service";

import type { HiAgentFile } from "./client";
import { uploadFileToUp } from "./up-upload";

export type FileIngestionInput = {
  storagePath: string;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
};

export async function prepareFileForHiAgent(input: FileIngestionInput): Promise<HiAgentFile> {
  const service = createServiceClient();

  const { data: blob, error: downloadError } = await service.storage
    .from("documents")
    .download(input.storagePath);
  if (downloadError || !blob) throw new Error("HIAGENT_FILE_DOWNLOAD_FAILED");

  const content = Buffer.from(await blob.arrayBuffer());
  const uploaded = await uploadFileToUp({
    content,
    contentType: input.mimeType || "application/octet-stream",
  });

  const { data: signed, error: signedError } = await service.storage
    .from("documents")
    .createSignedUrl(input.storagePath, 3600);
  if (signedError || !signed.signedUrl) throw new Error("HIAGENT_FILE_SIGN_FAILED");

  return {
    path: uploaded.path,
    name: input.originalName,
    size: input.sizeBytes,
    url: signed.signedUrl,
  };
}
