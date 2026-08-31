import Link from "next/link";

import { signOut } from "@/app/dashboard/actions";
import { AppNavigation } from "@/components/app-navigation";
import { createClient } from "@/lib/supabase/server";

export async function AppHeader() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth.user
    ? await supabase.from("profiles").select("username_normalized").eq("id", auth.user.id).maybeSingle()
    : { data: null };

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" aria-label="返回语证产品首页" className="flex min-w-0 items-center gap-3 rounded-xl">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-900 font-serif text-base text-white">证</span>
          <span className="min-w-0"><span className="block font-semibold tracking-[0.16em]">语证</span><span className="hidden text-[11px] text-stone-500 sm:block">个人学术知识空间</span></span>
        </Link>
        <nav aria-label="主导航" className="flex items-center gap-1 sm:gap-2">
          <AppNavigation />
          {profile ? <span className="hidden rounded-lg bg-stone-100 px-3 py-2 text-xs text-stone-500 md:inline-flex">@{profile.username_normalized}</span> : null}
          <form action={signOut}><button className="rounded-lg px-3 py-2 text-sm text-stone-500 transition hover:bg-stone-100 hover:text-stone-900">退出</button></form>
        </nav>
      </div>
    </header>
  );
}
