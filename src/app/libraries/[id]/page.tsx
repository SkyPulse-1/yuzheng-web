import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
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

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900">
      <AppHeader />
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <Link href="/libraries" className="text-sm text-stone-500 transition hover:text-stone-900">← 我的知识库</Link>
        <div className="mt-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm font-medium text-amber-700">知识库详情</p><h1 className="mt-2 font-serif text-3xl font-semibold">{library.name}</h1><p className="mt-3 text-stone-500">{library.description || "暂无描述"}</p></div>
          <div className="flex gap-3"><button disabled className="rounded-xl bg-stone-200 px-5 py-3 text-sm font-semibold text-stone-500">+ 上传文档 · 下一阶段</button><button disabled className="rounded-xl border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-400">开始提问</button></div>
        </div>
        <section className="mt-10 rounded-3xl border border-stone-200 bg-white">
          <div className="border-b border-stone-100 px-6 py-5"><h2 className="font-serif text-xl font-semibold">文档</h2><p className="mt-1 text-sm text-stone-500">0 个文档</p></div>
          <div className="px-6 py-16 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-stone-100 text-stone-500">页</div><p className="mt-4 font-medium">这里还没有文档</p><p className="mt-2 text-sm text-stone-500">下一阶段将开放 PDF、DOCX、TXT 上传与解析状态。</p></div>
        </section>
      </div>
    </main>
  );
}
