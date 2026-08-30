import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  const { id } = await context.params;
  const { data, error } = await supabase
    .from("documents")
    .select("id, status, error_message, page_count, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "暂时无法读取文档状态。" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "文档不存在。" }, { status: 404 });
  return NextResponse.json({ document: data });
}
