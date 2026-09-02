import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { validateDocumentMetadata } from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { buildStoragePath } from "@/lib/uploads/paths";

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
  const service = createServiceClient();

  const { id: libraryId } = await context.params;
  const { data: library } = await supabase.from("libraries").select("id").eq("id", libraryId).maybeSingle();
  if (!library) return NextResponse.json({ error: "知识库不存在。" }, { status: 404 });

  const body = await request.json().catch(() => null) as { name?: unknown; type?: unknown; size?: unknown } | null;
  if (typeof body?.name !== "string" || typeof body.type !== "string" || typeof body.size !== "number") {
    return NextResponse.json({ error: "文件信息无效，请重新选择文件。" }, { status: 400 });
  }
  const validation = validateDocumentMetadata({ name: body.name, type: body.type, size: body.size });
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

  const documentId = randomUUID();
  const storagePath = buildStoragePath({ ownerId: user.id, libraryId, documentId, extension: validation.extension });
  const baseRecord = {
    id: documentId,
    owner_id: user.id,
    library_id: libraryId,
    original_name: body.name,
    mime_type: body.type,
    size_bytes: body.size,
    storage_path: storagePath,
    status: "UPLOADING",
  };

  const { data, error: insertError } = await service
    .from("documents")
    .insert(baseRecord)
    .select("id, owner_id, library_id, original_name, mime_type, size_bytes, storage_path, kb_document_id, status, error_message, page_count, created_at, updated_at")
    .single();

  if (insertError || !data) return NextResponse.json({ error: "无法创建文档记录，请稍后重试。" }, { status: 500 });
  return NextResponse.json({ document: data }, { status: 201 });
}
