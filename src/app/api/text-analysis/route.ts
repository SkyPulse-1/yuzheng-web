import { NextResponse } from "next/server";

import {
  chatWithHiAgent,
  createHiAgentConversation,
  isHiAgentConfigured,
} from "@/lib/hiagent/client";
import { createClient } from "@/lib/supabase/server";
import { analyzePastedTextRequest } from "@/lib/text-analysis";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const body = await request.json().catch(() => null);

  const result = await analyzePastedTextRequest({ userId: auth.user?.id, body }, {
    libraryExists: async (libraryId) => {
      const { data, error } = await supabase
        .from("libraries")
        .select("id")
        .eq("id", libraryId)
        .maybeSingle();
      return !error && Boolean(data);
    },
    isHiAgentConfigured,
    createConversation: (userId) => createHiAgentConversation({ userId }),
    analyze: async ({ userId, conversationId, query }) => {
      const response = await chatWithHiAgent({ userId, conversationId, query });
      return response.answer;
    },
  });

  return NextResponse.json(result.body, { status: result.status });
}
