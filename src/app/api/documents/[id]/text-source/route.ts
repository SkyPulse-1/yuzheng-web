import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { validateTextSourceInput } from "@/lib/text-sources";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const validation = validateTextSourceInput(body);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

  const { id } = await context.params;
  const { data: document } = await supabase
    .from("documents")
    .select("id, source_kind, analysis_started_at, analysis_status, deleted_at")
    .eq("id", id)
    .maybeSingle();
  if (!document || document.deleted_at) return NextResponse.json({ error: "文字资料不存在。" }, { status: 404 });
  if (document.source_kind !== "TEXT") return NextResponse.json({ error: "该资料不是粘贴文字。" }, { status: 400 });
  if (document.analysis_started_at || document.analysis_status !== "NOT_STARTED") {
    return NextResponse.json({ error: "分析开始后不能修改原文。需要修改时，请删除后重新创建。" }, { status: 409 });
  }

  const { title, content } = validation.data;
  const { data: updated, error } = await supabase
    .from("documents")
    .update({
      original_name: title,
      text_content: content,
      size_bytes: new TextEncoder().encode(content).byteLength,
    })
    .eq("id", id)
    .select("id, original_name, text_content, analysis_status, analysis_started_at, updated_at")
    .single();
  if (error || !updated) return NextResponse.json({ error: "文字资料更新失败，请稍后重试。" }, { status: 500 });
  return NextResponse.json({ document: updated });
}
