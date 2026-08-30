import { NextResponse } from "next/server";

import { validateLibraryInput } from "@/lib/libraries";
import { createClient } from "@/lib/supabase/server";

async function getAuthenticatedClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : data.user };
}

export async function GET() {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  const { data, error } = await supabase
    .from("libraries")
    .select("id, owner_id, name, description, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: "暂时无法读取知识库。" }, { status: 500 });
  return NextResponse.json({ libraries: data });
}

export async function POST(request: Request) {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = validateLibraryInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data, error } = await supabase
    .from("libraries")
    .insert({ owner_id: user.id, ...parsed.data })
    .select("id, owner_id, name, description, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: "创建知识库失败，请稍后重试。" }, { status: 500 });
  return NextResponse.json({ library: data }, { status: 201 });
}
