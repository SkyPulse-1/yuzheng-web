// @vitest-environment jsdom

import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { RecentEvidenceCarousel } from "../../src/components/home/recent-evidence-carousel";
import type { HomeResearchWorkspace } from "../../src/lib/evidence-views";

let prefersReducedMotion = false;

beforeEach(() => {
  prefersReducedMotion = false;
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({
      matches: prefersReducedMotion,
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

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const workspaces: HomeResearchWorkspace[] = [
  {
    libraryId: "library-1",
    libraryName: "现代史研究",
    workspaceHref: "/assistant?libraryId=library-1",
    question: "比较两份材料的论证差异",
    updatedAt: "2026-09-01T10:00:00Z",
    card: {
      card_id: "evidence-1",
      claim_type: "论证比较",
      claim: "第一张卡片的结论。",
      evidence_text: "第一段原文。",
      document_id: "document-1",
      document_name: "第一章.pdf",
      page_number: 8,
    },
    sourceHref: "/api/documents/document-1/file?page=8",
  },
  {
    libraryId: "library-2",
    libraryName: "语言学笔记",
    workspaceHref: "/assistant?libraryId=library-2",
    question: "归纳作者的核心判断",
    updatedAt: "2026-09-01T09:00:00Z",
    card: {
      card_id: "evidence-2",
      claim_type: "核心判断",
      claim: "第二张卡片的结论。",
      evidence_text: "第二段原文。",
      document_id: "document-2",
      document_name: "课堂笔记",
      page_number: null,
    },
    sourceHref: "/api/documents/document-2/file",
  },
];

describe("RecentEvidenceCarousel", () => {
  it("shows a real empty state instead of demo evidence", () => {
    render(<RecentEvidenceCarousel workspaces={[]} loggedIn loadFailed={false} />);

    expect(screen.queryByText("长征战略意义比较")).toBeNull();
    expect(screen.queryByText("查看原文")).toBeNull();
    expect(screen.getByRole("link", { name: "进入知识库" }).getAttribute("href")).toBe("/libraries");
  });

  it("links the workspace, analysis question, and validated source", () => {
    render(<RecentEvidenceCarousel workspaces={workspaces} loggedIn loadFailed={false} />);

    expect(screen.getByRole("link", { name: "现代史研究" }).getAttribute("href"))
      .toBe("/assistant?libraryId=library-1");
    expect(screen.getByRole("link", { name: "比较两份材料的论证差异" }).getAttribute("href"))
      .toBe("/assistant?libraryId=library-1");
    expect(screen.getByRole("link", { name: "查看原文" }).getAttribute("href"))
      .toBe("/api/documents/document-1/file?page=8");
  });

  it("changes workspaces after twenty seconds and pauses on hover", () => {
    vi.useFakeTimers();
    render(<RecentEvidenceCarousel workspaces={workspaces} loggedIn loadFailed={false} />);

    act(() => vi.advanceTimersByTime(19_999));
    expect(screen.getByText("第一张卡片的结论。")).toBeTruthy();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText("第二张卡片的结论。")).toBeTruthy();

    fireEvent.mouseEnter(screen.getByRole("region", { name: "最近研究证据" }));
    act(() => vi.advanceTimersByTime(20_000));
    expect(screen.getByText("第二张卡片的结论。")).toBeTruthy();
  });

  it("does not rotate automatically when reduced motion is preferred", () => {
    prefersReducedMotion = true;
    vi.useFakeTimers();
    render(<RecentEvidenceCarousel workspaces={workspaces} loggedIn loadFailed={false} />);

    act(() => vi.advanceTimersByTime(40_000));
    expect(screen.getByText("第一张卡片的结论。")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "查看第 2 个工作台：语言学笔记" }));
    expect(screen.getByText("第二张卡片的结论。")).toBeTruthy();
  });

  it("does not invent a source link when a real workspace has no validated card", () => {
    render(<RecentEvidenceCarousel workspaces={[{ ...workspaces[0], card: null, sourceHref: null }]} loggedIn loadFailed={false} />);

    expect(screen.getByText("这次分析没有形成可回溯的原文证据")).toBeTruthy();
    expect(screen.queryByText("查看原文")).toBeNull();
    expect(screen.getByRole("link", { name: "继续研究" }).getAttribute("href"))
      .toBe("/assistant?libraryId=library-1");
  });
});
