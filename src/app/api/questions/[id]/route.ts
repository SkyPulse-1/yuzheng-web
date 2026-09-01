import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  const { id } = await context.params;
  const { data: deleted, error } = await supabase
    .from("conversations")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "问题卡片删除失败，请重试。" }, { status: 500 });
  if (!deleted) return NextResponse.json({ error: "问题卡片不存在。" }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
