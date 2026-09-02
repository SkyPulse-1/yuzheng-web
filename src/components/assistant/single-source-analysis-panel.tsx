"use client";

import { AnalysisResultCards } from "../analysis/analysis-result-cards";
import type { TextAnalysisResult } from "../../lib/analysis-results";
import type { AssistantSource } from "./source-shelf";

export function SingleSourceAnalysisPanel({ source, result, pending, error, onRetry }: {
  source: AssistantSource;
  result: TextAnalysisResult | null;
  pending: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="single-source-panel">
      <header className="single-source-panel-header">
        <div>
          <p className="eyebrow">单份资料分析</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-ink">四项证据结论</h1>
          <p className="mt-2 text-sm text-muted">当前资料：{source.title}</p>
        </div>
        <span className="metadata-chip">已确认 1 份资料</span>
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
        <AnalysisResultCards result={result} sourceTitle={source.title} sourceText={source.sourceText} />
      ) : (
        <div className="single-analysis-state">
          <p className="font-serif text-xl font-semibold text-ink">准备生成四项证据结论</p>
          <button type="button" className="primary-button mt-5" onClick={onRetry}>开始分析</button>
        </div>
      )}
    </div>
  );
}
