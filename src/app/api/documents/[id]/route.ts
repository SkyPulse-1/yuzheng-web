import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { deleteVikingDocument } from "@/lib/vikingdb/client";
import { isVikingConfigured } from "@/lib/vikingdb/config";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  const { id } = await context.params;
  const { data: document, error: readError } = await supabase
    .from("documents")
    .select("id, storage_path, kb_document_id")
    .eq("id", id)
    .maybeSingle();

  if (readError) return NextResponse.json({ error: "暂时无法读取文档。" }, { status: 500 });
  if (!document) return NextResponse.json({ error: "文档不存在。" }, { status: 404 });

  await supabase.from("documents").update({ status: "DELETING", error_message: null }).eq("id", id);
  if (document.kb_document_id) {
    if (!isVikingConfigured()) {
      await supabase.from("documents").update({ status: "FAILED", error_message: "当前无法完成完整删除，请稍后重试。" }).eq("id", id);
      return NextResponse.json({ error: "当前无法完成完整删除，请稍后重试。" }, { status: 503 });
    }
    try {
      await deleteVikingDocument(document.kb_document_id);
    } catch {
      await supabase.from("documents").update({ status: "FAILED", error_message: "文档关联内容删除失败，请重试。" }).eq("id", id);
      return NextResponse.json({ error: "知识库文档删除失败，请稍后重试。" }, { status: 502 });
    }
  }
  const { error: storageError } = await supabase.storage.from("documents").remove([document.storage_path]);
  if (storageError) {
    await supabase.from("documents").update({ status: "FAILED", error_message: "删除文件失败，请重试。" }).eq("id", id);
    return NextResponse.json({ error: "删除文件失败，请稍后重试。" }, { status: 500 });
  }

  const { data: deleted, error: deleteError } = await supabase.from("documents").delete().eq("id", id).select("id").maybeSingle();
  if (deleteError) return NextResponse.json({ error: "删除文档记录失败，请稍后重试。" }, { status: 500 });
  if (!deleted) return NextResponse.json({ error: "文档不存在。" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
