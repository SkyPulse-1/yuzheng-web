"use client";

import { useMemo } from "react";

import { buildSingleSourceDeckItems, type MotionMode } from "../../lib/analysis-deck";
import type { TextAnalysisResult } from "../../lib/analysis-results";
import type { QuestionCard } from "../../lib/questions";
import { QuestionComposer } from "./question-composer";
import { MotionModeToggle } from "./motion-mode-toggle";
import { SingleSourceAnalysisDeck } from "./single-source-analysis-deck";
import type { AssistantSource } from "./source-shelf";

export function SingleSourceAnalysisPanel({ source, result, pending, error, questions, questionPending, activeQuestionId, motionMode, onMotionModeChange, onRetry, onSubmitQuestion, onOpenQuestion, onDeleteQuestion }: {
  source: AssistantSource;
  result: TextAnalysisResult | null;
  pending: boolean;
  error: string | null;
  questions: QuestionCard[];
  questionPending: boolean;
  activeQuestionId?: string | null;
  motionMode: MotionMode;
  onMotionModeChange: (mode: MotionMode) => void;
  onRetry: () => void;
  onSubmitQuestion: (message: string) => Promise<void>;
  onOpenQuestion: (question: QuestionCard) => void;
  onDeleteQuestion: (question: QuestionCard) => void;
}) {
  const items = useMemo(() => buildSingleSourceDeckItems(questions, source.id), [questions, source.id]);
  return (
    <div className={`single-source-panel ${result ? "has-composer" : ""}`}>
      <header className="single-source-panel-header">
        <div>
          <p className="eyebrow">单份资料分析</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-ink">四项证据结论</h1>
          <p className="mt-2 text-sm text-muted">当前资料：{source.title}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <MotionModeToggle value={motionMode} onChange={onMotionModeChange} />
          <span className="metadata-chip">已确认 1 份资料</span>
        </div>
      </header>

      {pending ? (
        <div className="single-analysis-state" role="status">
          <span className="single-analysis-pulse" aria-hidden="true" />
          <p className="font-serif text-xl font-semibold text-ink">正在整理可核验结论</p>
          <p className="mt-2 text-sm leading-7 text-muted">完成后会在这里显示摘要、观点、原文依据和信息不足。</p>
        </div>
      ) : error ? (
        <div className="single-analysis-state">
          <p className="font-serif text-xl font-semibold text-ink">本次分析没有完成</p>
          <p className="mt-2 max-w-xl text-sm leading-7 text-muted">{error}</p>
          <button type="button" className="primary-button mt-5" onClick={onRetry}>重新分析</button>
        </div>
      ) : result ? (
        <>
          <SingleSourceAnalysisDeck
            items={items}
            result={result}
            sourceTitle={source.title}
            sourceText={source.sourceText}
            activeQuestionId={activeQuestionId}
            motionMode={motionMode}
            onOpenQuestion={onOpenQuestion}
            onDeleteQuestion={onDeleteQuestion}
          />
          <QuestionComposer
            selectedCount={1}
            pending={questionPending}
            canAsk
            scopeLabel="仅分析当前资料"
            onSubmit={onSubmitQuestion}
          />
        </>
      ) : (
        <div className="single-analysis-state">
          <p className="font-serif text-xl font-semibold text-ink">准备生成四项证据结论</p>
          <button type="button" className="primary-button mt-5" onClick={onRetry}>开始分析</button>
        </div>
      )}
    </div>
  );
}
