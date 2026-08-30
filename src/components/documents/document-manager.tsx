"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { DocumentStatus, LibraryDocument } from "@/lib/documents";

const STATUS_LABELS: Record<DocumentStatus, { label: string; classes: string }> = {
  UPLOADING: { label: "上传中", classes: "bg-blue-50 text-blue-700" },
  PROCESSING: { label: "处理中", classes: "bg-amber-50 text-amber-800" },
  READY: { label: "可使用", classes: "bg-emerald-50 text-emerald-700" },
  FAILED: { label: "处理失败", classes: "bg-red-50 text-red-700" },
  DELETING: { label: "删除中", classes: "bg-stone-100 text-stone-600" },
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatType(mime: string) {
  if (mime === "application/pdf") return "PDF";
  if (mime.includes("wordprocessingml")) return "DOCX";
  return "TXT";
}

export function DocumentManager({ libraryId, documents, maxUploadMb }: { libraryId: string; documents: LibraryDocument[]; maxUploadMb: number }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [workingId, setWorkingId] = useState("");
  const [currentFile, setCurrentFile] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!documents.some((document) => document.status === "UPLOADING" || document.status === "PROCESSING" || document.status === "DELETING")) return;
    const pendingIds = documents.filter((document) => document.status === "PROCESSING" && document.kb_document_id).map((document) => document.id);
    const timer = window.setInterval(() => {
      void Promise.all(pendingIds.map((id) => fetch(`/api/documents/${id}/status`, { cache: "no-store" }))).finally(() => router.refresh());
    }, 10000);
    return () => window.clearInterval(timer);
  }, [documents, router]);

  async function uploadFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    if (files.length > 10) {
      setError("一次最多上传 10 个文件。");
      return;
    }

    setUploading(true);
    setError("");
    const failures: string[] = [];
    for (const file of files) {
      setCurrentFile(file.name);
      const form = new FormData();
      form.set("file", file);
      const response = await fetch(`/api/libraries/${libraryId}/documents`, { method: "POST", body: form });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        failures.push(`${file.name}：${typeof result.error === "string" ? result.error : "上传失败"}`);
      }
    }
    setUploading(false);
    setCurrentFile("");
    if (failures.length) setError(failures.join("；"));
    router.refresh();
  }

  async function deleteDocument(document: LibraryDocument) {
    const confirmed = window.confirm(`确定删除“${document.original_name}”吗？\n\n文件和文档记录都会被删除，此操作不可撤销。`);
    if (!confirmed) return;
    setError("");
    const response = await fetch(`/api/documents/${document.id}`, { method: "DELETE" });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setError(typeof result.error === "string" ? result.error : "删除失败，请稍后重试。");
      return;
    }
    router.refresh();
  }

  async function retryIngest(document: LibraryDocument) {
    setWorkingId(document.id);
    setError("");
    const response = await fetch(`/api/documents/${document.id}/ingest`, { method: "POST" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(typeof result.error === "string" ? result.error : "知识库入库失败，请稍后重试。");
    setWorkingId("");
    router.refresh();
  }

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-stone-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="font-serif text-xl font-semibold">文档资料</h2><p className="mt-1 text-sm text-stone-500">支持 PDF、DOCX、TXT；单个文件不超过 {maxUploadMb}MB</p></div>
        <div>
          <input ref={inputRef} type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" multiple className="sr-only" onChange={uploadFiles} />
          <button type="button" disabled={uploading} onClick={() => inputRef.current?.click()} className="primary-button">{uploading ? `正在上传 ${currentFile}` : "+ 上传文档"}</button>
        </div>
      </div>

      {error ? <p className="mx-6 mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">{error}</p> : null}

      {documents.length === 0 ? (
        <button type="button" onClick={() => inputRef.current?.click()} className="block w-full px-6 py-16 text-center transition hover:bg-amber-50/40"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 font-serif text-amber-800">页</span><span className="mt-4 block font-medium">上传第一份文档</span><span className="mt-2 block text-sm text-stone-500">选择课程资料或研究文献，上传后会自动进入处理流程。</span></button>
      ) : (
        <div className="divide-y divide-stone-100">
          {documents.map((document) => {
            const status = STATUS_LABELS[document.status];
            return (
              <article key={document.id} className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-xs font-bold text-stone-600">{formatType(document.mime_type)}</div>
                  <div className="min-w-0"><p className="truncate font-medium text-stone-900">{document.original_name}</p><div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-stone-400"><span>{formatBytes(document.size_bytes)}</span><span>·</span><span className={`rounded-full px-2 py-1 font-medium ${status.classes}`}>{status.label}</span>{document.page_count ? <><span>·</span><span>{document.page_count} 页</span></> : null}</div>{document.error_message ? <p className="mt-2 text-xs text-red-600">{document.error_message}</p> : null}</div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 pl-15 sm:pl-0">{(document.status === "FAILED" || (document.status === "PROCESSING" && !document.kb_document_id)) ? <button disabled={workingId === document.id} onClick={() => retryIngest(document)} className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-50 disabled:opacity-50">{workingId === document.id ? "提交中…" : "重试入库"}</button> : null}<a href={`/api/documents/${document.id}/file`} target="_blank" rel="noreferrer" className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-medium text-stone-600 hover:border-stone-500 hover:text-stone-900">查看文件</a><button disabled={document.status === "DELETING"} onClick={() => deleteDocument(document)} className="rounded-lg px-3 py-2 text-xs font-medium text-stone-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50">删除</button></div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
