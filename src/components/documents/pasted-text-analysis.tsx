"use client";

import { FormEvent, useState } from "react";

import { PASTED_TEXT_LIMIT } from "../../lib/text-analysis-constants";

type AnalysisApiResponse = {
  answer?: unknown;
  error?: unknown;
};

export function PastedTextAnalysis({ libraryId }: { libraryId: string }) {
  const [text, setText] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = text.trim();
    if (!content || pending) return;

    setPending(true);
    setError("");
    setAnswer("");
    try {
      const response = await fetch("/api/text-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ libraryId, text: content }),
      });
      const result = await response.json().catch(() => ({})) as AnalysisApiResponse;
      if (!response.ok) {
        setError(typeof result.error === "string" ? result.error : "文字分析暂时失败，请稍后重试。");
        return;
      }
      if (typeof result.answer !== "string" || !result.answer.trim()) {
        setError("没有得到可显示的分析结果，请重试。");
        return;
      }
      setAnswer(result.answer.trim());
    } catch {
      setError("无法连接文字分析服务，请检查网络后重试。");
    } finally {
      setPending(false);
    }
  }

  function clear() {
    setText("");
    setAnswer("");
    setError("");
  }

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-100 bg-gradient-to-r from-amber-50/70 via-white to-stone-50 px-6 py-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-900 font-serif text-white">文</div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-serif text-xl font-semibold text-stone-900">粘贴文字分析</h2>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">测试功能</span>
            </div>
            <p className="mt-1 text-sm text-stone-500">复制一段文字，在不上传文件的情况下测试内容分析。</p>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="p-6">
        <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 transition focus-within:border-amber-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-amber-50">
          <textarea
            aria-label="需要分析的文字"
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={PASTED_TEXT_LIMIT}
            rows={9}
            disabled={pending}
            className="min-h-48 w-full resize-y bg-transparent text-sm leading-7 text-stone-800 outline-none placeholder:text-stone-400 disabled:cursor-wait"
            placeholder="在这里粘贴需要分析的段落、文章或课程材料……"
          />
          <div className="mt-3 flex items-center justify-between border-t border-stone-200 pt-3 text-xs text-stone-400">
            <span>内容仅用于本次分析，请勿粘贴不允许发送到学校服务的敏感信息。</span>
            <span className="ml-4 shrink-0 font-medium tabular-nums">{text.length} / {PASTED_TEXT_LIMIT}</span>
          </div>
        </div>

        {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">{error}</p> : null}

        {answer ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
            <div className="mb-3 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-600" /><h3 className="font-medium text-stone-900">分析结果</h3></div>
            <div className="whitespace-pre-wrap break-words text-sm leading-7 text-stone-800">{answer}</div>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          {answer ? <button type="button" onClick={clear} className="rounded-xl px-4 py-3 text-sm font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-900">清空内容</button> : null}
          <button type="submit" disabled={pending || !text.trim()} className="primary-button min-w-28 disabled:cursor-not-allowed disabled:opacity-45">
            {pending ? "正在分析内容…" : "开始分析"}
          </button>
        </div>
      </form>
    </section>
  );
}
