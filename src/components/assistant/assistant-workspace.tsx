"use client";

import { useState } from "react";

import type { TextAnalysisResult } from "../../lib/analysis-results";
import type { QuestionCard } from "../../lib/questions";
import { QuestionBoard } from "./question-board";
import { QuestionComposer } from "./question-composer";
import { QuestionDetailDialog } from "./question-detail-dialog";
import { SingleSourceAnalysisPanel } from "./single-source-analysis-panel";
import { SourceShelf, type AssistantSource } from "./source-shelf";

export function AssistantWorkspace({ libraryId, libraryName, sources, initialQuestions, initialNextCursor }: {
  libraryId: string;
  libraryName: string;
  sources: AssistantSource[];
  initialQuestions: QuestionCard[];
  initialNextCursor: string | null;
}) {
  const [draftSelectedIds, setDraftSelectedIds] = useState<string[]>([]);
  const [confirmedSelectedIds, setConfirmedSelectedIds] = useState<string[]>([]);
  const [singleResult, setSingleResult] = useState<TextAnalysisResult | null>(null);
  const [singleError, setSingleError] = useState<string | null>(null);
  const [singlePending, setSinglePending] = useState(false);
  const [questions, setQuestions] = useState(initialQuestions);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [searchQuery, setSearchQuery] = useState("");
  const [pending, setPending] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<QuestionCard | null>(null);
  const confirmedSources = sources.filter((source) => confirmedSelectedIds.includes(source.id));

  async function analyzeConfirmedSource(source: AssistantSource) {
    setSingleError(null);
    if (source.analysisResult) {
      setSingleResult(source.analysisResult);
      return;
    }
    setSingleResult(null);
    setSinglePending(true);
    try {
      const response = await fetch(`/api/documents/${source.id}/analyze-source`, { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.result) {
        throw new Error(typeof payload.error === "string" ? payload.error : "本次分析未完成，请稍后重试。");
      }
      setSingleResult(payload.result as TextAnalysisResult);
    } catch (error) {
      setSingleError(error instanceof Error ? error.message : "网络连接中断，请检查网络后重试。");
    } finally {
      setSinglePending(false);
    }
  }

  async function confirmSources(ids: string[]) {
    const nextIds = [...ids];
    setConfirmedSelectedIds(nextIds);
    setSingleError(null);
    setSingleResult(null);
    if (nextIds.length === 1) {
      const source = sources.find((item) => item.id === nextIds[0]);
      if (source) await analyzeConfirmedSource(source);
    }
  }

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
      selectedDocumentIds: confirmedSelectedIds,
      sourceCount: confirmedSelectedIds.length,
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
        body: JSON.stringify({ libraryId, selectedDocumentIds: confirmedSelectedIds, message }),
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
      <SourceShelf
        sources={sources}
        selectedIds={draftSelectedIds}
        pending={singlePending}
        onChange={setDraftSelectedIds}
        onConfirm={confirmSources}
      />
      <section className="question-workspace">
        <div className="question-workspace-title"><span>{libraryName}</span><span>{sources.length} 份可用资料</span></div>
        {!sources.length ? <p className="warning-banner mx-5 mt-5 sm:mx-8">当前知识库还没有可分析的文档。请先上传文件，或保存一份粘贴文字。</p> : null}
        {confirmedSources.length === 1 ? (
          <SingleSourceAnalysisPanel
            source={confirmedSources[0]}
            result={singleResult}
            pending={singlePending}
            error={singleError}
            onRetry={() => analyzeConfirmedSource(confirmedSources[0])}
          />
        ) : confirmedSources.length > 1 ? (
          <>
            <QuestionBoard
              questions={questions}
              hasMore={Boolean(nextCursor)}
              loadingMore={loadingMore}
              onSearch={searchQuestions}
              onLoadMore={loadMore}
              onOpen={setActiveQuestion}
              onDelete={deleteQuestion}
            />
            <QuestionComposer selectedCount={confirmedSelectedIds.length} pending={pending} canAsk onSubmit={submitQuestion} />
          </>
        ) : (
          <div className="assistant-scope-empty">
            <p className="eyebrow">证据问答</p>
            <h1 className="mt-3 font-serif text-3xl font-semibold text-ink">选择资料并确认</h1>
            <p className="mt-3 max-w-lg text-sm leading-7 text-muted">选择一份资料会自动生成四项证据结论；选择两份或更多资料，可以输入自己的比较或分析需求。</p>
          </div>
        )}
      </section>
      {activeQuestion ? <QuestionDetailDialog question={activeQuestion} onClose={() => setActiveQuestion(null)} /> : null}
    </div>
  );
}
