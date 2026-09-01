import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { validateTextSourceInput } from "@/lib/text-sources";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  const { id: libraryId } = await context.params;
  const body = await request.json().catch(() => null);
  const validation = validateTextSourceInput(body);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

  const { data: library } = await supabase
    .from("libraries")
    .select("id")
    .eq("id", libraryId)
    .maybeSingle();
  if (!library) return NextResponse.json({ error: "知识库不存在。" }, { status: 404 });

  const { title, content } = validation.data;
  const { data: document, error } = await supabase
    .from("documents")
    .insert({
      owner_id: auth.user.id,
      library_id: libraryId,
      original_name: title,
      mime_type: "text/plain",
      size_bytes: new TextEncoder().encode(content).byteLength,
      storage_path: null,
      source_kind: "TEXT",
      text_content: content,
      status: "READY",
      analysis_status: "NOT_STARTED",
      error_message: null,
    })
    .select("id, library_id, original_name, mime_type, size_bytes, status, source_kind, text_content, analysis_status, analysis_result_json, analysis_started_at, deleted_at, purge_after, created_at, updated_at")
    .single();

  if (error || !document) {
    return NextResponse.json({ error: "文字资料保存失败，请稍后重试。" }, { status: 500 });
  }
  return NextResponse.json({ document }, { status: 201 });
}
