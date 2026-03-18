import { describe, it, expect } from "vitest";

describe("project setup", () => {
  it("should run tests successfully", () => {
    expect(1 + 1).toBe(2);
  });

  it("should support basic assertions", () => {
    const name = "Ultra Runner Simulator";
    expect(name).toContain("Ultra");
    expect(name.length).toBeGreaterThan(0);
  });
});
