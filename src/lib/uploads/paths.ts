export function buildStoragePath(input: {
  ownerId: string;
  libraryId: string;
  documentId: string;
  extension: string;
}) {
  return `${input.ownerId}/${input.libraryId}/${input.documentId}.${input.extension}`;
}

export function splitStoragePath(storagePath: string) {
  const separator = storagePath.lastIndexOf("/");
  if (separator <= 0 || separator === storagePath.length - 1) {
    throw new Error("INVALID_STORAGE_PATH");
  }
  return {
    directory: storagePath.slice(0, separator),
    filename: storagePath.slice(separator + 1),
  };
}

export function getResumableStorageEndpoint(supabaseUrl: string) {
  const url = new URL(supabaseUrl);
  const projectRef = url.hostname.split(".")[0];
  if (!projectRef) throw new Error("INVALID_SUPABASE_URL");
  return `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`;
}
