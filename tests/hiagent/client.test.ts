import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  chatWithHiAgent,
  createHiAgentConversation,
  parseHiAgentSse,
} from "../../src/lib/hiagent/client";

describe("HiAgent conversational client", () => {
  beforeEach(() => {
    vi.stubEnv("HIAGENT_BASE_URL", "https://school.example/api/proxy/api/v1");
    vi.stubEnv("HIAGENT_API_KEY", "server-only-test-key");
    vi.stubEnv("HIAGENT_TRUSTED_FILTERS_ENABLED", "true");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("creates a remote conversation without exposing the API key", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ AppConversationID: "remote-conversation-1" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));
    vi.stubGlobal("fetch", fetchMock);

    await expect(createHiAgentConversation({ userId: "user-1" })).resolves.toBe("remote-conversation-1");
    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://school.example/api/proxy/api/v1/create_conversation");
    expect(request.headers).toMatchObject({ Apikey: "server-only-test-key" });
    expect(JSON.parse(String(request.body))).toEqual({ UserID: "user-1" });
  });

  it("sends a query using the existing conversation and aggregates message events", async () => {
    const stream = [
      'data: {"event":"message","answer":"第一段"}',
      "",
      'data: {"event":"message","answer":"第二段"}',
      "",
      'data: {"event":"done"}',
      "",
    ].join("\n");
    const fetchMock = vi.fn().mockResolvedValue(new Response(stream, {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(chatWithHiAgent({
      userId: "user-1",
      conversationId: "remote-conversation-1",
      query: "请总结",
    })).resolves.toEqual({ answer: "第一段第二段", evidenceCards: [] });

    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://school.example/api/proxy/api/v1/chat_query_v2");
    expect(JSON.parse(String(request.body))).toEqual({
      UserID: "user-1",
      AppConversationID: "remote-conversation-1",
      Query: "请总结",
    });
  });

  it("keeps structured evidence cards from a final message", () => {
    const result = parseHiAgentSse([
      'data: {"event":"message","answer":"结论"}',
      "",
      'data: {"event":"message","output":{"answer":"结论","evidence_cards":[{"claim":"主张","evidence_text":"原文","document_name":"资料.pdf","page_number":2}]}}',
      "",
    ].join("\n"));

    expect(result.answer).toBe("结论");
    expect(result.evidenceCards).toHaveLength(1);
    expect(result.evidenceCards[0].document_name).toBe("资料.pdf");
  });

  it("supports standard SSE event lines and nested message data", () => {
    const result = parseHiAgentSse([
      "event: message",
      'data: {"data":{"answer":"嵌套回答"}}',
      "",
    ].join("\n"));

    expect(result).toEqual({ answer: "嵌套回答", evidenceCards: [] });
  });

  it("returns a generic failure that never contains the secret", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("server-only-test-key", { status: 500 })));
    await expect(createHiAgentConversation({ userId: "user-1" })).rejects.not.toThrow("server-only-test-key");
  });
});
