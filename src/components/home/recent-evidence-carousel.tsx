"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import Image from "next/image";

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

  const updateGlow = (event: MouseEvent<HTMLDivElement>) => {
    if (reducedMotion) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--desk-glow-x", `${event.clientX - bounds.left}px`);
    event.currentTarget.style.setProperty("--desk-glow-y", `${event.clientY - bounds.top}px`);
  };

  return (
    <div
      className="research-desk-shell"
      onMouseMove={updateGlow}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <Image
        src="/assets/research-document-backdrop-alpha.png"
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
          {displayCards.length > 1 ? (
            <div className="research-desk-progress" aria-label="切换最近研究的证据卡">
              {displayCards.map((item, index) => (
                <button
                  key={`${item.card_id}-${index}`}
                  type="button"
                  onClick={() => selectCard(index)}
                  className={index === activeIndex ? "is-active" : undefined}
                  aria-label={`第 ${index + 1} 张证据`}
                  aria-current={index === activeIndex ? "true" : undefined}
                />
              ))}
            </div>
          ) : (
            <span className="research-desk-progress-single" aria-hidden="true" />
          )}
        </div>

        <article
          aria-live="polite"
          className={`research-evidence-card ${visible ? "is-visible" : "is-hidden"}`}
        >
          <header className="research-evidence-header">
            <h2>{card.claim_type || "证据卡"}</h2>
            <span className="research-verified">有出处</span>
          </header>

          <div className="research-evidence-body">
            <p className="research-evidence-label">原文证据</p>
            <blockquote>{card.claim || card.evidence_text}</blockquote>
            {card.evidence_text && card.evidence_text !== card.claim ? (
              <p className="research-evidence-excerpt">“{card.evidence_text}”</p>
            ) : null}
          </div>

          <footer className="research-evidence-footer">
            <span>来源：{card.document_name || "未命名资料"}{card.page_number ? ` · 第 ${card.page_number} 页` : ""}</span>
            {card.document_id ? (
              <a
                href={`/api/documents/${card.document_id}/file${card.page_number ? `?page=${card.page_number}` : ""}`}
                target="_blank"
                rel="noreferrer"
              >
                查看原文
              </a>
            ) : (
              <span className="research-evidence-link-preview">查看原文</span>
            )}
          </footer>
        </article>
      </section>
    </div>
  );
}
