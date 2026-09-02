import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { splitStoragePath } from "@/lib/uploads/paths";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  const service = createServiceClient();

  const { id } = await context.params;
  const { data: document, error } = await supabase
    .from("documents")
    .select("id, owner_id, storage_path, size_bytes, status")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "暂时无法读取文档。" }, { status: 500 });
  if (!document) return NextResponse.json({ error: "文档不存在。" }, { status: 404 });

  const body = await request.json().catch(() => ({})) as { failed?: unknown };
  if (body.failed === true) {
    if (document.status !== "UPLOADING") {
      return NextResponse.json({ error: "当前文档状态不能标记为上传失败。" }, { status: 409 });
    }
    const { data: failed } = await service
      .from("documents")
      .update({ status: "FAILED", error_message: "文件上传中断，请重新上传。" })
      .eq("id", id)
      .eq("owner_id", user.id)
      .select("id, status, error_message, updated_at")
      .single();
    return NextResponse.json({ document: failed });
  }

  if (document.status === "STORED") return NextResponse.json({ document });
  if (document.status !== "UPLOADING") {
    return NextResponse.json({ error: "当前文档状态不能完成上传。" }, { status: 409 });
  }

  const { directory, filename } = splitStoragePath(document.storage_path);
  const { data: objects, error: listError } = await supabase.storage
    .from("documents")
    .list(directory, { limit: 10, search: filename });
  if (listError) return NextResponse.json({ error: "暂时无法确认文件状态。" }, { status: 502 });
  const storedObject = objects?.find((item) => item.name === filename);
  const storedSize = Number(storedObject?.metadata?.size ?? -1);
  if (!storedObject || storedSize !== Number(document.size_bytes)) {
    return NextResponse.json({ error: "文件上传尚未完成，请稍后重试。" }, { status: 409 });
  }

  const { data: updated, error: updateError } = await service
    .from("documents")
    .update({ status: "STORED", error_message: "文件已保存，学校文档处理服务尚未接通。" })
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("id, status, error_message, updated_at")
    .single();
  if (updateError) return NextResponse.json({ error: "文件已保存，但状态更新失败，请刷新页面。" }, { status: 500 });
  return NextResponse.json({ document: updated });
}
