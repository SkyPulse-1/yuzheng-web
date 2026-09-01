"use client";

import { FormEvent, useState } from "react";

import { QuestionCard as QuestionCardView } from "./question-card";
import type { QuestionCard } from "../../lib/questions";

export function QuestionBoard({ questions, hasMore, loadingMore, onSearch, onLoadMore, onOpen, onDelete }: {
  questions: QuestionCard[];
  hasMore: boolean;
  loadingMore: boolean;
  onSearch: (query: string) => Promise<void>;
  onLoadMore: () => Promise<void>;
  onOpen: (question: QuestionCard) => void;
  onDelete: (question: QuestionCard) => void;
}) {
  const [query, setQuery] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); await onSearch(query.trim()); }

  return (
    <div className="question-board">
      <div className="question-board-header">
        <div><p className="eyebrow">研究记录</p><h1 className="mt-2 font-serif text-3xl font-semibold text-ink">证据问答</h1><p className="mt-2 text-sm text-muted">每次分析都会形成一张可回看的研究卡片。</p></div>
        <form onSubmit={submit} className="flex w-full min-w-0 max-w-sm gap-2"><input aria-label="搜索问题卡片" value={query} onChange={(event) => setQuery(event.target.value)} className="form-field min-w-0 flex-1" placeholder="搜索分析需求" /><button className="secondary-button shrink-0">搜索</button></form>
      </div>

      {questions.length ? <div className="question-card-grid">{questions.map((question) => <QuestionCardView key={question.id} question={question} onOpen={() => onOpen(question)} onDelete={() => onDelete(question)} />)}</div> : (
        <div className="question-empty"><p className="font-serif text-2xl font-semibold text-ink">从一个分析需求开始</p><p className="mt-3 max-w-lg text-sm leading-7 text-muted">在左侧选择资料，然后在下方输入需要核对、比较或梳理的问题。结果会保存在这里。</p></div>
      )}
      {hasMore ? <div className="mt-6 text-center"><button type="button" className="secondary-button" disabled={loadingMore} onClick={() => onLoadMore()}>{loadingMore ? "正在加载…" : "加载更多"}</button></div> : null}
    </div>
  );
}
