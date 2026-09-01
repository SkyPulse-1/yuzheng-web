// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AnalysisResultCards } from "../../src/components/analysis/analysis-result-cards";

afterEach(cleanup);

describe("AnalysisResultCards", () => {
  it("always renders the four sections and opens a fullscreen detail", async () => {
    const user = userEvent.setup();
    render(<AnalysisResultCards
      sourceTitle="第一章"
      sourceText="前文。证据必须能够回到原文。后文。"
      result={{
        content_summary: [{ text: "材料强调可核验。", sources: [{ quote: "证据必须能够回到原文" }] }],
        key_points: [],
        source_evidence: [],
        uncertainties: [],
      }}
    />);

    expect(screen.getByText("内容摘要")).toBeTruthy();
    expect(screen.getByText("关键观点")).toBeTruthy();
    expect(screen.getByText("原文依据")).toBeTruthy();
    expect(screen.getByText("信息不足与歧义")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /内容摘要/ }));
    const dialog = screen.getByRole("dialog", { name: "内容摘要详情" });
    expect(dialog).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: "材料强调可核验。" }));
    expect(screen.getByText("证据必须能够回到原文")).toBeTruthy();
  });
});
