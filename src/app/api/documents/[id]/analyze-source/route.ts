import { NextResponse } from "next/server";

import { chatWithHiAgent, createHiAgentConversation, isHiAgentConfigured, isHiAgentTransportConfigured } from "@/lib/hiagent/client";
import { analyzeSingleSource, readStoredSingleSourceAnalysis } from "@/lib/single-source-analysis";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  const { id } = await context.params;
  const { data: document } = await supabase
    .from("documents")
    .select("id, original_name, source_kind, text_content, analysis_result_json, analysis_status, analysis_started_at, deleted_at")
    .eq("id", id)
    .maybeSingle();
  if (!document || document.deleted_at) return NextResponse.json({ error: "资料不存在或已移入回收站。" }, { status: 404 });

  const cached = readStoredSingleSourceAnalysis(document.analysis_result_json);
  if (cached) {
    return NextResponse.json({ result: cached, status: document.analysis_status, cached: true });
  }
  if (document.analysis_status === "PROCESSING") {
    return NextResponse.json({ error: "这份资料正在分析，请稍候。" }, { status: 409 });
  }

  const sourceKind = document.source_kind === "TEXT" ? "TEXT" : "FILE";
  const configured = sourceKind === "TEXT" ? isHiAgentTransportConfigured() : isHiAgentConfigured();
  if (!configured) {
    return NextResponse.json({
      error: sourceKind === "TEXT"
        ? "文字分析服务尚未配置完成，请稍后再试。"
        : "文件检索尚未启用可靠的资料筛选，暂时不能生成可核验结论。",
    }, { status: 503 });
  }

  const startedAt = document.analysis_started_at ?? new Date().toISOString();
  const { error: lockError } = await supabase
    .from("documents")
    .update({ analysis_started_at: startedAt, analysis_status: "PROCESSING", error_message: null })
    .eq("id", id);
  if (lockError) return NextResponse.json({ error: "暂时无法启动分析，请重试。" }, { status: 500 });

  try {
    const analyzed = await analyzeSingleSource({
      userId: auth.user.id,
      sourceKind,
      sourceName: document.original_name,
      sourceText: document.text_content,
      dependencies: {
        createConversation: (userId) => createHiAgentConversation({ userId }),
        analyze: (request) => chatWithHiAgent(request),
      },
    });
    const message = analyzed.status === "PARTIAL" ? "部分内容暂未得到可靠结果，可以稍后重新分析。" : null;
    const { error: saveError } = await supabase
      .from("documents")
      .update({
        analysis_result_json: analyzed.result,
        analysis_status: analyzed.status,
        error_message: message,
      })
      .eq("id", id);
    if (saveError) return NextResponse.json({ error: "分析已完成，但结果保存失败，请重试。" }, { status: 500 });
    return NextResponse.json({ result: analyzed.result, status: analyzed.status, cached: false, message });
  } catch {
    await supabase
      .from("documents")
      .update({ analysis_status: "FAILED", error_message: "没有得到可核验的分析结果，请重试。" })
      .eq("id", id);
    return NextResponse.json({ error: "分析暂时失败或超时，资料已保留，请重试。" }, { status: 502 });
  }
}
