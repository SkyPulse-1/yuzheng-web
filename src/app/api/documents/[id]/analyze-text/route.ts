import { NextResponse } from "next/server";

import { chatWithHiAgent, createHiAgentConversation, isHiAgentTransportConfigured } from "@/lib/hiagent/client";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { analyzeTextSourceContent } from "@/lib/text-analysis";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  const service = createServiceClient();
  if (!isHiAgentTransportConfigured()) {
    return NextResponse.json({ error: "文字分析功能尚未配置完成，请稍后再试。" }, { status: 503 });
  }

  const { id } = await context.params;
  const { data: document } = await supabase
    .from("documents")
    .select("id, source_kind, text_content, analysis_status, analysis_started_at, deleted_at")
    .eq("id", id)
    .maybeSingle();
  if (!document || document.deleted_at) return NextResponse.json({ error: "文字资料不存在。" }, { status: 404 });
  if (document.source_kind !== "TEXT" || !document.text_content) {
    return NextResponse.json({ error: "该资料不能使用文字分析。" }, { status: 400 });
  }
  if (document.analysis_status === "PROCESSING") {
    return NextResponse.json({ error: "这份资料正在分析，请稍候。" }, { status: 409 });
  }

  const startedAt = document.analysis_started_at ?? new Date().toISOString();
  const { error: lockError } = await service
    .from("documents")
    .update({
      analysis_started_at: startedAt,
      analysis_status: "PROCESSING",
      status: "PROCESSING",
      error_message: null,
    })
    .eq("id", id)
    .eq("owner_id", auth.user.id);
  if (lockError) return NextResponse.json({ error: "暂时无法启动分析，请重试。" }, { status: 500 });

  try {
    const analyzed = await analyzeTextSourceContent({
      userId: auth.user.id,
      text: document.text_content,
      dependencies: {
        createConversation: (userId) => createHiAgentConversation({ userId }),
        analyze: async ({ userId, conversationId, query }) => {
          const result = await chatWithHiAgent({ userId, conversationId, query });
          return result.answer;
        },
      },
    });
    const message = analyzed.status === "PARTIAL" ? "部分内容暂未得到可靠结果，可以稍后重新分析。" : null;
    const { error } = await service
      .from("documents")
      .update({
        analysis_result_json: analyzed.result,
        analysis_status: analyzed.status,
        status: "READY",
        error_message: message,
      })
      .eq("id", id)
      .eq("owner_id", auth.user.id);
    if (error) return NextResponse.json({ error: "分析已完成，但结果保存失败，请重试。" }, { status: 500 });
    return NextResponse.json({ result: analyzed.result, status: analyzed.status, message });
  } catch {
    await service
      .from("documents")
      .update({
        analysis_status: "FAILED",
        status: "STORED",
        error_message: "没有得到可核验的分析结果，请重试。",
      })
      .eq("id", id)
      .eq("owner_id", auth.user.id);
    return NextResponse.json({ error: "文字分析暂时失败或超时，资料已保留，请重试。" }, { status: 502 });
  }
}
