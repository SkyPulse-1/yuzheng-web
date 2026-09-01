"use client";

import { FormEvent, useState } from "react";

export function QuestionComposer({ selectedCount, pending, canAsk, onSubmit }: {
  selectedCount: number;
  pending: boolean;
  canAsk: boolean;
  onSubmit: (message: string) => Promise<void>;
}) {
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = message.trim();
    if (!value || pending || !canAsk) return;
    setMessage("");
    await onSubmit(value);
  }

  return (
    <form onSubmit={submit} className="question-composer">
      <div className="flex min-w-0 flex-1 flex-col">
        <textarea
          aria-label="分析需求"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={4000}
          rows={2}
          disabled={pending || !canAsk}
          className="question-input"
          placeholder={canAsk ? "输入你想核对、比较或梳理的问题…" : "当前没有可分析的资料"}
        />
        <p className="mt-1 text-xs text-muted">{selectedCount ? `仅分析已选的 ${selectedCount} 份资料` : "分析当前知识库中的全部可用资料"}</p>
      </div>
      <button className="primary-button shrink-0 self-end" disabled={pending || !canAsk || !message.trim()}>{pending ? "分析中…" : "开始分析"}</button>
    </form>
  );
}
