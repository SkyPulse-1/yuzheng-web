import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { DocumentManager } from "@/components/documents/document-manager";
import type { LibraryDocument } from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LibraryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { id } = await params;
  const { data: library, error } = await supabase
    .from("libraries")
    .select("id, name, description, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !library) notFound();

  const { data: documents } = await supabase
    .from("documents")
    .select("id, owner_id, library_id, original_name, mime_type, size_bytes, storage_path, kb_document_id, status, error_message, page_count, created_at, updated_at")
    .eq("library_id", id)
    .order("updated_at", { ascending: false });
  const maxUploadMb = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB ?? 50);
  const libraryDocuments = (documents ?? []) as LibraryDocument[];
  const readyCount = libraryDocuments.filter((document) => document.status === "READY").length;

  return (
    <main className="app-page">
      <AppHeader />
      <div className="page-container">
        <Link href="/libraries" className="text-sm text-stone-500 transition hover:text-stone-900">← 我的知识库</Link>
        <div className="mt-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="eyebrow">知识库详情</p><h1 className="mt-2 font-serif text-3xl font-semibold">{library.name}</h1><p className="mt-3 max-w-2xl text-stone-500">{library.description || "还没有描述，可以在知识库列表中补充。"}</p></div>
          <Link href={`/assistant?libraryId=${id}`} className="secondary-button">进入助手</Link>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="surface-card px-5 py-4"><p className="text-xs text-stone-500">全部文档</p><p className="mt-1 text-2xl font-semibold">{libraryDocuments.length}</p></div>
          <div className="surface-card px-5 py-4"><p className="text-xs text-stone-500">可用于问答</p><p className="mt-1 text-2xl font-semibold text-emerald-700">{readyCount}</p></div>
          <div className="surface-card px-5 py-4"><p className="text-xs text-stone-500">处理中或待处理</p><p className="mt-1 text-2xl font-semibold text-amber-700">{libraryDocuments.length - readyCount}</p></div>
        </div>
        <DocumentManager libraryId={id} documents={libraryDocuments} maxUploadMb={Number.isFinite(maxUploadMb) ? maxUploadMb : 50} />
      </div>
    </main>
  );
}
