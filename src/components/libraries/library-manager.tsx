"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import type { Library } from "@/lib/libraries";

type EditorState = { mode: "create" | "edit"; library?: Library } | null;

export function LibraryManager({ libraries, documentCounts, startCreating = false }: { libraries: Library[]; documentCounts: Record<string, number>; startCreating?: boolean }) {
  const router = useRouter();
  const [editor, setEditor] = useState<EditorState>(startCreating ? { mode: "create" } : null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submitLibrary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor) return;
    setPending(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const payload = { name: form.get("name"), description: form.get("description") };
    const url = editor.mode === "edit" ? `/api/libraries/${editor.library?.id}` : "/api/libraries";
    const response = await fetch(url, {
      method: editor.mode === "edit" ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = response.status === 204 ? {} : await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(typeof result.error === "string" ? result.error : "操作失败，请稍后重试。");
      setPending(false);
      return;
    }

    setEditor(null);
    setPending(false);
    router.refresh();
  }

  async function deleteLibrary(library: Library) {
    const confirmed = window.confirm(`确定删除“${library.name}”吗？\n\n这也会删除其中的文档记录。此操作不可撤销。`);
    if (!confirmed) return;

    setPending(true);
    setError("");
    const response = await fetch(`/api/libraries/${library.id}`, { method: "DELETE" });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setError(typeof result.error === "string" ? result.error : "删除失败，请稍后重试。");
      setPending(false);
      return;
    }
    setPending(false);
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">我的知识库</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-ink">管理你的研究资料空间</h1>
          <p className="mt-3 text-muted">按课程、论文或研究主题组织文档，资料只对你可见。</p>
        </div>
        <button onClick={() => { setError(""); setEditor({ mode: "create" }); }} className="primary-button">+ 新建知识库</button>
      </div>

      {error && !editor ? <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      {libraries.length === 0 ? (
        <section className="question-empty mt-10">
          <h2 className="font-serif text-xl font-semibold text-ink">还没有知识库</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">先创建你的第一个资料空间，再按阶段添加课程资料或研究文献。</p>
          <button onClick={() => setEditor({ mode: "create" })} className="primary-button mt-6">创建第一个知识库</button>
        </section>
      ) : (
        <section className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {libraries.map((library) => (
            <article key={library.id} className="group surface-card glass-hover-card relative overflow-hidden p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-container font-serif text-primary">库</div>
                <div className="flex gap-1">
                  <button disabled={pending} onClick={() => { setError(""); setEditor({ mode: "edit", library }); }} className="rounded-lg px-2.5 py-1.5 text-xs text-stone-500 hover:bg-stone-100 hover:text-stone-900">编辑</button>
                  <button disabled={pending} onClick={() => deleteLibrary(library)} className="rounded-lg px-2.5 py-1.5 text-xs text-stone-500 hover:bg-red-50 hover:text-red-700">删除</button>
                </div>
              </div>
              <h2 className="mt-5 font-serif text-xl font-semibold text-ink">{library.name}</h2>
              <p className="mt-2 min-h-12 text-sm leading-6 text-muted">{library.description || "暂无描述"}</p>
              <div className="mt-6 flex items-center justify-between border-t border-outline pt-4 text-xs text-muted">
                <span>{documentCounts[library.id] ?? 0} 个文档</span>
                <Link href={`/libraries/${library.id}`} className="font-semibold text-primary">进入 →</Link>
              </div>
            </article>
          ))}
        </section>
      )}

      {editor ? (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) setEditor(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="library-dialog-title" className="analysis-dialog max-w-lg p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div><p className="eyebrow">知识库</p><h2 id="library-dialog-title" className="mt-2 font-serif text-2xl font-semibold text-ink">{editor.mode === "create" ? "新建知识库" : "编辑知识库"}</h2></div>
              <button type="button" disabled={pending} onClick={() => setEditor(null)} aria-label="关闭" className="rounded-lg px-3 py-2 text-stone-400 hover:bg-stone-100 hover:text-stone-800">×</button>
            </div>
            <form onSubmit={submitLibrary} className="mt-7 space-y-5">
              <label className="block"><span className="text-sm font-medium">名称 <span className="text-error">*</span></span><input name="name" required minLength={1} maxLength={50} defaultValue={editor.library?.name ?? ""} autoFocus className="form-field mt-2" placeholder="例如：长征论文研究" /></label>
              <label className="block"><span className="text-sm font-medium">描述 <span className="font-normal text-muted">选填，最多 200 字</span></span><textarea name="description" maxLength={200} rows={4} defaultValue={editor.library?.description ?? ""} className="text-source-textarea mt-2 min-h-28" placeholder="这个知识库用于整理什么资料？" /></label>
              {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
              <div className="flex justify-end gap-3 pt-2"><button type="button" disabled={pending} onClick={() => setEditor(null)} className="secondary-button">取消</button><button disabled={pending} className="primary-button">{pending ? "保存中…" : editor.mode === "create" ? "创建" : "保存"}</button></div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
