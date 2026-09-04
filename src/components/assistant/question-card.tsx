"use client";

import { useState } from "react";

import { AnalysisCardFrame } from "../analysis/analysis-card-frame";
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
    <AnalysisCardFrame
      eyebrow={processing ? "分析中" : failed ? "未完成" : "研究结论"}
      title={question.question}
      description={processing ? "正在核对所选资料" : failed ? (question.error || "本次分析未完成") : "基于所选资料形成的可核验回答"}
      countLabel={question.evidenceCount ? `${question.evidenceCount} 条` : question.sourceCount ? `${question.sourceCount} 份资料` : "整个知识库"}
      preview={processing ? (
        <p className="text-sm leading-7 text-muted">正在整理结论与原文依据。</p>
      ) : (
        <>
          <p className={`line-clamp-2 text-sm leading-7 ${failed ? "text-error" : "text-ink-soft"}`}>
            {question.answer || "资料中未提供足够依据。"}
          </p>
          {question.sourceWarning ? <p className="text-xs font-medium text-warning">{question.sourceWarning}</p> : null}
        </>
      )}
      actionLabel={processing ? "请稍候" : "打开详情"}
      onOpen={onOpen}
      disabled={processing}
      processing={processing}
      secondaryAction={!processing ? (
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
    />
  );
}
