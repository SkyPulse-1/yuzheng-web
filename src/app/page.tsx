import Image from "next/image";
import Link from "next/link";

import { RecentEvidenceCarousel } from "@/components/home/recent-evidence-carousel";
import { buildRecentResearchWorkspaces, type HomeResearchWorkspace } from "@/lib/evidence-views";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PRINCIPLES = [
  ["01", "限定知识范围", "只在你选择的知识库与文档范围内检索。"],
  ["02", "证据先于结论", "证据不足时明确说明，不强行补全答案。"],
  ["03", "回到文档原文", "证据卡保留来源文档、页码与关键原文。"],
] as const;

export default async function Home() {
  let recentWorkspaces: HomeResearchWorkspace[] = [];
  let loggedIn = false;
  let loadFailed = false;

  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    loggedIn = Boolean(auth.user);
    if (auth.user) {
      const { data: conversations, error: conversationError } = await supabase
        .from("conversations")
        .select("id, library_id, title, status, updated_at")
        .eq("status", "COMPLETED")
        .order("updated_at", { ascending: false })
        .limit(18);
      if (conversationError) throw conversationError;

      const conversationIds = (conversations ?? []).map((conversation) => conversation.id);
      const { data: messages, error: messageError } = conversationIds.length
        ? await supabase
            .from("messages")
            .select("conversation_id, content, evidence_cards_json, created_at")
            .in("conversation_id", conversationIds)
            .eq("role", "assistant")
            .order("created_at", { ascending: false })
        : { data: [], error: null };
      if (messageError) throw messageError;

      const libraryIds = [...new Set((conversations ?? []).map((conversation) => conversation.library_id))];
      const documentIds = [...new Set((messages ?? []).flatMap((message) => {
        if (!Array.isArray(message.evidence_cards_json)) return [];
        return message.evidence_cards_json.flatMap((value) => {
          if (!value || typeof value !== "object") return [];
          const documentId = (value as Record<string, unknown>).document_id;
          return typeof documentId === "string" ? [documentId] : [];
        });
      }))];

      const [libraryResult, documentResult] = await Promise.all([
        libraryIds.length
          ? supabase.from("libraries").select("id, name").in("id", libraryIds)
          : Promise.resolve({ data: [], error: null }),
        documentIds.length
          ? supabase.from("documents").select("id, library_id, original_name, deleted_at").in("id", documentIds).is("deleted_at", null)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (libraryResult.error) throw libraryResult.error;
      if (documentResult.error) throw documentResult.error;

      recentWorkspaces = buildRecentResearchWorkspaces({
        conversations: conversations ?? [],
        messages: messages ?? [],
        libraries: libraryResult.data ?? [],
        documents: documentResult.data ?? [],
      });
    }
  } catch {
    recentWorkspaces = [];
    loadFailed = loggedIn;
  }

  const destination = loggedIn ? "/dashboard" : "/login";

  return (
    <main className="home-shell">
      <nav className="home-nav" aria-label="首页导航">
        <Link href="/" aria-label="语证产品首页" className="home-brand">
          <span className="home-brand-mark">
            <Image src="/assets/yuzheng-mark.png" alt="" width={44} height={44} priority />
          </span>
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

        <RecentEvidenceCarousel workspaces={recentWorkspaces} loggedIn={loggedIn} loadFailed={loadFailed} />
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
