// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MotionModeToggle } from "../../src/components/assistant/motion-mode-toggle";

afterEach(cleanup);

describe("MotionModeToggle", () => {
  it("announces the active version and requests a mode change", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MotionModeToggle value="native" onChange={onChange} />);

    expect(screen.getByRole("button", { name: "A 原生" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "B Motion" }).getAttribute("aria-pressed")).toBe("false");
    await user.click(screen.getByRole("button", { name: "B Motion" }));
    expect(onChange).toHaveBeenCalledWith("motion");
  });
});
