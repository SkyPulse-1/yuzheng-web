import { redirect } from "next/navigation";

import { signOut } from "@/app/dashboard/actions";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!getSupabasePublicEnv()) redirect("/login?error=config");

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  const email = typeof data.claims.email === "string" ? data.claims.email : "已登录用户";

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-900 font-serif text-lg text-white">证</div>
            <div><p className="font-semibold tracking-[0.16em]">语证</p><p className="text-xs text-stone-500">个人学术知识空间</p></div>
          </div>
          <form action={signOut}><button className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-600 transition hover:border-stone-500 hover:text-stone-900">退出登录</button></form>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-amber-700">当前账号 · {email}</p>
            <h1 className="mt-2 font-serif text-3xl font-semibold">欢迎回到你的研究空间</h1>
            <p className="mt-3 text-stone-500">从一个知识库开始，整理课程资料与研究文献。</p>
          </div>
          <button disabled className="rounded-xl bg-stone-300 px-5 py-3 text-sm font-semibold text-stone-600">+ 新建知识库 · 下一阶段</button>
        </div>
        <section className="mt-10 rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center sm:px-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-2xl text-amber-800">文</div>
          <h2 className="mt-5 font-serif text-xl font-semibold">还没有知识库</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">登录链路已经完成。下一阶段将开放 Library 创建、编辑、查看和删除能力。</p>
        </section>
      </div>
    </main>
  );
}
