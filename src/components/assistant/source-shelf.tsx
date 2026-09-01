"use client";

import { useMemo, useState } from "react";

export type AssistantSource = {
  id: string;
  title: string;
  kind: "FILE" | "TEXT";
};

export function SourceShelf({ sources, selectedIds, onChange }: {
  sources: AssistantSource[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => sources.filter((source) => source.title.toLowerCase().includes(query.trim().toLowerCase())), [query, sources]);
  const scope = selectedIds.length ? `已选 ${selectedIds.length} 份资料` : "整个知识库";

  return (
    <aside className="source-shelf">
      <div className="source-shelf-header">
        <p className="eyebrow">分析范围</p>
        <div className="mt-2 flex items-center justify-between gap-3"><h2 className="font-serif text-xl font-semibold text-ink">资料架</h2><span className="metadata-chip">{scope}</span></div>
        <p className="mt-2 text-xs leading-5 text-muted">不选择时使用整个知识库；也可以选择一份或多份资料。</p>
        <input aria-label="搜索资料" value={query} onChange={(event) => setQuery(event.target.value)} className="form-field mt-4" placeholder="搜索资料标题" />
      </div>
      <div className="source-shelf-list">
        {selectedIds.length ? <button type="button" className="mb-2 text-xs font-semibold text-primary" onClick={() => onChange([])}>清除选择</button> : null}
        {filtered.map((source) => {
          const selected = selectedIds.includes(source.id);
          return (
            <label key={source.id} className={`source-choice ${selected ? "is-selected" : ""}`}>
              <input
                type="checkbox"
                checked={selected}
                onChange={(event) => onChange(event.target.checked ? [...selectedIds, source.id] : selectedIds.filter((id) => id !== source.id))}
              />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-ink">{source.title}</span><span className="mt-1 block text-xs text-muted">{source.kind === "TEXT" ? "粘贴文字" : "上传文件"}</span></span>
              <span className="source-type-badge">{source.kind === "TEXT" ? "文字" : "文件"}</span>
            </label>
          );
        })}
        {!filtered.length ? <p className="px-3 py-8 text-center text-sm text-muted">没有找到匹配的资料。</p> : null}
      </div>
    </aside>
  );
}
