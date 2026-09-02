import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getVikingDocumentStatus } from "@/lib/vikingdb/client";
import { isVikingConfigured } from "@/lib/vikingdb/config";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  const service = createServiceClient();

  const { id } = await context.params;
  const { data, error } = await supabase
    .from("documents")
    .select("id, status, error_message, page_count, kb_document_id, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "暂时无法读取文档状态。" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "文档不存在。" }, { status: 404 });

  if (data.status === "PROCESSING" && data.kb_document_id && isVikingConfigured()) {
    try {
      const refreshed = await getVikingDocumentStatus(data.kb_document_id);
      const { data: updated } = await service
        .from("documents")
        .update({ status: refreshed.status, error_message: refreshed.errorMessage, page_count: refreshed.pageCount })
        .eq("id", id)
        .eq("owner_id", auth.user.id)
        .select("id, status, error_message, page_count, kb_document_id, updated_at")
        .single();
      if (updated) return NextResponse.json({ document: updated });
    } catch {
      return NextResponse.json({ document: data, warning: "知识库状态暂时无法刷新。" });
    }
  }
  return NextResponse.json({ document: data });
}
