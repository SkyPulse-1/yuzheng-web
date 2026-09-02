"use client";

import { useEffect, useRef } from "react";

import { useDialogTransition } from "../../hooks/use-dialog-transition";
import type { QuestionCard } from "../../lib/questions";

export function QuestionDetailDialog({ question, onClose }: { question: QuestionCard; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const { closing, requestClose } = useDialogTransition(onClose);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    function keydown(event: KeyboardEvent) { if (event.key === "Escape") requestClose(); }
    document.addEventListener("keydown", keydown);
    return () => { document.removeEventListener("keydown", keydown); previous?.focus(); };
  }, [requestClose]);

  return (
    <div className="dialog-backdrop" data-state={closing ? "closing" : "open"} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
      <section
        className="question-dialog dialog-surface"
        data-state={closing ? "closing" : "open"}
        role="dialog"
        aria-modal="true"
        aria-label="问题卡片详情"
      >
        <header className="analysis-dialog-header">
          <div>
            <p className="eyebrow">{question.sourceCount ? `基于 ${question.sourceCount} 份资料` : "整个知识库"}</p>
            <h2 className="mt-2 max-w-4xl font-serif text-2xl font-semibold leading-9 text-ink">{question.question}</h2>
          </div>
          <button ref={closeRef} type="button" className="secondary-button" onClick={requestClose}>关闭</button>
        </header>
        <div className="grid min-h-0 flex-1 gap-8 overflow-y-auto p-5 lg:grid-cols-[minmax(0,1fr)_400px] lg:p-8">
          <article>
            <p className="eyebrow">分析结论</p>
            <div className="mt-4 whitespace-pre-wrap text-base leading-8 text-ink-soft">{question.answer || question.error || "暂无结论。"}</div>
          </article>
          <aside>
            <div className="flex items-center justify-between"><p className="eyebrow">原文证据</p><span className="metadata-chip">{question.evidenceCount} 条</span></div>
            <div className="mt-4 space-y-3">
              {question.evidenceCards.length ? question.evidenceCards.map((card, index) => (
                <article key={card.card_id || index} className="evidence-detail-card">
                  <p className="text-xs font-semibold text-evidence">证据 {String(index + 1).padStart(2, "0")}</p>
                  <p className="mt-2 text-sm font-medium leading-6 text-ink">{card.claim}</p>
                  <blockquote className="mt-3 border-l-2 border-evidence-soft pl-3 text-sm leading-7 text-ink-soft">{card.evidence_text}</blockquote>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted"><span className="truncate">{card.document_name}{card.page_number ? ` · 第 ${card.page_number} 页` : ""}</span>{card.document_id ? <a className="font-semibold text-primary" href={`/api/documents/${card.document_id}/file${card.page_number ? `?page=${card.page_number}` : ""}`} target="_blank" rel="noreferrer">查看原文</a> : null}</div>
                </article>
              )) : <div className="source-context-placeholder">没有可核验的原文证据。</div>}
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
