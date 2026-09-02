import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  const service = createServiceClient();

  const { id } = await context.params;
  const { data: document } = await supabase
    .from("documents")
    .select("id, analysis_status, deleted_at, purge_after")
    .eq("id", id)
    .maybeSingle();
  if (!document || !document.deleted_at || !document.purge_after) {
    return NextResponse.json({ error: "回收站中没有这份资料。" }, { status: 404 });
  }
  if (new Date(document.purge_after).getTime() <= Date.now()) {
    return NextResponse.json({ error: "这份资料已超过 30 天恢复期限。" }, { status: 410 });
  }

  const status = ["READY", "PARTIAL"].includes(document.analysis_status) ? "READY" : "STORED";
  const { error } = await service
    .from("documents")
    .update({ deleted_at: null, purge_after: null, status })
    .eq("id", id)
    .eq("owner_id", user.id);
  if (error) return NextResponse.json({ error: "恢复失败，请稍后重试。" }, { status: 500 });
  return NextResponse.json({ restored: true });
}
