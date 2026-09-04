"use client";

import { useState } from "react";

import { AnalysisCardFrame } from "./analysis-card-frame";
import { AnalysisDetailDialog } from "./analysis-detail-dialog";
import {
  ANALYSIS_SECTION_KEYS,
  type AnalysisItem,
  type AnalysisSectionKey,
  type TextAnalysisResult,
} from "../../lib/analysis-results";

export const ANALYSIS_SECTION_META: Record<AnalysisSectionKey, { title: string; description: string }> = {
  content_summary: { title: "内容摘要", description: "快速掌握资料讨论的核心内容" },
  key_points: { title: "关键观点", description: "提取能够回到原文核验的主要判断" },
  source_evidence: { title: "原文依据", description: "集中查看支持结论的关键原句" },
  uncertainties: { title: "信息不足与歧义", description: "明确资料尚未说明或可能存在歧义之处" },
};

export function AnalysisSectionCard({ sectionKey, items, onOpen }: {
  sectionKey: AnalysisSectionKey;
  items: AnalysisItem[];
  onOpen: () => void;
}) {
  const meta = ANALYSIS_SECTION_META[sectionKey];
  const index = ANALYSIS_SECTION_KEYS.indexOf(sectionKey);
  return (
    <AnalysisCardFrame
      eyebrow={String(index + 1).padStart(2, "0")}
      title={meta.title}
      description={meta.description}
      countLabel={`${items.length} 条`}
      preview={items.length ? items.slice(0, 2).map((item) => (
        <p key={item.text} className="line-clamp-2 text-sm leading-7 text-ink-soft">{item.text}</p>
      )) : <p className="text-sm leading-7 text-muted">暂未得到可靠结果。</p>}
      actionLabel="打开详情"
      onOpen={onOpen}
    />
  );
}

export function AnalysisResultCards({ result, sourceTitle, sourceText }: {
  result: TextAnalysisResult;
  sourceTitle: string;
  sourceText: string;
}) {
  const [openKey, setOpenKey] = useState<AnalysisSectionKey | null>(null);

  return (
    <div className="analysis-card-grid">
      {ANALYSIS_SECTION_KEYS.map((key) => {
        const items = result[key];
        return (
          <AnalysisSectionCard key={key} sectionKey={key} items={items} onOpen={() => setOpenKey(key)} />
        );
      })}

      {openKey ? (
        <AnalysisDetailDialog
          open
          title={ANALYSIS_SECTION_META[openKey].title}
          items={result[openKey]}
          sourceTitle={sourceTitle}
          sourceText={sourceText}
          onClose={() => setOpenKey(null)}
        />
      ) : null}
    </div>
  );
}
