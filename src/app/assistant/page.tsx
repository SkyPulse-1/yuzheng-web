import { notFound, redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { AssistantWorkspace } from "@/components/assistant/assistant-workspace";
import type { AssistantSource } from "@/components/assistant/source-shelf";
import { buildQuestionCards, QUESTION_PAGE_SIZE, type QuestionConversationRow, type QuestionMessageRow } from "@/lib/questions";
import { isAssistantSourceAvailable } from "@/lib/assistant-sources";
import { readStoredSingleSourceAnalysis } from "@/lib/single-source-analysis";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AssistantPage({ searchParams }: { searchParams: Promise<{ libraryId?: string }> }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const { libraryId } = await searchParams;
  if (!libraryId) redirect("/libraries");
  const { data: library } = await supabase.from("libraries").select("id, name").eq("id", libraryId).maybeSingle();
  if (!library) notFound();
  const { data: documents } = await supabase.from("documents").select("id, original_name, source_kind, status, text_content, analysis_result_json, analysis_status").eq("library_id", libraryId).is("deleted_at", null).order("original_name");
  const sources = (documents ?? [])
    .filter(isAssistantSourceAvailable)
    .map((document) => ({
      id: document.id,
      title: document.original_name,
      kind: document.source_kind === "TEXT" ? "TEXT" : "FILE",
      sourceText: document.text_content ?? "",
      analysisResult: readStoredSingleSourceAnalysis(document.analysis_result_json),
      analysisStatus: document.analysis_status ?? "NOT_STARTED",
    })) as AssistantSource[];

  const { data: conversationRows } = await supabase.from("conversations").select("id, title, status, selected_document_ids, source_scope_count, source_warning, last_error, created_at, updated_at").eq("library_id", libraryId).is("deleted_at", null).order("updated_at", { ascending: false }).limit(QUESTION_PAGE_SIZE + 1);
  const hasMore = (conversationRows?.length ?? 0) > QUESTION_PAGE_SIZE;
  const conversations = (conversationRows ?? []).slice(0, QUESTION_PAGE_SIZE) as QuestionConversationRow[];
  const conversationIds = conversations.map((conversation) => conversation.id);
  const { data: messageRows } = conversationIds.length ? await supabase.from("messages").select("id, conversation_id, role, content, evidence_cards_json, created_at").in("conversation_id", conversationIds).order("created_at", { ascending: true }) : { data: [] };
  const initialQuestions = buildQuestionCards(conversations, (messageRows ?? []) as QuestionMessageRow[]);
  const initialNextCursor = hasMore ? conversations.at(-1)?.updated_at ?? null : null;

  return <main className="app-page"><AppHeader /><AssistantWorkspace libraryId={library.id} libraryName={library.name} sources={sources} initialQuestions={initialQuestions} initialNextCursor={initialNextCursor} /></main>;
}
