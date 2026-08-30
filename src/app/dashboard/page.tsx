import { redirect } from "next/navigation";

import Link from "next/link";

import { AppHeader } from "@/components/app-header";
import type { Library } from "@/lib/libraries";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!getSupabasePublicEnv()) redirect("/login?error=config");

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  const email = typeof data.claims.email === "string" ? data.claims.email : "已登录用户";
  const [{ data: libraries }, { data: documentRows }] = await Promise.all([
    supabase.from("libraries").select("id, owner_id, name, description, created_at, updated_at").order("updated_at", { ascending: false }).limit(6),
    supabase.from("documents").select("library_id"),
  ]);
  const recentLibraries = (libraries ?? []) as Library[];
  const documentCounts = (documentRows ?? []).reduce<Record<string, number>>((counts, row) => {
    counts[row.library_id] = (counts[row.library_id] ?? 0) + 1;
    return counts;
  }, {});

  return (
    <main className="app-page">
      <AppHeader />

      <div className="page-container">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-amber-700">当前账号 · {email}</p>
            <h1 className="mt-2 font-serif text-3xl font-semibold">欢迎回到你的研究空间</h1>
            <p className="mt-3 text-stone-500">从一个知识库开始，整理课程资料与研究文献。</p>
          </div>
          <Link href="/libraries?create=1" className="primary-button">+ 新建知识库</Link>
        </div>
        <section className="mt-10">
          <div className="flex items-center justify-between"><div><h2 className="font-serif text-xl font-semibold">最近知识库</h2><p className="mt-1 text-sm text-stone-500">继续最近的资料整理</p></div><Link href="/libraries" className="text-sm font-medium text-amber-800">查看全部 →</Link></div>
          {recentLibraries.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center"><p className="font-medium">还没有知识库</p><p className="mt-2 text-sm text-stone-500">先创建你的第一个资料空间。</p></div>
          ) : (
            <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{recentLibraries.map((library) => <Link key={library.id} href={`/libraries/${library.id}`} className="surface-card p-6 transition hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md"><p className="font-serif text-lg font-semibold">{library.name}</p><p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-stone-500">{library.description || "暂无描述"}</p><p className="mt-5 border-t border-stone-100 pt-4 text-xs text-stone-400">{documentCounts[library.id] ?? 0} 个文档</p></Link>)}</div>
          )}
        </section>
      </div>
    </main>
  );
}
