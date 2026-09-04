"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";

import type { HomeResearchWorkspace } from "@/lib/evidence-views";

const ROTATION_INTERVAL_MS = 20_000;

export function RecentEvidenceCarousel({
  workspaces,
  loggedIn,
  loadFailed,
}: {
  workspaces: HomeResearchWorkspace[];
  loggedIn: boolean;
  loadFailed: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const workspace = workspaces[activeIndex] ?? workspaces[0];

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(query.matches);
    updatePreference();
    query.addEventListener("change", updatePreference);
    return () => query.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (workspaces.length < 2 || paused || reducedMotion) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % workspaces.length);
    }, ROTATION_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [activeIndex, paused, reducedMotion, workspaces.length]);

  const updateGlow = (event: MouseEvent<HTMLDivElement>) => {
    if (reducedMotion) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--desk-glow-x", `${event.clientX - bounds.left}px`);
    event.currentTarget.style.setProperty("--desk-glow-y", `${event.clientY - bounds.top}px`);
  };

  return (
    <div
      className={`research-desk-shell ${paused ? "is-paused" : ""}`}
      onMouseMove={updateGlow}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <Image
        src="/assets/research-document-backdrop-abstract.svg"
        alt=""
        width={1536}
        height={1024}
        priority
        aria-hidden="true"
        className="research-document-backdrop"
      />

      <section className="research-desk" aria-label="最近研究证据">
        <div className="research-desk-heading">
          <div>
            <p className="research-desk-kicker">最近研究</p>
            <p className="research-desk-caption">从结论回到它的出处</p>
          </div>
          {workspaces.length > 1 ? (
            <div className="research-desk-progress" aria-label="切换最近研究工作台">
              {workspaces.map((item, index) => (
                <button
                  key={item.libraryId}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={index === activeIndex ? "is-active" : undefined}
                  aria-label={`查看第 ${index + 1} 个工作台：${item.libraryName}`}
                  aria-current={index === activeIndex ? "true" : undefined}
                >
                  <span aria-hidden="true" />
                </button>
              ))}
            </div>
          ) : (
            <span className="research-desk-progress-single" aria-hidden="true" />
          )}
        </div>

        {workspace ? (
          <article key={`${workspace.libraryId}-${activeIndex}`} aria-live="polite" className="research-evidence-card is-visible">
            <div className="research-workspace-context">
              <Link href={workspace.workspaceHref} className="research-workspace-name">{workspace.libraryName}</Link>
              <Link href={workspace.workspaceHref} className="research-workspace-question">{workspace.question}</Link>
            </div>

            {workspace.card && workspace.sourceHref ? (
              <>
                <header className="research-evidence-header">
                  <h2>{workspace.card.claim_type || "证据结论"}</h2>
                  <span className="research-verified">来源可回溯</span>
                </header>

                <div className="research-evidence-body">
                  <p className="research-evidence-label">证据结论</p>
                  <blockquote>{workspace.card.claim}</blockquote>
                  {workspace.card.evidence_text && workspace.card.evidence_text !== workspace.card.claim ? (
                    <p className="research-evidence-excerpt">“{workspace.card.evidence_text}”</p>
                  ) : null}
                </div>

                <footer className="research-evidence-footer">
                  <span>来源：{workspace.card.document_name}{workspace.card.page_number ? ` · 第 ${workspace.card.page_number} 页` : ""}</span>
                  <a href={workspace.sourceHref} target="_blank" rel="noreferrer">查看原文</a>
                </footer>
              </>
            ) : workspace.answerSummary ? (
              <>
                <header className="research-evidence-header">
                  <h2>最近回答</h2>
                  <span className="research-unverified">尚未形成可回溯证据</span>
                </header>

                <div className="research-evidence-body">
                  <p className="research-evidence-label">研究摘要</p>
                  <blockquote>{workspace.answerSummary}</blockquote>
                </div>

                <footer className="research-evidence-footer">
                  <span>该回答来自你的真实研究记录，当前没有可靠的原文定位。</span>
                  <Link href={workspace.workspaceHref}>继续研究</Link>
                </footer>
              </>
            ) : (
              <div className="research-empty-state research-workspace-empty">
                <p className="research-empty-kicker">真实研究记录</p>
                <h2>这次分析没有形成可回溯的原文证据</h2>
                <p>工作台和问题记录仍然保留，但首页不会用未核验内容代替来源。</p>
                <Link href={workspace.workspaceHref}>继续研究</Link>
              </div>
            )}
          </article>
        ) : (
          <article aria-live="polite" className="research-evidence-card research-empty-state">
            <p className="research-empty-kicker">{loadFailed ? "读取未完成" : loggedIn ? "等待第一项研究" : "你的研究，从来源开始"}</p>
            <h2>{loadFailed ? "最近研究暂时无法读取" : loggedIn ? "还没有可回溯的研究记录" : "登录后继续最近的工作台"}</h2>
            <p>{loadFailed ? "你的资料没有丢失，可以进入工作区继续使用。" : loggedIn ? "完成一次证据问答后，这里会展示真实工作台与原文入口。" : "登录后，首页只展示属于你的真实分析记录。"}</p>
            <Link href={loggedIn ? "/libraries" : "/login"}>{loggedIn ? "进入知识库" : "登录 / 注册"}</Link>
          </article>
        )}
      </section>
    </div>
  );
}
