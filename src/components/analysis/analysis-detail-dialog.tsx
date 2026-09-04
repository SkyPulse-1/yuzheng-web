"use client";

import { useEffect, useRef, useState } from "react";

import { SourceContextPopover } from "./source-context-popover";
import { useDialogTransition } from "../../hooks/use-dialog-transition";
import type { AnalysisItem, SourceExcerpt } from "../../lib/analysis-results";

export function AnalysisDetailDialog({
  open,
  title,
  items,
  sourceTitle,
  sourceText,
  onClose,
}: {
  open: boolean;
  title: string;
  items: AnalysisItem[];
  sourceTitle: string;
  sourceText: string;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [activeExcerpt, setActiveExcerpt] = useState<SourceExcerpt | null>(null);
  const { closing, requestClose } = useDialogTransition(onClose, open);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") requestClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [open, requestClose]);

  if (!open) return null;

  return (
    <div className="dialog-backdrop" data-state={closing ? "closing" : "open"} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
      <section
        className="analysis-dialog dialog-surface"
        data-state={closing ? "closing" : "open"}
        role="dialog"
        aria-modal="true"
        aria-label={`${title}详情`}
      >
        <header className="analysis-dialog-header">
          <div>
            <p className="eyebrow">{sourceTitle}</p>
            <h2 className="mt-2 font-serif text-2xl font-semibold text-ink">{title}</h2>
          </div>
          <button ref={closeRef} type="button" onClick={requestClose} className="secondary-button">关闭</button>
        </header>

        <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto p-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-8">
          <div className="space-y-4">
            {items.length ? items.map((item, index) => (
              <article key={`${item.text}-${index}`} className="analysis-statement">
                <p className="text-xs font-semibold text-evidence">{String(index + 1).padStart(2, "0")}</p>
                <button
                  type="button"
                  className="mt-2 w-full text-left text-base leading-8 text-ink outline-none"
                  onMouseEnter={() => setActiveExcerpt(item.sources[0] ?? null)}
                  onFocus={() => setActiveExcerpt(item.sources[0] ?? null)}
                  onClick={() => setActiveExcerpt(item.sources[0] ?? null)}
                  aria-describedby={item.sources.length ? "source-context-help" : undefined}
                >
                  {item.text}
                </button>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {item.sources.map((source, sourceIndex) => (
                    <button
                      type="button"
                      key={`${source.quote}-${sourceIndex}`}
                      className="evidence-chip"
                      onMouseEnter={() => setActiveExcerpt(source)}
                      onFocus={() => setActiveExcerpt(source)}
                      onClick={() => setActiveExcerpt(source)}
                    >
                      原文 {sourceIndex + 1}
                    </button>
                  ))}
                  {item.basis ? <span className="metadata-chip">{item.basis}</span> : null}
                </div>
              </article>
            )) : (
              <div className="empty-result">暂未得到可靠结果。可以稍后重新分析这份资料。</div>
            )}
          </div>

          <div className="lg:sticky lg:top-0 lg:self-start">
            {activeExcerpt ? (
              <SourceContextPopover excerpt={activeExcerpt} sourceText={sourceText} />
            ) : (
              <div className="source-context-placeholder" id="source-context-help">
                将鼠标移到总结内容或原文标记上，即可查看它所依据的上下文。触屏设备可以直接点击。
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
