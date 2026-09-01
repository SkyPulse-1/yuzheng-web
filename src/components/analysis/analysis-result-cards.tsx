"use client";

import { useState } from "react";

import { AnalysisDetailDialog } from "./analysis-detail-dialog";
import {
  ANALYSIS_SECTION_KEYS,
  type AnalysisSectionKey,
  type TextAnalysisResult,
} from "../../lib/analysis-results";

const SECTION_META: Record<AnalysisSectionKey, { title: string; description: string }> = {
  content_summary: { title: "内容摘要", description: "快速掌握资料讨论的核心内容" },
  key_points: { title: "关键观点", description: "提取能够回到原文核验的主要判断" },
  source_evidence: { title: "原文依据", description: "集中查看支持结论的关键原句" },
  uncertainties: { title: "信息不足与歧义", description: "明确资料尚未说明或可能存在歧义之处" },
};

export function AnalysisResultCards({ result, sourceTitle, sourceText }: {
  result: TextAnalysisResult;
  sourceTitle: string;
  sourceText: string;
}) {
  const [openKey, setOpenKey] = useState<AnalysisSectionKey | null>(null);

  return (
    <div className="analysis-card-grid">
      {ANALYSIS_SECTION_KEYS.map((key, index) => {
        const meta = SECTION_META[key];
        const items = result[key];
        return (
          <article key={key} className="analysis-card glass-hover-card">
            <button type="button" className="flex h-full w-full flex-col text-left" onClick={() => setOpenKey(key)}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold tracking-[0.16em] text-evidence">{String(index + 1).padStart(2, "0")}</p>
                  <h3 className="mt-2 font-serif text-xl font-semibold text-ink">{meta.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-muted">{meta.description}</p>
                </div>
                <span className="metadata-chip shrink-0">{items.length} 条</span>
              </div>
              <div className="mt-6 flex-1 space-y-3">
                {items.length ? items.slice(0, 2).map((item) => (
                  <p key={item.text} className="line-clamp-2 text-sm leading-7 text-ink-soft">{item.text}</p>
                )) : <p className="text-sm leading-7 text-muted">暂未得到可靠结果。</p>}
              </div>
              <p className="mt-5 text-xs font-semibold text-primary">打开详情</p>
            </button>
          </article>
        );
      })}

      {openKey ? (
        <AnalysisDetailDialog
          open
          title={SECTION_META[openKey].title}
          items={result[openKey]}
          sourceTitle={sourceTitle}
          sourceText={sourceText}
          onClose={() => setOpenKey(null)}
        />
      ) : null}
    </div>
  );
}
