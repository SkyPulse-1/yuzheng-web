import { NextResponse } from "next/server";

import { parseEvidenceCardSnapshot } from "@/lib/evidence-views";
import { createClient } from "@/lib/supabase/server";

type EvidenceViewBody = { messageId?: unknown; cardIndex?: unknown };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  const body = await request.json().catch(() => null) as EvidenceViewBody | null;
  const messageId = typeof body?.messageId === "string" ? body.messageId : "";
  const cardIndex = typeof body?.cardIndex === "number" ? body.cardIndex : -1;
  if (!UUID_PATTERN.test(messageId) || !Number.isInteger(cardIndex) || cardIndex < 0) {
    return NextResponse.json({ error: "无法记录这张证据卡。" }, { status: 400 });
  }

  const { data: message, error: messageError } = await supabase
    .from("messages")
    .select("id, evidence_cards_json")
    .eq("id", messageId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (messageError) return NextResponse.json({ error: "暂时无法记录阅读位置。" }, { status: 500 });
  if (!message) return NextResponse.json({ error: "没有找到这张证据卡。" }, { status: 404 });

  const cards = Array.isArray(message.evidence_cards_json) ? message.evidence_cards_json : [];
  const card = parseEvidenceCardSnapshot(cards[cardIndex]);
  if (!card) return NextResponse.json({ error: "无法记录这张证据卡。" }, { status: 400 });

  const { error } = await supabase.from("evidence_card_views").upsert({
    owner_id: user.id,
    message_id: messageId,
    card_index: cardIndex,
    card_json: card,
    opened_at: new Date().toISOString(),
  }, { onConflict: "owner_id,message_id,card_index" });
  if (error) return NextResponse.json({ error: "暂时无法记录阅读位置。" }, { status: 500 });

  return new NextResponse(null, { status: 204 });
}
