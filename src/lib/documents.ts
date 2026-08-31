export const DOCUMENT_STATUSES = ["UPLOADING", "STORED", "PROCESSING", "READY", "FAILED", "DELETING"] as const;
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

export const DOCUMENT_UPLOAD_LIMITS_MB = {
  pdf: 100,
  docx: 50,
  txt: 30,
} as const;

type DocumentExtension = keyof typeof DOCUMENT_UPLOAD_LIMITS_MB;

const ALLOWED_TYPES: Record<DocumentExtension, { mime: string; label: string }> = {
  pdf: { mime: "application/pdf", label: "PDF" },
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", label: "DOCX" },
  txt: { mime: "text/plain", label: "TXT" },
};

export type DocumentMetadata = {
  name: string;
  type: string;
  size: number;
};

export function getUploadLimitBytes(extension: DocumentExtension) {
  return DOCUMENT_UPLOAD_LIMITS_MB[extension] * 1024 * 1024;
}

export function validateDocumentMetadata(input: DocumentMetadata):
  | { ok: true; extension: DocumentExtension; maxMb: number }
  | { ok: false; error: string } {
  const extension = input.name.split(".").pop()?.toLowerCase() as DocumentExtension | undefined;
  const allowed = extension ? ALLOWED_TYPES[extension] : undefined;
  if (!extension || !allowed || input.type !== allowed.mime) {
    return { ok: false, error: "仅支持 PDF、DOCX、TXT 文件，且文件类型必须与扩展名一致。" };
  }
  if (!input.size) return { ok: false, error: "不能上传空文件。" };
  const maxMb = DOCUMENT_UPLOAD_LIMITS_MB[extension];
  if (input.size > getUploadLimitBytes(extension)) {
    return { ok: false, error: `${allowed.label} 文件不能超过 ${maxMb}MB，请压缩或拆分后重试。` };
  }
  if (input.name.length > 255) return { ok: false, error: "文件名不能超过 255 个字符。" };
  return { ok: true, extension, maxMb };
}

export function validateDocumentFile(file: File) {
  return validateDocumentMetadata({ name: file.name, type: file.type, size: file.size });
}
