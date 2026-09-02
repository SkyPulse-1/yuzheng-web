"use client";

import { useState } from "react";

import type { QuestionCard as QuestionCardData } from "../../lib/questions";

export function QuestionCard({ question, onOpen, onDelete }: {
  question: QuestionCardData;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const processing = question.status === "PROCESSING";
  const failed = question.status === "FAILED";
  return (
    <article
      className={`question-card glass-hover-card ${processing ? "is-processing" : ""}`}
      onPointerMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty("--glow-x", `${event.clientX - bounds.left}px`);
        event.currentTarget.style.setProperty("--glow-y", `${event.clientY - bounds.top}px`);
      }}
    >
      <button type="button" className="block w-full text-left" onClick={onOpen} disabled={processing}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow">{processing ? "分析中" : failed ? "未完成" : "研究问题"}</p>
            <h3 className="mt-2 line-clamp-2 font-serif text-xl font-semibold leading-8 text-ink">{question.question}</h3>
            <p className="mt-1 text-xs leading-5 text-muted">
              {processing ? "正在核对所选资料" : failed ? (question.error || "本次分析未完成") : `${question.evidenceCount} 条证据`}
            </p>
          </div>
          <span className="metadata-chip shrink-0">{question.sourceCount ? `${question.sourceCount} 份资料` : "整个知识库"}</span>
        </div>
        {!processing ? (
          <div className="mt-6 flex-1 space-y-3">
            <p className={`line-clamp-2 text-sm leading-7 ${failed ? "text-error" : "text-ink-soft"}`}>
              {question.answer || "当前资料中未找到足够证据。"}
            </p>
          </div>
        ) : null}
        {question.sourceWarning ? <p className="mt-3 text-xs font-medium text-warning">{question.sourceWarning}</p> : null}
        <p className="mt-5 text-xs font-semibold text-primary">{processing ? "请稍候" : "打开详情"}</p>
      </button>
      {!processing ? (
        <button
          type="button"
          className="question-delete"
          onClick={() => {
            if (confirming) {
              setConfirming(false);
              onDelete();
            } else {
              setConfirming(true);
            }
          }}
          onBlur={() => setConfirming(false)}
        >
          {confirming ? "确认删除？" : "删除"}
        </button>
      ) : null}
    </article>
  );
}
