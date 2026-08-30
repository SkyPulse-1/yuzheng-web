import Link from "next/link";

import { signOut } from "@/app/dashboard/actions";

export function AppHeader() {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/dashboard" className="flex items-center gap-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-900 font-serif text-lg text-white">证</span>
          <span><span className="block font-semibold tracking-[0.16em]">语证</span><span className="block text-xs text-stone-500">个人学术知识空间</span></span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-5">
          <Link href="/libraries" className="rounded-lg px-3 py-2 text-sm text-stone-600 transition hover:bg-stone-100 hover:text-stone-900">我的知识库</Link>
          <form action={signOut}><button className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-600 transition hover:border-stone-500 hover:text-stone-900">退出登录</button></form>
        </nav>
      </div>
    </header>
  );
}
