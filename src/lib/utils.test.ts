import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("combines conditional class names", () => {
    expect(cn("base", undefined, ["nested", { active: true, hidden: false }])).toBe(
      "base nested active",
    );
  });

  it("lets later Tailwind classes override earlier conflicting classes", () => {
    expect(cn("px-2 text-sm", "px-4", "text-lg")).toBe("px-4 text-lg");
  });
});
