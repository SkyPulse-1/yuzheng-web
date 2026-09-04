"use client";

import type { ReactNode } from "react";

export function AnalysisCardFrame({
  eyebrow,
  title,
  description,
  countLabel,
  preview,
  actionLabel,
  onOpen,
  disabled = false,
  processing = false,
  secondaryAction,
}: {
  eyebrow: string;
  title: string;
  description: string;
  countLabel: string;
  preview: ReactNode;
  actionLabel: string;
  onOpen: () => void;
  disabled?: boolean;
  processing?: boolean;
  secondaryAction?: ReactNode;
}) {
  return (
    <article
      data-analysis-card="true"
      className={`analysis-card glass-hover-card ${processing ? "is-processing" : ""}`}
      onPointerMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty("--glow-x", `${event.clientX - bounds.left}px`);
        event.currentTarget.style.setProperty("--glow-y", `${event.clientY - bounds.top}px`);
      }}
    >
      <button type="button" className="flex h-full w-full flex-col text-left" onClick={onOpen} disabled={disabled}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.16em] text-evidence">{eyebrow}</p>
            <h3 className="mt-2 line-clamp-2 font-serif text-xl font-semibold leading-8 text-ink">{title}</h3>
            <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
          </div>
          <span className="metadata-chip shrink-0">{countLabel}</span>
        </div>
        <div className="mt-6 flex-1 space-y-3">{preview}</div>
        <p className="mt-5 text-xs font-semibold text-primary">{actionLabel}</p>
      </button>
      {secondaryAction}
    </article>
  );
}
