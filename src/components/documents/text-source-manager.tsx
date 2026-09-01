"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import type { LibraryDocument } from "../../lib/documents";
import { estimateAnalysisMinutes, PASTED_TEXT_LIMIT } from "../../lib/text-sources";

type ApiResponse = { document?: LibraryDocument; error?: string };

function sourceLabel(source: LibraryDocument) {
  return source.analysis_started_at ? "已用于问答" : "已保存";
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
          <h2 className="mt-2 font-serif text-2xl font-semibold text-ink">粘贴并保存文字资料</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">适合论文段落、课程材料和访谈记录。保存后即可在证据问答中选择，单份最多 30,000 个字符。</p>
        </div>
        <button type="button" className="primary-button" onClick={() => setCreateOpen((open) => !open)}>
          {createOpen ? "收起" : "+ 新建文字资料"}
        </button>
      </div>

      <p className="privacy-note">文字资料保存在你的私人知识库。首次用于证据问答后将锁定；如需修改，请先移入回收站，再新建一份。</p>
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
            <span>保存后仍可检查；首次用于证据问答后，标题和正文将锁定。</span>
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
                  <span className="min-w-0"><span className="block truncate font-medium text-ink">{source.original_name}</span><span className="mt-1 block text-xs text-muted">{sourceLabel(source)} · {source.text_content?.length ?? 0} 字</span></span>
                  <span className="source-type-badge">文字</span>
                </button>
              ))}
            </div>
          </div>

          {activeSource ? (
            <div className="min-w-0">
              <div className="source-dossier">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div><p className="eyebrow">当前资料</p><h3 className="mt-2 font-serif text-2xl font-semibold text-ink">{activeSource.original_name}</h3><p className="mt-2 text-sm text-muted">{sourceLabel(activeSource)} · {activeSource.text_content?.length ?? 0} 字</p></div>
                  <div className="flex flex-wrap gap-2">
                    {!activeSource.analysis_started_at ? <button type="button" className="secondary-button" onClick={() => beginEdit(activeSource)}>修改</button> : null}
                    <button type="button" className="secondary-button" disabled={pendingId === activeSource.id} onClick={() => moveToTrash(activeSource)}>移入回收站</button>
                  </div>
                </div>
                {activeSource.error_message ? <p className="warning-banner mt-4">{activeSource.error_message}</p> : null}
                <div className="mt-5 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl border border-outline/70 bg-surface-muted/35 px-4 py-4 text-sm leading-7 text-ink-soft">
                  {activeSource.text_content}
                </div>
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

            </div>
          ) : null}
        </div>
      ) : !createOpen ? <div className="empty-result mt-5">还没有文字资料。新建一份后即可在证据问答中使用。</div> : null}
      <div className="mt-6 flex justify-end">
        <Link href={`/assistant?libraryId=${libraryId}`} className="primary-button">前往证据问答</Link>
      </div>
    </section>
  );
}
