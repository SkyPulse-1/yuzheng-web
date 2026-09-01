"use client";

import type { SourceExcerpt } from "../../lib/analysis-results";

function deriveContext(sourceText: string, quote: string) {
  const index = sourceText.indexOf(quote);
  if (index < 0) return { before: "", after: "" };
  return {
    before: sourceText.slice(Math.max(0, index - 90), index),
    after: sourceText.slice(index + quote.length, index + quote.length + 90),
  };
}

export function SourceContextPopover({ excerpt, sourceText }: { excerpt: SourceExcerpt; sourceText: string }) {
  const derived = deriveContext(sourceText, excerpt.quote);
  const before = excerpt.context_before || derived.before;
  const after = excerpt.context_after || derived.after;

  return (
    <aside className="source-context-popover" aria-label="来源原文上下文">
      <p className="eyebrow">来源上下文</p>
      <p className="mt-3 text-sm leading-8 text-ink">
        {before ? <span className="context-far">{before}</span> : null}
        <mark className="context-core">{excerpt.quote}</mark>
        {after ? <span className="context-near">{after}</span> : null}
      </p>
      <p className="mt-3 text-xs text-muted">核心证据句保持清晰，前后内容仅用于判断语境。</p>
    </aside>
  );
}
