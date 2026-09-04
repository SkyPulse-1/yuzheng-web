// @vitest-environment jsdom

import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SourceShelf, type AssistantSource } from "../../src/components/assistant/source-shelf";

afterEach(cleanup);

const sources: AssistantSource[] = [
  { id: "source-1", title: "第一章", kind: "TEXT", sourceText: "原文", analysisResult: null, analysisStatus: "IDLE" },
  { id: "source-2", title: "第二章", kind: "TEXT", sourceText: "原文", analysisResult: null, analysisStatus: "IDLE" },
];

function ShelfHarness({ onConfirm }: { onConfirm: (ids: string[]) => void }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  return (
    <SourceShelf
      sources={sources}
      selectedIds={selectedIds}
      pending={false}
      onChange={setSelectedIds}
      onConfirm={onConfirm}
    />
  );
}

describe("SourceShelf", () => {
  it("keeps checkbox changes as a draft until the confirmation button is clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ShelfHarness onConfirm={onConfirm} />);

    expect((screen.getByRole("button", { name: "确认资料" }) as HTMLButtonElement).disabled).toBe(true);
    await user.click(screen.getByRole("checkbox", { name: /第一章/ }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getAllByText("待确认 1 份资料")).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "确认资料" }));
    expect(onConfirm).toHaveBeenCalledWith(["source-1"]);
  });

  it("disables confirmation while a single-source analysis is pending", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const { rerender } = render(
      <SourceShelf sources={sources} selectedIds={["source-1"]} pending={false} onChange={() => undefined} onConfirm={onConfirm} />,
    );

    rerender(<SourceShelf sources={sources} selectedIds={["source-1"]} pending onChange={() => undefined} onConfirm={onConfirm} />);
    expect((screen.getByRole("button", { name: "正在准备分析" }) as HTMLButtonElement).disabled).toBe(true);
    await user.click(screen.getByRole("button", { name: "正在准备分析" }));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
