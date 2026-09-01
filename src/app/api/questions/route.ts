import { NextResponse } from "next/server";

import { buildQuestionCards, QUESTION_PAGE_SIZE, type QuestionConversationRow, type QuestionMessageRow } from "@/lib/questions";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  const url = new URL(request.url);
  const libraryId = url.searchParams.get("libraryId")?.trim() ?? "";
  const query = url.searchParams.get("query")?.trim().slice(0, 100) ?? "";
  const cursor = url.searchParams.get("cursor")?.trim() ?? "";
  if (!libraryId) return NextResponse.json({ error: "请选择知识库。" }, { status: 400 });

  const { data: library } = await supabase.from("libraries").select("id").eq("id", libraryId).maybeSingle();
  if (!library) return NextResponse.json({ error: "知识库不存在。" }, { status: 404 });

  let conversationQuery = supabase
    .from("conversations")
    .select("id, title, status, selected_document_ids, source_scope_count, source_warning, last_error, created_at, updated_at")
    .eq("library_id", libraryId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(QUESTION_PAGE_SIZE + 1);
  if (query) conversationQuery = conversationQuery.ilike("title", `%${query}%`);
  if (cursor) conversationQuery = conversationQuery.lt("updated_at", cursor);
  const { data: conversationRows, error } = await conversationQuery;
  if (error) return NextResponse.json({ error: "暂时无法读取问题卡片。" }, { status: 500 });

  const hasMore = (conversationRows?.length ?? 0) > QUESTION_PAGE_SIZE;
  const conversations = (conversationRows ?? []).slice(0, QUESTION_PAGE_SIZE) as QuestionConversationRow[];
  const ids = conversations.map((conversation) => conversation.id);
  const { data: messageRows } = ids.length
    ? await supabase
        .from("messages")
        .select("id, conversation_id, role, content, evidence_cards_json, created_at")
        .in("conversation_id", ids)
        .order("created_at", { ascending: true })
    : { data: [] };

  const questions = buildQuestionCards(conversations, (messageRows ?? []) as QuestionMessageRow[]);
  return NextResponse.json({
    questions,
    nextCursor: hasMore ? conversations.at(-1)?.updated_at ?? null : null,
  });
}
