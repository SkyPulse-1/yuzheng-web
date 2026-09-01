// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { RecentEvidenceCarousel } from "../../src/components/home/recent-evidence-carousel";
import type { EvidenceCard } from "../../src/lib/hiagent/client";

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
});

afterEach(cleanup);

describe("RecentEvidenceCarousel", () => {
  it("shows the long-march evidence example inside the research desk", () => {
    render(<RecentEvidenceCarousel cards={[]} />);

    expect(screen.getByText("最近研究")).toBeTruthy();
    expect(screen.getByText("长征战略意义比较")).toBeTruthy();
    expect(screen.getByText("原文证据")).toBeTruthy();
    expect(screen.getByText(/A\.pdf/)).toBeTruthy();
  });

  it("switches real evidence cards and links back to the source file", () => {
    const cards: EvidenceCard[] = [
      {
        card_id: "evidence-1",
        claim_type: "概念辨析",
        claim: "第一张卡片的结论。",
        evidence_text: "第一段原文。",
        document_id: "document-1",
        document_name: "第一章.pdf",
        page_number: 8,
      },
      {
        card_id: "evidence-2",
        claim_type: "论证比较",
        claim: "第二张卡片的结论。",
        evidence_text: "第二段原文。",
        document_id: "document-2",
        document_name: "第二章.pdf",
        page_number: 12,
      },
    ];

    render(<RecentEvidenceCarousel cards={cards} />);
    fireEvent.click(screen.getByRole("button", { name: "第 2 张证据" }));

    expect(screen.getByText("论证比较")).toBeTruthy();
    expect(screen.getByText(/第二段原文。/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "查看原文" }).getAttribute("href"))
      .toBe("/api/documents/document-2/file?page=12");
  });
});
