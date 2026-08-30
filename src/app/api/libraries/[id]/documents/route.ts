import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { validateDocumentFile } from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";
import { isVikingConfigured } from "@/lib/vikingdb/config";
import { addVikingDocument } from "@/lib/vikingdb/client";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  const { id } = await context.params;
  const { data: library } = await supabase.from("libraries").select("id").eq("id", id).maybeSingle();
  if (!library) return NextResponse.json({ error: "知识库不存在。" }, { status: 404 });

  const { data, error } = await supabase
    .from("documents")
    .select("id, owner_id, library_id, original_name, mime_type, size_bytes, storage_path, kb_document_id, status, error_message, page_count, created_at, updated_at")
    .eq("library_id", id)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: "暂时无法读取文档。" }, { status: 500 });
  return NextResponse.json({ documents: data });
}

export async function POST(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  const { id: libraryId } = await context.params;
  const { data: library } = await supabase.from("libraries").select("id").eq("id", libraryId).maybeSingle();
  if (!library) return NextResponse.json({ error: "知识库不存在。" }, { status: 404 });

  const form = await request.formData().catch(() => null);
  const value = form?.get("file");
  if (!(value instanceof File)) return NextResponse.json({ error: "请选择要上传的文件。" }, { status: 400 });

  const validation = validateDocumentFile(value);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

  const documentId = randomUUID();
  const storagePath = `${user.id}/${libraryId}/${documentId}.${validation.extension}`;
  const baseRecord = {
    id: documentId,
    owner_id: user.id,
    library_id: libraryId,
    original_name: value.name,
    mime_type: value.type,
    size_bytes: value.size,
    storage_path: storagePath,
    status: "UPLOADING",
  };

  const { error: insertError } = await supabase.from("documents").insert(baseRecord);
  if (insertError) return NextResponse.json({ error: "无法创建文档记录，请稍后重试。" }, { status: 500 });

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, value, { contentType: value.type, upsert: false });

  if (uploadError) {
    await supabase.from("documents").update({ status: "FAILED", error_message: "文件保存失败，请重试。" }).eq("id", documentId);
    return NextResponse.json({ error: "文件保存失败，请重试。" }, { status: 500 });
  }

  let knowledgeBaseDocumentId: string | null = null;
  if (isVikingConfigured()) {
    const { data: signed } = await supabase.storage.from("documents").createSignedUrl(storagePath, 1800);
    try {
      if (!signed?.signedUrl) throw new Error("Signed URL unavailable");
      knowledgeBaseDocumentId = await addVikingDocument({
        documentId,
        ownerId: user.id,
        libraryId,
        originalName: value.name,
        documentType: validation.extension,
        signedUrl: signed.signedUrl,
      });
    } catch {
      await supabase.from("documents").update({ status: "FAILED", error_message: "知识库入库失败，可稍后重试。" }).eq("id", documentId);
      return NextResponse.json({ error: "文件已保存，但知识库入库失败，可稍后重试。" }, { status: 502 });
    }
  }

  const { data, error: updateError } = await supabase
    .from("documents")
    .update({ status: "PROCESSING", error_message: null, kb_document_id: knowledgeBaseDocumentId })
    .eq("id", documentId)
    .select("id, owner_id, library_id, original_name, mime_type, size_bytes, storage_path, kb_document_id, status, error_message, page_count, created_at, updated_at")
    .single();

  if (updateError) return NextResponse.json({ error: "文件已保存，但状态更新失败，请刷新页面。" }, { status: 500 });
  return NextResponse.json({ document: data }, { status: 201 });
}
