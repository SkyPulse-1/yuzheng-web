import { NextResponse } from "next/server";

import { chatWithHiAgent, createHiAgentConversation, isHiAgentConfigured, isHiAgentTransportConfigured } from "@/lib/hiagent/client";
import { filterAssistantSources } from "@/lib/assistant-sources";
import { attachUniqueDocumentIds } from "@/lib/evidence-sources";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

type ChatBody = { libraryId?: unknown; selectedDocumentIds?: unknown; message?: unknown };

const DIRECT_TEXT_CONTEXT_LIMIT = 24_000;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  const service = createServiceClient();

  const body = await request.json().catch(() => null) as ChatBody | null;
  const libraryId = typeof body?.libraryId === "string" ? body.libraryId : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const selectedIds = Array.isArray(body?.selectedDocumentIds) && body.selectedDocumentIds.every((id) => typeof id === "string") ? body.selectedDocumentIds as string[] : [];
  if (!libraryId || !message || message.length > 4000 || selectedIds.length > 10) {
    return NextResponse.json({ error: "问题、知识库或文档选择无效。" }, { status: 400 });
  }

  const { data: library } = await supabase.from("libraries").select("id, name").eq("id", libraryId).maybeSingle();
  if (!library) return NextResponse.json({ error: "知识库不存在。" }, { status: 404 });

  let selectedDocuments: { id: string; original_name: string; source_kind: "FILE" | "TEXT"; text_content: string | null; status: string }[] = [];
  if (selectedIds.length) {
    const { data } = await supabase
      .from("documents")
      .select("id, original_name, source_kind, text_content, status")
      .eq("library_id", libraryId)
      .is("deleted_at", null)
      .in("id", selectedIds);
    selectedDocuments = filterAssistantSources((data ?? []) as typeof selectedDocuments);
    if (selectedDocuments.length !== new Set(selectedIds).size) return NextResponse.json({ error: "所选文档不存在、尚未解析或不属于当前知识库。" }, { status: 400 });
  } else {
    const { data } = await supabase
      .from("documents")
      .select("id, original_name, source_kind, text_content, status")
      .eq("library_id", libraryId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });
    selectedDocuments = filterAssistantSources((data ?? []) as typeof selectedDocuments);
  }

  if (!selectedDocuments.length) return NextResponse.json({ error: "当前知识库还没有可分析的资料。" }, { status: 400 });
  const names = selectedDocuments.map((document) => document.original_name);
  const mode = selectedIds.length === 0 ? "GENERAL" : names.length === 1 ? "SINGLE" : "MULTI";
  const fileDocuments = selectedDocuments.filter((document) => document.source_kind !== "TEXT");
  const textDocuments = selectedDocuments.filter((document) => document.source_kind === "TEXT" && document.text_content);
  if (!isHiAgentTransportConfigured() || (fileDocuments.length > 0 && !isHiAgentConfigured())) {
    return NextResponse.json({ error: fileDocuments.length ? "学校文件检索服务尚未接通，请先选择已分析的文字资料。" : "问答功能尚未配置完成，请稍后再试。" }, { status: 503 });
  }

  let remainingContext = DIRECT_TEXT_CONTEXT_LIMIT;
  const directContext = textDocuments.flatMap((document) => {
    if (!remainingContext || !document.text_content) return [];
    const content = document.text_content.slice(0, remainingContext);
    remainingContext -= content.length;
    return [`【文字资料：${document.original_name}】\n${content}\n【资料结束】`];
  }).join("\n\n");
  const scopeInstruction = selectedIds.length === 0
    ? "请只根据当前知识库内下列资料回答。"
    : names.length === 1
      ? `请只根据“${names[0]}”回答。`
      : `请比较并综合以下资料：${names.join("、")}。`;
  const adaptedQuery = [scopeInstruction, directContext, `用户的分析需求：${message}`, "证据不足时请明确说明，不要补写资料中不存在的事实。"].filter(Boolean).join("\n\n");

  const { data: created, error: createError } = await supabase
    .from("conversations")
    .insert({
      owner_id: user.id,
      library_id: libraryId,
      title: message.slice(0, 100),
      status: "PROCESSING",
      selected_document_ids: selectedIds,
      source_scope_count: selectedDocuments.length,
      last_error: null,
    })
    .select("id")
    .single();
  if (createError || !created) return NextResponse.json({ error: "无法创建问题卡片。" }, { status: 500 });
  const conversationId = created.id;

  const { error: messageError } = await supabase
    .from("messages")
    .insert({ owner_id: user.id, conversation_id: conversationId, role: "user", content: message });
  if (messageError) {
    await supabase.from("conversations").update({ status: "FAILED", last_error: "问题保存失败，请重试。" }).eq("id", conversationId);
    return NextResponse.json({ error: "无法保存问题，请重试。", conversationId }, { status: 500 });
  }

  const textDocumentIds = textDocuments.map((document) => document.id);
  if (textDocumentIds.length) {
    const { error: lockError } = await service
      .from("documents")
      .update({ analysis_started_at: new Date().toISOString() })
      .eq("owner_id", user.id)
      .in("id", textDocumentIds)
      .is("analysis_started_at", null);
    if (lockError) {
      await supabase.from("conversations").update({ status: "FAILED", last_error: "文字资料暂时无法锁定，请重试。" }).eq("id", conversationId);
      return NextResponse.json({ error: "文字资料暂时无法锁定，请重试。", conversationId }, { status: 500 });
    }
  }

  try {
    const hiAgentConversationId = await createHiAgentConversation({ userId: user.id });
    await supabase.from("conversations").update({ hiagent_conversation_id: hiAgentConversationId }).eq("id", conversationId);
    const result = await chatWithHiAgent({ userId: user.id, conversationId: hiAgentConversationId, query: adaptedQuery });
    const evidenceCards = attachUniqueDocumentIds(result.evidenceCards, selectedDocuments);
    const { data: savedMessage, error: saveError } = await supabase
      .from("messages")
      .insert({ owner_id: user.id, conversation_id: conversationId, role: "assistant", content: result.answer, evidence_cards_json: evidenceCards })
      .select("id")
      .single();
    if (saveError || !savedMessage) {
      await supabase.from("conversations").update({ status: "FAILED", last_error: "回答已完成，但保存失败，请重试。" }).eq("id", conversationId);
      return NextResponse.json({ error: "回答已完成，但保存失败，请重试。", conversationId }, { status: 500 });
    }
    const updatedAt = new Date().toISOString();
    await supabase.from("conversations").update({ status: "COMPLETED", last_error: null, updated_at: updatedAt }).eq("id", conversationId);
    return NextResponse.json({
      conversationId,
      evidenceMessageId: savedMessage.id,
      mode,
      answer: result.answer,
      evidenceCards,
      question: {
        id: conversationId,
        question: message,
        status: "COMPLETED",
        answer: result.answer,
        evidenceCards,
        evidenceCount: evidenceCards.length,
        selectedDocumentIds: selectedIds,
        sourceCount: selectedDocuments.length,
        sourceWarning: null,
        error: null,
        createdAt: updatedAt,
        updatedAt,
      },
    });
  } catch {
    await supabase.from("conversations").update({ status: "FAILED", last_error: "证据分析暂时失败或超时，请重试。" }).eq("id", conversationId);
    return NextResponse.json({ error: "证据分析暂时失败或超时，请重试。", conversationId }, { status: 502 });
  }
}
