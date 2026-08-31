import { NextResponse } from "next/server";

import { callHiAgent, isHiAgentConfigured } from "@/lib/hiagent/client";
import { createClient } from "@/lib/supabase/server";

type ChatBody = { conversationId?: unknown; libraryId?: unknown; selectedDocumentIds?: unknown; message?: unknown };

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  const body = await request.json().catch(() => null) as ChatBody | null;
  const libraryId = typeof body?.libraryId === "string" ? body.libraryId : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const selectedIds = Array.isArray(body?.selectedDocumentIds) && body.selectedDocumentIds.every((id) => typeof id === "string") ? body.selectedDocumentIds as string[] : [];
  if (!libraryId || !message || message.length > 4000 || selectedIds.length > 10) {
    return NextResponse.json({ error: "问题、知识库或文档选择无效。" }, { status: 400 });
  }

  const { data: library } = await supabase.from("libraries").select("id, name").eq("id", libraryId).maybeSingle();
  if (!library) return NextResponse.json({ error: "知识库不存在。" }, { status: 404 });

  let selectedDocuments: { id: string; original_name: string }[] = [];
  if (selectedIds.length) {
    const { data } = await supabase.from("documents").select("id, original_name").eq("library_id", libraryId).eq("status", "READY").in("id", selectedIds);
    selectedDocuments = data ?? [];
    if (selectedDocuments.length !== new Set(selectedIds).size) return NextResponse.json({ error: "所选文档不存在、尚未解析或不属于当前知识库。" }, { status: 400 });
  }

  const names = selectedDocuments.map((document) => document.original_name);
  const mode = names.length === 0 ? "GENERAL" : names.length === 1 ? "SINGLE" : "MULTI";
  const adaptedQuery = mode === "GENERAL" ? message : mode === "SINGLE" ? `仅根据 ${names[0]}，${message}` : `比较 ${names.join("、")}，${message}`;
  if (!isHiAgentConfigured()) return NextResponse.json({ error: "问答功能尚未配置完成，请稍后再试。" }, { status: 503 });

  let conversationId = typeof body?.conversationId === "string" ? body.conversationId : "";
  if (conversationId) {
    const { data: conversation } = await supabase.from("conversations").select("id").eq("id", conversationId).eq("library_id", libraryId).maybeSingle();
    if (!conversation) return NextResponse.json({ error: "对话不存在。" }, { status: 404 });
  } else {
    const { data: created, error } = await supabase.from("conversations").insert({ owner_id: user.id, library_id: libraryId, title: message.slice(0, 100) }).select("id").single();
    if (error || !created) return NextResponse.json({ error: "无法创建对话。" }, { status: 500 });
    conversationId = created.id;
  }

  await supabase.from("messages").insert({ owner_id: user.id, conversation_id: conversationId, role: "user", content: message });
  try {
    const result = await callHiAgent({ userId: user.id, query: adaptedQuery, ownerId: user.id, libraryId, selectedDocuments: names });
    const { data: sourceDocuments } = await supabase.from("documents").select("id, original_name").eq("library_id", libraryId).eq("status", "READY");
    const documentIdsByName = new Map((sourceDocuments ?? []).map((document) => [document.original_name, document.id]));
    const evidenceCards = result.evidenceCards.map((card) => ({ ...card, document_id: documentIdsByName.get(card.document_name) }));
    const { data: savedMessage, error: saveError } = await supabase
      .from("messages")
      .insert({ owner_id: user.id, conversation_id: conversationId, role: "assistant", content: result.answer, evidence_cards_json: evidenceCards })
      .select("id")
      .single();
    if (saveError || !savedMessage) return NextResponse.json({ error: "回答已完成，但保存失败，请重试。", conversationId }, { status: 500 });
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
    return NextResponse.json({ conversationId, evidenceMessageId: savedMessage.id, mode, answer: result.answer, evidenceCards, meta: { selectedDocumentCount: names.length } });
  } catch {
    return NextResponse.json({ error: "证据分析暂时失败或超时，请重试。", conversationId }, { status: 502 });
  }
}
