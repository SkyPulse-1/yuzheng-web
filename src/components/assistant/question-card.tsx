"use client";

import { formatQuestionTime, type QuestionCard as QuestionCardData } from "../../lib/questions";

export function QuestionCard({ question, onOpen, onDelete }: {
  question: QuestionCardData;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const processing = question.status === "PROCESSING";
  const failed = question.status === "FAILED";
  return (
    <article className={`question-card glass-hover-card ${processing ? "is-processing" : ""}`}>
      <button type="button" className="block w-full text-left" onClick={onOpen} disabled={processing}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0"><p className="eyebrow">{processing ? "正在分析" : failed ? "未完成" : "研究卡片"}</p><h3 className="mt-2 line-clamp-2 font-serif text-xl font-semibold leading-8 text-ink">{question.question}</h3></div>
          <span className="metadata-chip shrink-0">{question.sourceCount ? `${question.sourceCount} 份资料` : "整个知识库"}</span>
        </div>
        <p className={`mt-5 line-clamp-3 text-sm leading-7 ${failed ? "text-error" : "text-ink-soft"}`}>
          {processing ? "正在从所选资料中核对相关内容…" : failed ? (question.error || "本次分析未完成，可以重新提问。") : (question.answer || "当前资料中未找到足够证据。")}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-outline pt-4 text-xs text-muted">
          <span>{question.evidenceCount} 条证据 · {formatQuestionTime(question.updatedAt)}</span>
          {!processing ? <span className="font-semibold text-primary">打开详情</span> : <span>请稍候</span>}
        </div>
        {question.sourceWarning ? <p className="mt-3 text-xs font-medium text-warning">{question.sourceWarning}</p> : null}
      </button>
      {!processing ? <button type="button" className="question-delete" onClick={onDelete}>删除</button> : null}
    </article>
  );
}
