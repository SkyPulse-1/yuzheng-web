import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  const { id } = await context.params;
  const { data: document, error } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "暂时无法读取文档。" }, { status: 500 });
  if (!document) return NextResponse.json({ error: "文档不存在。" }, { status: 404 });

  const { data, error: signedUrlError } = await supabase.storage.from("documents").createSignedUrl(document.storage_path, 60);
  if (signedUrlError || !data.signedUrl) return NextResponse.json({ error: "暂时无法打开文档。" }, { status: 500 });
  return NextResponse.redirect(data.signedUrl);
}
