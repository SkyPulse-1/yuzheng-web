import { NextResponse } from "next/server";

import { validateLibraryInput } from "@/lib/libraries";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

async function getAuthenticatedClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : data.user };
}

export async function GET(_request: Request, context: RouteContext) {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  const { id } = await context.params;
  const { data, error } = await supabase
    .from("libraries")
    .select("id, owner_id, name, description, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "暂时无法读取知识库。" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "知识库不存在。" }, { status: 404 });
  return NextResponse.json({ library: data });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = validateLibraryInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { id } = await context.params;
  const { data, error } = await supabase
    .from("libraries")
    .update(parsed.data)
    .eq("id", id)
    .select("id, owner_id, name, description, created_at, updated_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "更新知识库失败，请稍后重试。" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "知识库不存在。" }, { status: 404 });
  return NextResponse.json({ library: data });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  const { id } = await context.params;
  const { data, error } = await supabase
    .from("libraries")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "删除知识库失败，请稍后重试。" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "知识库不存在。" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
