import Link from "next/link";

import { RecentEvidenceCarousel } from "@/components/home/recent-evidence-carousel";
import { parseRecentEvidenceRows } from "@/lib/evidence-views";
import type { EvidenceCard } from "@/lib/hiagent/client";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  let recentCards: EvidenceCard[] = [];
  let loggedIn = false;
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    loggedIn = Boolean(auth.user);
    if (auth.user) {
      const { data } = await supabase
        .from("evidence_card_views")
        .select("card_json")
        .order("opened_at", { ascending: false })
        .limit(3);
      recentCards = parseRecentEvidenceRows(data);
    }
  } catch {
    recentCards = [];
  }

  const destination = loggedIn ? "/dashboard" : "/login";
  return (
    <main className="min-h-screen overflow-hidden text-ink">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/55 to-transparent" />
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary font-serif text-lg text-white shadow-[0_8px_20px_rgba(32,43,91,0.18)]">证</div>
          <div><p className="font-semibold tracking-[0.18em]">语证</p><p className="text-[11px] tracking-wide text-muted">TRACEABLE EVIDENCE</p></div>
        </div>
        <Link href={destination} className="secondary-button bg-white/70">{loggedIn ? "进入工作区" : "登录 / 注册"}</Link>
      </nav>
      <section className="mx-auto grid min-h-[calc(100vh-88px)] max-w-7xl items-center gap-16 px-5 pb-16 pt-10 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:py-16">
        <div>
          <p className="inline-flex rounded-full border border-evidence/20 bg-[#f7ebcf] px-4 py-2 text-xs font-semibold tracking-[0.18em] text-evidence">可溯源学术证据工具</p>
          <h1 className="mt-8 max-w-3xl font-serif text-5xl font-semibold leading-[1.12] tracking-tight text-ink sm:text-6xl">在自己的资料里，<span className="text-primary">找到有出处的答案。</span></h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-muted">建立个人课程与研究资料空间。语证先检索、再核验证据、再形成回答，让每个观点都能回到文档与页码。</p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href={destination} className="primary-button h-12 px-7">{loggedIn ? "继续使用" : "开始使用语证"}</Link>
            <a href="#principles" className="secondary-button h-12 px-7">了解证据原则</a>
          </div>
        </div>
        <RecentEvidenceCarousel cards={recentCards} />
      </section>
      <section id="principles" className="border-t border-outline bg-surface/55">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-8 md:grid-cols-3">
          {[["01", "限定知识范围", "只在你选择的知识库与文档范围内检索。"], ["02", "证据先于结论", "证据不足时明确说明，不强行补全答案。"], ["03", "回到文档原文", "证据卡保留来源文档、页码与关键原文。"]].map(([number, title, detail]) => (
            <div key={number} className="border-l border-outline pl-5"><p className="text-xs font-semibold text-evidence">{number}</p><h2 className="mt-3 font-serif text-xl font-semibold text-ink">{title}</h2><p className="mt-2 text-sm leading-6 text-muted">{detail}</p></div>
          ))}
        </div>
      </section>
    </main>
  );
}
