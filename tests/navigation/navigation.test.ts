import { describe, expect, it } from "vitest";

import { getNavigationSection } from "../../src/lib/navigation";

describe("getNavigationSection", () => {
  it("marks only the dashboard as workbench", () => {
    expect(getNavigationSection("/dashboard")).toBe("dashboard");
    expect(getNavigationSection("/")).toBeNull();
  });

  it("groups library management and evidence questions together", () => {
    expect(getNavigationSection("/libraries")).toBe("libraries");
    expect(getNavigationSection("/libraries/library-id")).toBe("libraries");
    expect(getNavigationSection("/assistant")).toBe("libraries");
  });

  it("marks the recycle bin separately", () => {
    expect(getNavigationSection("/trash")).toBe("trash");
  });
});
