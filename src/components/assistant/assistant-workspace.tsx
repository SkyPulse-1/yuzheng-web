"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

import type { EvidenceCard } from "@/lib/hiagent/client";

type ReadyDocument = { id: string; original_name: string };
type ChatMessage = { role: "user" | "assistant"; content: string };

export function AssistantWorkspace({ libraryId, libraryName, documents }: { libraryId: string; libraryName: string; documents: ReadyDocument[] }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [conversationId, setConversationId] = useState("");
  const [evidenceMessageId, setEvidenceMessageId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [cards, setCards] = useState<EvidenceCard[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const message = String(form.get("message") ?? "").trim();
    if (!message) return;
    event.currentTarget.reset();
    setMessages((current) => [...current, { role: "user", content: message }]);
    setPending(true);
    setError("");
    const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: conversationId || undefined, libraryId, selectedDocumentIds: selectedIds, message }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(typeof result.error === "string" ? result.error : "问答失败，请重试。");
      if (typeof result.conversationId === "string") setConversationId(result.conversationId);
      setPending(false);
      return;
    }
    setConversationId(result.conversationId);
    setEvidenceMessageId(typeof result.evidenceMessageId === "string" ? result.evidenceMessageId : "");
    setMessages((current) => [...current, { role: "assistant", content: result.answer || "当前资料中未找到足够证据。" }]);
    setCards(Array.isArray(result.evidenceCards) ? result.evidenceCards : []);
    setPending(false);
  }

  const scope = selectedIds.length === 0 ? "整个知识库" : selectedIds.length === 1 ? "单篇文档" : `${selectedIds.length} 篇文档`;
  const canAsk = documents.length > 0;

  async function recordEvidenceView(cardIndex: number) {
    if (!evidenceMessageId) return;
    await fetch("/api/evidence-views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId: evidenceMessageId, cardIndex }),
    }).catch(() => undefined);
  }

  return (
    <div className="grid min-h-[calc(100vh-65px)] lg:grid-cols-[280px_minmax(0,1fr)_340px]">
      <aside className="border-b border-stone-200 bg-white p-5 lg:border-b-0 lg:border-r lg:p-6">
        <p className="eyebrow">提问范围</p>
        <h1 className="mt-2 font-serif text-xl font-semibold">{libraryName}</h1>
        <p className="mt-2 text-xs text-stone-500">当前：{scope}</p>
        {documents.length ? <div className="mt-6"><div className="mb-2 flex items-center justify-between"><p className="text-xs font-medium text-stone-500">选择指定文档</p>{selectedIds.length ? <button onClick={() => setSelectedIds([])} className="text-xs text-amber-800 hover:underline">清除选择</button> : null}</div><div className="space-y-1">{documents.map((document) => <label key={document.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-sm transition ${selectedIds.includes(document.id) ? "border-amber-200 bg-amber-50/70" : "border-transparent hover:bg-stone-50"}`}><input type="checkbox" checked={selectedIds.includes(document.id)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, document.id] : current.filter((id) => id !== document.id))} className="mt-0.5 accent-amber-800" /><span className="break-all leading-5">{document.original_name}</span></label>)}</div></div> : <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><p className="font-medium">暂无可使用的文档</p><p className="mt-1 text-xs text-amber-800">文档处理完成后才能开始提问。</p><Link href={`/libraries/${libraryId}`} className="mt-3 inline-flex text-xs font-semibold underline underline-offset-4">返回上传文档</Link></div>}
      </aside>

      <section className="flex min-h-[620px] flex-col bg-stone-50"><div className="border-b border-stone-200 bg-white px-5 py-4 sm:px-8"><p className="font-medium">证据问答</p><p className="mt-1 text-xs text-stone-500">回答只基于当前知识库中的可用文档</p></div><div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-8">{messages.length === 0 ? <div className="mx-auto mt-16 max-w-lg text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-900 font-serif text-white">问</div><h2 className="mt-5 font-serif text-2xl font-semibold">从材料中寻找答案</h2><p className="mt-3 text-sm leading-6 text-stone-500">不选择时检索整个知识库；选择一篇或多篇文档，可以限定回答范围。</p></div> : messages.map((message, index) => <div key={index} className={message.role === "user" ? "ml-auto max-w-2xl rounded-2xl bg-stone-900 px-5 py-4 text-sm leading-7 text-white" : "mr-auto max-w-3xl rounded-2xl border border-stone-200 bg-white px-5 py-4 text-sm leading-7 text-stone-800 shadow-sm"}>{message.content}</div>)}{pending ? <div className="mr-auto rounded-2xl border border-stone-200 bg-white px-5 py-4 text-sm text-stone-500">正在检索并核验证据…</div> : null}{error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}</div><form onSubmit={submit} className="border-t border-stone-200 bg-white p-4 sm:p-6"><div className="mx-auto flex max-w-4xl gap-3"><textarea name="message" required maxLength={4000} rows={2} disabled={pending || !canAsk} className="min-h-14 flex-1 resize-none rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-100 disabled:bg-stone-100" placeholder={canAsk ? "输入你的问题……" : "请先上传并处理文档"} /><button disabled={pending || !canAsk} className="primary-button self-end">发送</button></div></form></section>

      <aside className="border-t border-stone-200 bg-white p-5 lg:border-t-0 lg:border-l lg:p-6"><div className="flex items-center justify-between"><div><p className="eyebrow">EVIDENCE</p><h2 className="mt-1 font-serif text-lg font-semibold">证据卡</h2></div><span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-500">{cards.length} 张</span></div>{cards.length === 0 ? <div className="mt-8 rounded-2xl border border-dashed border-stone-300 p-5 text-sm leading-6 text-stone-500">回答完成后，这里会显示支持结论的原文、来源文档和页码。</div> : <div className="mt-5 space-y-4">{cards.map((card, index) => <article key={card.card_id || index} className="rounded-2xl border border-stone-200 p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold text-amber-800">证据 {String(index + 1).padStart(2, "0")}</p>{card.claim_type ? <span className="rounded-full bg-stone-100 px-2 py-1 text-[10px] text-stone-500">{card.claim_type}</span> : null}</div><p className="mt-2 text-sm font-medium leading-6">{card.claim}</p><details className="mt-3" onToggle={(event) => { if (event.currentTarget.open) void recordEvidenceView(index); }}><summary className="cursor-pointer text-xs text-stone-500">查看关键原文</summary><blockquote className="mt-2 border-l-2 border-amber-200 pl-3 text-xs leading-6 text-stone-600">{card.evidence_text}</blockquote></details><div className="mt-4 flex items-center justify-between gap-3 border-t border-stone-100 pt-3 text-xs text-stone-500"><span className="min-w-0 truncate">{card.document_name}{card.page_number ? ` · 第 ${card.page_number} 页` : ""}</span>{card.document_id ? <a href={`/api/documents/${card.document_id}/file${card.page_number ? `?page=${card.page_number}` : ""}`} target="_blank" rel="noreferrer" onClick={() => { void recordEvidenceView(index); }} className="shrink-0 font-semibold text-amber-800 hover:underline">查看原文</a> : null}</div></article>)}</div>}</aside>
    </div>
  );
}
