export const DOCUMENT_STATUSES = ["UPLOADING", "PROCESSING", "READY", "FAILED", "DELETING"] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export type LibraryDocument = {
  id: string;
  owner_id: string;
  library_id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  kb_document_id: string | null;
  status: DocumentStatus;
  error_message: string | null;
  page_count: number | null;
  created_at: string;
  updated_at: string;
};

const ALLOWED_TYPES: Record<string, { mime: string; extension: string }> = {
  pdf: { mime: "application/pdf", extension: "pdf" },
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", extension: "docx" },
  txt: { mime: "text/plain", extension: "txt" },
};

export function getUploadLimitBytes() {
  const configured = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB ?? 50);
  const megabytes = Number.isFinite(configured) && configured > 0 ? configured : 50;
  return megabytes * 1024 * 1024;
}

export function validateDocumentFile(file: File):
  | { ok: true; extension: string }
  | { ok: false; error: string } {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const allowed = ALLOWED_TYPES[extension];
  if (!allowed || file.type !== allowed.mime) {
    return { ok: false, error: "仅支持 PDF、DOCX、TXT 文件，且文件类型必须与扩展名一致。" };
  }
  if (!file.size) return { ok: false, error: "不能上传空文件。" };
  if (file.size > getUploadLimitBytes()) {
    return { ok: false, error: `单个文件不能超过 ${Math.round(getUploadLimitBytes() / 1024 / 1024)}MB。` };
  }
  if (file.name.length > 255) return { ok: false, error: "文件名不能超过 255 个字符。" };
  return { ok: true, extension: allowed.extension };
}
