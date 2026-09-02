// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { NativeAnalysisDeck } from "../../src/components/assistant/native-analysis-deck";
import type { AnalysisDeckItem } from "../../src/lib/analysis-deck";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const first: AnalysisDeckItem[] = [
  { id: "section:content_summary", kind: "section", sectionKey: "content_summary" },
];
const second: AnalysisDeckItem[] = [
  ...first,
  { id: "section:key_points", kind: "section", sectionKey: "key_points" },
];

function stubMotionPreference(reduce: boolean) {
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({
    matches: reduce,
    media: "(prefers-reduced-motion: reduce)",
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

describe("NativeAnalysisDeck", () => {
  it("animates newly inserted or shifted deck items", () => {
    stubMotionPreference(false);
    const animate = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "animate", { configurable: true, value: animate });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, top: 0, left: 0, right: 280, bottom: 280, width: 280, height: 280,
      toJSON: () => ({}),
    });

    const { rerender } = render(<NativeAnalysisDeck items={first} renderItem={(item) => <span>{item.id}</span>} />);
    animate.mockClear();
    rerender(<NativeAnalysisDeck items={second} renderItem={(item) => <span>{item.id}</span>} />);

    expect(screen.getAllByTestId("analysis-deck-item").map((node) => node.dataset.deckItemId)).toEqual([
      "section:content_summary",
      "section:key_points",
    ]);
    expect(animate).toHaveBeenCalled();
  });

  it("does not animate when reduced motion is enabled", () => {
    stubMotionPreference(true);
    const animate = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "animate", { configurable: true, value: animate });

    const { rerender } = render(<NativeAnalysisDeck items={first} renderItem={(item) => <span>{item.id}</span>} />);
    animate.mockClear();
    rerender(<NativeAnalysisDeck items={second} renderItem={(item) => <span>{item.id}</span>} />);

    expect(animate).not.toHaveBeenCalled();
  });
});
