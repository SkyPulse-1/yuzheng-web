import Link from "next/link";

import { RecentEvidenceCarousel } from "@/components/home/recent-evidence-carousel";
import { parseRecentEvidenceRows } from "@/lib/evidence-views";
import type { EvidenceCard } from "@/lib/hiagent/client";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PRINCIPLES = [
  ["01", "限定知识范围", "只在你选择的知识库与文档范围内检索。"],
  ["02", "证据先于结论", "证据不足时明确说明，不强行补全答案。"],
  ["03", "回到文档原文", "证据卡保留来源文档、页码与关键原文。"],
] as const;

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
    <main className="home-shell">
      <nav className="home-nav" aria-label="首页导航">
        <Link href="/" aria-label="语证产品首页" className="home-brand">
          <span className="home-brand-mark">证</span>
          <span>
            <span className="home-brand-name">语证</span>
            <span className="home-brand-en">TRACEABLE EVIDENCE</span>
          </span>
        </Link>
        <Link href={destination} className="home-nav-action">
          {loggedIn ? "进入工作区" : "登录 / 注册"}
        </Link>
      </nav>

      <section className="home-hero">
        <div className="home-copy">
          <p className="home-eyebrow">个人证据研究台</p>
          <h1>
            让每一个结论，
            <span>都能回到原文。</span>
          </h1>
          <p className="home-lede">
            把论文、课本与文字资料放进同一个研究空间，从原文证据出发，形成可核验、可回溯的回答。
          </p>
          <div className="home-actions">
            <Link href={destination} className="home-primary-action">
              {loggedIn ? "进入工作区" : "开始使用语证"}
            </Link>
            <a href="#principles" className="home-secondary-action">
              了解证据原则
            </a>
          </div>
        </div>

        <RecentEvidenceCarousel cards={recentCards} />
      </section>

      <section id="principles" className="home-principles" aria-label="语证的证据原则">
        {PRINCIPLES.map(([number, title, detail]) => (
          <article key={number} className="home-principle">
            <span>{number}</span>
            <div>
              <h2>{title}</h2>
              <p>{detail}</p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
