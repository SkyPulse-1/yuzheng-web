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

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900">
      <AppHeader />
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <Link href="/libraries" className="text-sm text-stone-500 transition hover:text-stone-900">← 我的知识库</Link>
        <div className="mt-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm font-medium text-amber-700">知识库详情</p><h1 className="mt-2 font-serif text-3xl font-semibold">{library.name}</h1><p className="mt-3 text-stone-500">{library.description || "暂无描述"}</p></div>
          <div className="flex gap-3"><button disabled className="rounded-xl border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-400">开始提问 · 后续阶段</button></div>
        </div>
        <DocumentManager libraryId={id} documents={(documents ?? []) as LibraryDocument[]} maxUploadMb={Number.isFinite(maxUploadMb) ? maxUploadMb : 50} />
      </div>
    </main>
  );
}
