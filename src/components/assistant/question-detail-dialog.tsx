"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import type { MotionMode } from "../../lib/analysis-deck";
import type { QuestionCard } from "../../lib/questions";

export function QuestionDetailDialog({ question, animationMode = "native", transitionName, onClose }: { question: QuestionCard; animationMode?: MotionMode; transitionName?: string; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const closingRef = useRef(false);
  const [closing, setClosing] = useState(false);
  const reduceMotion = useReducedMotion();
  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    if (animationMode !== "motion" || reduceMotion) {
      onClose();
      return;
    }
    closingRef.current = true;
    setClosing(true);
    closeTimerRef.current = window.setTimeout(onClose, 240);
  }, [animationMode, onClose, reduceMotion]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    function keydown(event: KeyboardEvent) { if (event.key === "Escape") requestClose(); }
    document.addEventListener("keydown", keydown);
    return () => { document.removeEventListener("keydown", keydown); if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current); previous?.focus(); };
  }, [requestClose]);

  return (
    <div className={`dialog-backdrop ${animationMode === "motion" ? "is-motion-dialog" : ""}`} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
      <motion.section
        layoutId={animationMode === "motion" && !reduceMotion ? transitionName : undefined}
        initial={animationMode === "motion" && !reduceMotion ? { opacity: 0, scale: .985, y: 12 } : false}
        animate={animationMode === "motion" && !reduceMotion ? (closing ? { opacity: 0, scale: .985, y: 10 } : { opacity: 1, scale: 1, y: 0 }) : undefined}
        transition={{ duration: closing ? .22 : .42, ease: [.2, .78, .2, 1] }}
        className="question-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="问题卡片详情"
        style={{ viewTransitionName: transitionName }}
      >
        <header className="analysis-dialog-header">
          <div><p className="eyebrow">证据问答</p><h2 className="mt-2 max-w-4xl font-serif text-2xl font-semibold leading-9 text-ink">{question.question}</h2></div>
          <button ref={closeRef} type="button" className="secondary-button" onClick={requestClose}>关闭</button>
        </header>
        <div className="grid min-h-0 flex-1 gap-8 overflow-y-auto p-5 lg:grid-cols-[minmax(0,1fr)_400px] lg:p-8">
          <article><p className="field-label">分析结论</p><div className="mt-4 whitespace-pre-wrap text-base leading-8 text-ink-soft">{question.answer || question.error || "当前没有可显示的结论。"}</div></article>
          <aside><div className="flex items-center justify-between"><p className="field-label">原文证据</p><span className="metadata-chip">{question.evidenceCount} 条</span></div>
            <div className="mt-4 space-y-3">
              {question.evidenceCards.length ? question.evidenceCards.map((card, index) => (
                <article key={card.card_id || index} className="evidence-detail-card">
                  <p className="text-xs font-semibold text-evidence">证据 {String(index + 1).padStart(2, "0")}</p>
                  <p className="mt-2 text-sm font-medium leading-6 text-ink">{card.claim}</p>
                  <blockquote className="mt-3 border-l-2 border-evidence-soft pl-3 text-sm leading-7 text-ink-soft">{card.evidence_text}</blockquote>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted"><span className="truncate">{card.document_name}{card.page_number ? ` · 第 ${card.page_number} 页` : ""}</span>{card.document_id ? <a className="font-semibold text-primary" href={`/api/documents/${card.document_id}/file${card.page_number ? `?page=${card.page_number}` : ""}`} target="_blank" rel="noreferrer">查看原文</a> : null}</div>
                </article>
              )) : <div className="source-context-placeholder">这次回答没有返回可核验的原文证据。</div>}
            </div>
          </aside>
        </div>
      </motion.section>
    </div>
  );
}
