"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { EvidenceCard } from "@/lib/hiagent/client";

const SAMPLE_CARD: EvidenceCard = {
  card_id: "sample-long-march",
  claim_type: "长征战略意义比较",
  claim: "两份材料都将战略转移视为保存革命力量的重要转折，但论证侧重点不同。",
  evidence_text: "……实现了战略方针的重大转变……",
  document_name: "A.pdf",
  page_number: 3,
};

export function RecentEvidenceCarousel({ cards }: { cards: EvidenceCard[] }) {
  const displayCards = cards.length ? cards : [SAMPLE_CARD];
  const [activeIndex, setActiveIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const transitionTimer = useRef<number | null>(null);
  const card = displayCards[activeIndex] ?? displayCards[0];
  const isSample = cards.length === 0;

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(query.matches);
    updatePreference();
    query.addEventListener("change", updatePreference);
    return () => query.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => () => {
    if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current);
  }, []);

  const selectCard = useCallback((nextIndex: number) => {
    const normalizedIndex = (nextIndex + displayCards.length) % displayCards.length;
    if (normalizedIndex === activeIndex || displayCards.length < 2) return;
    if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current);
    if (reducedMotion) {
      setActiveIndex(normalizedIndex);
      return;
    }
    setVisible(false);
    transitionTimer.current = window.setTimeout(() => {
      setActiveIndex(normalizedIndex);
      setVisible(true);
      transitionTimer.current = null;
    }, 280);
  }, [activeIndex, displayCards.length, reducedMotion]);

  useEffect(() => {
    if (displayCards.length < 2 || paused || reducedMotion) return;
    const timer = window.setInterval(() => selectCard(activeIndex + 1), 5000);
    return () => window.clearInterval(timer);
  }, [activeIndex, displayCards.length, paused, reducedMotion, selectCard]);

  return (
    <div
      className="relative mx-auto w-full max-w-lg"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <div className="absolute -inset-10 rounded-full bg-amber-300/20 blur-3xl" />
      <article
        aria-live="polite"
        className={`relative min-h-[344px] rounded-[2rem] border border-stone-200 bg-white p-6 shadow-[0_30px_100px_rgba(68,64,60,0.14)] transition-all duration-300 motion-reduce:transition-none sm:p-8 ${visible ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-5">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-stone-400">{isSample ? "示例证据卡" : "最近打开"}</p>
            <p className="mt-1 font-serif text-lg font-semibold">{card.claim_type || "证据卡"}</p>
          </div>
          <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">有出处</span>
        </div>
        <div className="mt-6 space-y-5">
          <div className="rounded-2xl bg-stone-50 p-5">
            <p className="text-xs font-medium text-stone-400">支持观点</p>
            <p className="mt-2 line-clamp-3 leading-7 text-stone-700">{card.claim}</p>
          </div>
          <blockquote className="line-clamp-2 border-l-2 border-amber-700 pl-4 text-sm leading-6 text-stone-500">“{card.evidence_text}”</blockquote>
          <div className="flex items-center justify-between gap-3 text-xs text-stone-500">
            <span className="min-w-0 truncate">来源：{card.document_name}{card.page_number ? ` · 第 ${card.page_number} 页` : ""}</span>
            {card.document_id ? <a href={`/api/documents/${card.document_id}/file${card.page_number ? `?page=${card.page_number}` : ""}`} target="_blank" rel="noreferrer" className="shrink-0 font-medium text-amber-800 hover:underline">查看原文 →</a> : <span className="shrink-0 font-medium text-amber-800">查看原文 →</span>}
          </div>
        </div>
      </article>

      {displayCards.length > 1 ? (
        <div className="relative mt-4 flex items-center justify-center gap-4" aria-label="切换最近打开的证据卡">
          <button type="button" onClick={() => selectCard(activeIndex - 1)} className="rounded-full border border-stone-300 bg-white/80 px-3 py-1.5 text-sm text-stone-600 transition hover:border-amber-700 hover:text-amber-800" aria-label="上一张">←</button>
          <div className="flex gap-2">
            {displayCards.map((item, index) => (
              <button key={`${item.card_id}-${index}`} type="button" onClick={() => selectCard(index)} className={`h-2 rounded-full transition-all ${index === activeIndex ? "w-6 bg-amber-700" : "w-2 bg-stone-300 hover:bg-stone-400"}`} aria-label={`第 ${index + 1} 张`} aria-current={index === activeIndex ? "true" : undefined} />
            ))}
          </div>
          <button type="button" onClick={() => selectCard(activeIndex + 1)} className="rounded-full border border-stone-300 bg-white/80 px-3 py-1.5 text-sm text-stone-600 transition hover:border-amber-700 hover:text-amber-800" aria-label="下一张">→</button>
        </div>
      ) : null}
    </div>
  );
}
