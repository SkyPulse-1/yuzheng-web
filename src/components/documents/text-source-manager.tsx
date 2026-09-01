"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AnalysisResultCards } from "../analysis/analysis-result-cards";
import { parseTextAnalysisResult } from "../../lib/analysis-results";
import type { LibraryDocument } from "../../lib/documents";
import { estimateAnalysisMinutes, PASTED_TEXT_LIMIT } from "../../lib/text-sources";

type ApiResponse = { document?: LibraryDocument; error?: string; result?: unknown };

function analysisLabel(source: LibraryDocument) {
  if (source.analysis_status === "PROCESSING") return "分析中";
  if (source.analysis_status === "READY") return "分析完成";
  if (source.analysis_status === "PARTIAL") return "部分完成";
  if (source.analysis_status === "FAILED") return "可以重试";
  return "已保存";
}

export function TextSourceManager({ libraryId, sources }: { libraryId: string; sources: LibraryDocument[] }) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(sources.length === 0);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [activeId, setActiveId] = useState(sources[0]?.id ?? "");
  const [editingId, setEditingId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [pendingId, setPendingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const activeSource = sources.find((source) => source.id === activeId) ?? sources[0];
  const activeResult = useMemo(() => activeSource?.text_content
    ? parseTextAnalysisResult(activeSource.analysis_result_json, activeSource.text_content)
    : null, [activeSource]);

  async function readResponse(response: Response) {
    return response.json().catch(() => ({})) as Promise<ApiResponse>;
  }

  async function createSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/libraries/${libraryId}/text-sources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      const result = await readResponse(response);
      if (!response.ok) throw new Error(result.error || "文字资料保存失败，请重试。");
      setTitle("");
      setContent("");
      setCreateOpen(false);
      if (result.document?.id) setActiveId(result.document.id);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "文字资料保存失败，请重试。");
    } finally {
      setSaving(false);
    }
  }

  function beginEdit(source: LibraryDocument) {
    setEditingId(source.id);
    setEditTitle(source.original_name);
    setEditContent(source.text_content ?? "");
    setError("");
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/documents/${editingId}/text-source`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle, content: editContent }),
      });
      const result = await readResponse(response);
      if (!response.ok) throw new Error(result.error || "文字资料更新失败，请重试。");
      setEditingId("");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "文字资料更新失败，请重试。");
    } finally {
      setSaving(false);
    }
  }

  async function analyze(source: LibraryDocument) {
    if (pendingId) return;
    setPendingId(source.id);
    setError("");
    try {
      const response = await fetch(`/api/documents/${source.id}/analyze-text`, { method: "POST" });
      const result = await readResponse(response);
      if (!response.ok) throw new Error(result.error || "文字分析失败，请重试。");
      setActiveId(source.id);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "文字分析失败，请重试。");
      router.refresh();
    } finally {
      setPendingId("");
    }
  }

  async function moveToTrash(source: LibraryDocument) {
    const confirmed = window.confirm(`将“${source.original_name}”移入回收站吗？\n\n30 天内可以恢复。`);
    if (!confirmed) return;
    setPendingId(source.id);
    setError("");
    const response = await fetch(`/api/documents/${source.id}`, { method: "DELETE" });
    const result = await readResponse(response);
    setPendingId("");
    if (!response.ok) {
      setError(result.error || "暂时无法移入回收站，请重试。");
      return;
    }
    router.refresh();
  }

  return (
    <section className="reading-room-section mt-7">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">文字资料</p>
          <h2 className="mt-2 font-serif text-2xl font-semibold text-ink">粘贴、保存，再开始分析</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">适合论文段落、课程材料和访谈记录。单份最多 30,000 个字符。</p>
        </div>
        <button type="button" className="primary-button" onClick={() => setCreateOpen((open) => !open)}>
          {createOpen ? "收起" : "+ 新建文字资料"}
        </button>
      </div>

      <p className="privacy-note">文字资料将保存到你的私人知识库。开始分析后，内容会发送至学校 HiAgent 服务。</p>
      {error ? <p className="error-banner mt-4">{error}</p> : null}

      {createOpen ? (
        <form onSubmit={createSource} className="source-editor mt-5">
          <label className="field-label" htmlFor="text-source-title">资料标题</label>
          <input id="text-source-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} className="form-field mt-2" placeholder="例如：第三章 证据与论证" required />
          <div className="mt-5 flex items-center justify-between gap-4">
            <label className="field-label" htmlFor="text-source-content">资料正文</label>
            <span className="text-xs tabular-nums text-muted">预计约 {estimateAnalysisMinutes(content.length)} 分钟</span>
          </div>
          <textarea id="text-source-content" aria-label="文字资料正文" value={content} onChange={(event) => setContent(event.target.value)} maxLength={PASTED_TEXT_LIMIT} rows={10} className="text-source-textarea mt-2" placeholder="在这里粘贴需要保存和分析的文字……" required />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
            <span>保存后仍可检查；一旦开始分析，标题和正文将锁定。</span>
            <span className="tabular-nums">{content.length} / {PASTED_TEXT_LIMIT}</span>
          </div>
          <div className="mt-5 flex justify-end"><button className="primary-button" disabled={saving || !title.trim() || !content.trim()}>{saving ? "正在保存…" : "保存文字资料"}</button></div>
        </form>
      ) : null}

      {sources.length ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
          <div className="source-list-panel">
            <p className="field-label px-3 pb-3">已保存资料</p>
            <div className="space-y-2">
              {sources.map((source) => (
                <button key={source.id} type="button" onClick={() => setActiveId(source.id)} className={`source-list-row ${activeSource?.id === source.id ? "is-selected" : ""}`}>
                  <span className="min-w-0"><span className="block truncate font-medium text-ink">{source.original_name}</span><span className="mt-1 block text-xs text-muted">{analysisLabel(source)} · {source.text_content?.length ?? 0} 字</span></span>
                  <span className="source-type-badge">文字</span>
                </button>
              ))}
            </div>
          </div>

          {activeSource ? (
            <div className="min-w-0">
              <div className="source-dossier">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div><p className="eyebrow">当前资料</p><h3 className="mt-2 font-serif text-2xl font-semibold text-ink">{activeSource.original_name}</h3><p className="mt-2 text-sm text-muted">{analysisLabel(activeSource)} · {activeSource.text_content?.length ?? 0} 字</p></div>
                  <div className="flex flex-wrap gap-2">
                    {!activeSource.analysis_started_at ? <button type="button" className="secondary-button" onClick={() => beginEdit(activeSource)}>修改</button> : null}
                    <button type="button" className="secondary-button" disabled={pendingId === activeSource.id} onClick={() => moveToTrash(activeSource)}>移入回收站</button>
                    <button type="button" className="primary-button" disabled={pendingId === activeSource.id || activeSource.analysis_status === "PROCESSING"} onClick={() => analyze(activeSource)}>
                      {pendingId === activeSource.id || activeSource.analysis_status === "PROCESSING" ? "正在分析…" : activeSource.analysis_started_at ? "重新分析" : "开始分析"}
                    </button>
                  </div>
                </div>
                {activeSource.error_message ? <p className="warning-banner mt-4">{activeSource.error_message}</p> : null}
              </div>

              {editingId === activeSource.id ? (
                <form onSubmit={saveEdit} className="source-editor mt-4">
                  <label className="field-label" htmlFor="edit-source-title">资料标题</label>
                  <input id="edit-source-title" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} maxLength={120} className="form-field mt-2" required />
                  <label className="field-label mt-5 block" htmlFor="edit-source-content">资料正文</label>
                  <textarea id="edit-source-content" value={editContent} onChange={(event) => setEditContent(event.target.value)} maxLength={PASTED_TEXT_LIMIT} rows={9} className="text-source-textarea mt-2" required />
                  <div className="mt-4 flex justify-end gap-2"><button type="button" className="secondary-button" onClick={() => setEditingId("")}>取消</button><button className="primary-button" disabled={saving}>{saving ? "保存中…" : "保存修改"}</button></div>
                </form>
              ) : null}

              {activeResult && activeSource.analysis_started_at ? <div className="mt-5"><AnalysisResultCards result={activeResult} sourceTitle={activeSource.original_name} sourceText={activeSource.text_content ?? ""} /></div> : (
                <div className="empty-result mt-5">保存完成。点击“开始分析”后，这里会出现四部分可核验结论。</div>
              )}
            </div>
          ) : null}
        </div>
      ) : !createOpen ? <div className="empty-result mt-5">还没有文字资料。新建一份后即可开始分析。</div> : null}
    </section>
  );
}
