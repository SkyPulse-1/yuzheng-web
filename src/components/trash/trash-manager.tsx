"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { daysUntilPurge } from "../../lib/text-sources";

export type TrashedSource = {
  id: string;
  original_name: string;
  source_kind: "FILE" | "TEXT";
  deleted_at: string;
  purge_after: string;
};

export function TrashManager({ sources }: { sources: TrashedSource[] }) {
  const router = useRouter();
  const [restoringId, setRestoringId] = useState("");
  const [error, setError] = useState("");

  async function restore(source: TrashedSource) {
    setRestoringId(source.id);
    setError("");
    const response = await fetch(`/api/documents/${source.id}/restore`, { method: "POST" });
    const result = await response.json().catch(() => ({}));
    setRestoringId("");
    if (!response.ok) {
      setError(typeof result.error === "string" ? result.error : "恢复失败，请稍后重试。");
      return;
    }
    router.refresh();
  }

  return (
    <section className="reading-room-section">
      <div className="section-heading-row">
        <div><p className="eyebrow">资料保护</p><h1 className="mt-2 font-serif text-3xl font-semibold text-ink">回收站</h1><p className="mt-3 text-sm leading-7 text-muted">删除的资料会保留 30 天。恢复后，它会回到原来的知识库。</p></div>
        <span className="metadata-chip">{sources.length} 份资料</span>
      </div>

      {error ? <p className="error-banner mt-6">{error}</p> : null}
      {sources.length ? (
        <div className="mt-8 divide-y divide-outline overflow-hidden rounded-[18px] border border-outline bg-surface">
          {sources.map((source) => {
            const days = daysUntilPurge(source.purge_after);
            return (
              <article key={source.id} className="flex flex-col gap-4 px-5 py-5 transition hover:bg-primary-container/35 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <span className="source-type-badge mt-0.5">{source.source_kind === "TEXT" ? "文字" : "文件"}</span>
                  <div className="min-w-0"><h2 className="truncate font-medium text-ink">{source.original_name}</h2><p className="mt-1 text-xs text-muted">{days > 0 ? `${days} 天后自动清理` : "即将自动清理"}</p></div>
                </div>
                <button type="button" className="secondary-button shrink-0" disabled={restoringId === source.id} onClick={() => restore(source)}>{restoringId === source.id ? "正在恢复…" : "恢复资料"}</button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="question-empty mt-8"><p className="font-serif text-2xl font-semibold text-ink">回收站是空的</p><p className="mt-3 text-sm text-muted">你删除的文件或粘贴文字会在这里保留 30 天。</p></div>
      )}
    </section>
  );
}
