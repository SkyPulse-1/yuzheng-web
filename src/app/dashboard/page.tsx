import { redirect } from "next/navigation";

import Link from "next/link";

import { AppHeader } from "@/components/app-header";
import type { Library } from "@/lib/libraries";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { purgeExpiredSources } from "@/lib/trash";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!getSupabasePublicEnv()) redirect("/login?error=config");

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  await purgeExpiredSources().catch(() => undefined);

  const [{ data: profile }, { data: libraries }, { data: documentRows }] = await Promise.all([
    supabase.from("profiles").select("username_normalized").eq("id", auth.user.id).maybeSingle(),
    supabase.from("libraries").select("id, owner_id, name, description, created_at, updated_at").order("updated_at", { ascending: false }).limit(6),
    supabase.from("documents").select("library_id"),
  ]);
  if (!profile) redirect("/account/setup");
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
            <p className="eyebrow">当前账号 · @{profile.username_normalized}</p>
            <h1 className="mt-2 font-serif text-3xl font-semibold text-ink">欢迎回到你的研究空间</h1>
            <p className="mt-3 text-muted">从一个知识库开始，整理课程资料与研究文献。</p>
          </div>
          <Link href="/libraries?create=1" className="primary-button">+ 新建知识库</Link>
        </div>
        <section className="mt-10">
          <div className="flex items-center justify-between"><div><h2 className="font-serif text-xl font-semibold text-ink">最近知识库</h2><p className="mt-1 text-sm text-muted">继续最近的资料整理</p></div><Link href="/libraries" className="text-sm font-semibold text-primary">查看全部 →</Link></div>
          {recentLibraries.length === 0 ? (
            <div className="question-empty mt-5"><p className="font-medium text-ink">还没有知识库</p><p className="mt-2 text-sm text-muted">先创建你的第一个资料空间。</p></div>
          ) : (
            <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{recentLibraries.map((library) => <Link key={library.id} href={`/libraries/${library.id}`} className="surface-card glass-hover-card relative overflow-hidden p-6"><p className="font-serif text-lg font-semibold text-ink">{library.name}</p><p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-muted">{library.description || "暂无描述"}</p><p className="mt-5 border-t border-outline pt-4 text-xs text-muted">{documentCounts[library.id] ?? 0} 个文档</p></Link>)}</div>
          )}
        </section>
      </div>
    </main>
  );
}
