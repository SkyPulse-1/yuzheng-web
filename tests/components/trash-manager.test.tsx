// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import { TrashManager } from "../../src/components/trash/trash-manager";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); refresh.mockReset(); });

describe("TrashManager", () => {
  it("restores a source without offering permanent deletion", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ restored: true }) }));
    const purgeAfter = new Date(Date.now() + 10 * 86_400_000).toISOString();
    render(<TrashManager sources={[{ id: "source-1", original_name: "课堂摘录", source_kind: "TEXT", deleted_at: new Date().toISOString(), purge_after: purgeAfter }]} />);

    expect(screen.queryByRole("button", { name: /永久删除/ })).toBeNull();
    await user.click(screen.getByRole("button", { name: "恢复资料" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(fetch).toHaveBeenCalledWith("/api/documents/source-1/restore", { method: "POST" });
  });
});
