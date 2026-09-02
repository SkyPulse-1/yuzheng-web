import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { addVikingDocument } from "@/lib/vikingdb/client";
import { isVikingConfigured } from "@/lib/vikingdb/config";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  const service = createServiceClient();
  if (!isVikingConfigured()) return NextResponse.json({ error: "文档检索服务尚未配置，文件已安全保存；完成配置后可以重试。" }, { status: 503 });

  const { id } = await context.params;
  const { data: document, error } = await supabase
    .from("documents")
    .select("id, owner_id, library_id, original_name, mime_type, storage_path")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "暂时无法读取文档。" }, { status: 500 });
  if (!document) return NextResponse.json({ error: "文档不存在。" }, { status: 404 });

  const { data: signed } = await supabase.storage.from("documents").createSignedUrl(document.storage_path, 1800);
  if (!signed?.signedUrl) return NextResponse.json({ error: "暂时无法准备文档下载链接。" }, { status: 500 });

  const documentType = document.original_name.split(".").pop()?.toLowerCase() ?? "";
  try {
    const kbDocumentId = await addVikingDocument({
      documentId: document.id,
      ownerId: document.owner_id,
      libraryId: document.library_id,
      originalName: document.original_name,
      documentType,
      signedUrl: signed.signedUrl,
    });
    const { data: updated } = await service
      .from("documents")
      .update({ kb_document_id: kbDocumentId, status: "PROCESSING", error_message: null })
      .eq("id", id)
      .eq("owner_id", auth.user.id)
      .select("id, status, kb_document_id, updated_at")
      .single();
    return NextResponse.json({ document: updated });
  } catch {
    await service
      .from("documents")
      .update({ status: "FAILED", error_message: "文档处理失败，可稍后重试。" })
      .eq("id", id)
      .eq("owner_id", auth.user.id);
    return NextResponse.json({ error: "文档处理失败，请检查服务设置后重试。" }, { status: 502 });
  }
}
