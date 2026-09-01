"use client";

import { useState } from "react";

import type { QuestionCard } from "../../lib/questions";
import { QuestionBoard } from "./question-board";
import { QuestionComposer } from "./question-composer";
import { QuestionDetailDialog } from "./question-detail-dialog";
import { SourceShelf, type AssistantSource } from "./source-shelf";

export function AssistantWorkspace({ libraryId, libraryName, sources, initialQuestions, initialNextCursor }: {
  libraryId: string;
  libraryName: string;
  sources: AssistantSource[];
  initialQuestions: QuestionCard[];
  initialNextCursor: string | null;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [questions, setQuestions] = useState(initialQuestions);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [searchQuery, setSearchQuery] = useState("");
  const [pending, setPending] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<QuestionCard | null>(null);

  async function submitQuestion(message: string) {
    const now = new Date().toISOString();
    const temporaryId = `pending-${Date.now()}`;
    const optimistic: QuestionCard = {
      id: temporaryId,
      question: message,
      status: "PROCESSING",
      answer: "",
      evidenceCards: [],
      evidenceCount: 0,
      selectedDocumentIds: selectedIds,
      sourceCount: selectedIds.length,
      sourceWarning: null,
      error: null,
      createdAt: now,
      updatedAt: now,
    };
    setQuestions((current) => [optimistic, ...current]);
    setPending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ libraryId, selectedDocumentIds: selectedIds, message }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const failed: QuestionCard = {
          ...optimistic,
          id: typeof result.conversationId === "string" ? result.conversationId : temporaryId,
          status: "FAILED",
          error: typeof result.error === "string" ? result.error : "本次分析未完成，请稍后重试。",
          updatedAt: new Date().toISOString(),
        };
        setQuestions((current) => current.map((question) => question.id === temporaryId ? failed : question));
        return;
      }
      const completed = result.question as QuestionCard | undefined;
      if (!completed) throw new Error("missing question result");
      setQuestions((current) => current.map((question) => question.id === temporaryId ? completed : question));
    } catch {
      setQuestions((current) => current.map((question) => question.id === temporaryId ? {
        ...question,
        status: "FAILED",
        error: "网络连接中断，请检查网络后重新提问。",
        updatedAt: new Date().toISOString(),
      } : question));
    } finally {
      setPending(false);
    }
  }

  async function fetchQuestions(query: string, cursor?: string | null) {
    const params = new URLSearchParams({ libraryId });
    if (query) params.set("query", query);
    if (cursor) params.set("cursor", cursor);
    const response = await fetch(`/api/questions?${params.toString()}`);
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "读取问题卡片失败");
    return result as { questions: QuestionCard[]; nextCursor: string | null };
  }

  async function searchQuestions(query: string) {
    setSearchQuery(query);
    try {
      const result = await fetchQuestions(query);
      setQuestions(result.questions);
      setNextCursor(result.nextCursor);
    } catch {
      // 保留已显示的卡片，避免短暂网络问题导致内容突然消失。
    }
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await fetchQuestions(searchQuery, nextCursor);
      setQuestions((current) => [...current, ...result.questions.filter((next) => !current.some((item) => item.id === next.id))]);
      setNextCursor(result.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }

  async function deleteQuestion(question: QuestionCard) {
    if (!window.confirm("确认删除这张问题卡片吗？删除后不会影响原始资料。")) return;
    if (question.id.startsWith("pending-")) {
      setQuestions((current) => current.filter((item) => item.id !== question.id));
      return;
    }
    const response = await fetch(`/api/questions/${question.id}`, { method: "DELETE" });
    if (response.ok) {
      setQuestions((current) => current.filter((item) => item.id !== question.id));
      if (activeQuestion?.id === question.id) setActiveQuestion(null);
    }
  }

  return (
    <div className="assistant-reading-room">
      <SourceShelf sources={sources} selectedIds={selectedIds} onChange={setSelectedIds} />
      <section className="question-workspace">
        <div className="question-workspace-title"><span>{libraryName}</span><span>{sources.length} 份可用资料</span></div>
        <QuestionBoard
          questions={questions}
          hasMore={Boolean(nextCursor)}
          loadingMore={loadingMore}
          onSearch={searchQuestions}
          onLoadMore={loadMore}
          onOpen={setActiveQuestion}
          onDelete={deleteQuestion}
        />
        <QuestionComposer selectedCount={selectedIds.length} pending={pending} canAsk={sources.length > 0} onSubmit={submitQuestion} />
      </section>
      {activeQuestion ? <QuestionDetailDialog question={activeQuestion} onClose={() => setActiveQuestion(null)} /> : null}
    </div>
  );
}
