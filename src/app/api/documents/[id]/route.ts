import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  const { id } = await context.params;
  const { data: document, error: readError } = await supabase
    .from("documents")
    .select("id, original_name, deleted_at")
    .eq("id", id)
    .maybeSingle();

  if (readError) return NextResponse.json({ error: "暂时无法读取文档。" }, { status: 500 });
  if (!document) return NextResponse.json({ error: "文档不存在。" }, { status: 404 });

  if (document.deleted_at) return NextResponse.json({ deleted: true });
  const deletedAt = new Date();
  const purgeAfter = new Date(deletedAt.getTime() + 30 * 86_400_000);
  const { error: deleteError } = await supabase
    .from("documents")
    .update({
      deleted_at: deletedAt.toISOString(),
      purge_after: purgeAfter.toISOString(),
      error_message: null,
    })
    .eq("id", id);
  if (deleteError) return NextResponse.json({ error: "暂时无法移入回收站，请稍后重试。" }, { status: 500 });
  return NextResponse.json({ deleted: true, purgeAfter: purgeAfter.toISOString() });
}
