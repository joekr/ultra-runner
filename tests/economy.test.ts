import { describe, it, expect } from "vitest";
import type { InventoryState } from "../src/types";
import { canAfford, buyGear, racePrize, deductEntryFee } from "../src/systems/economy";

// ── Helper ───────────────────────────────────────────────────────────

function makeInventory(overrides?: Partial<InventoryState>): InventoryState {
  return {
    money: 200,
    shoes: [],
    apparel: [],
    equippedShoe: null,
    equippedApparel: [],
    ...overrides,
  };
}

// ── canAfford ────────────────────────────────────────────────────────

describe("canAfford", () => {
  it("returns true when money > cost", () => {
    expect(canAfford(100, 50)).toBe(true);
  });

  it("returns true when money equals cost exactly", () => {
    expect(canAfford(80, 80)).toBe(true);
  });

  it("returns false when money < cost", () => {
    expect(canAfford(50, 100)).toBe(false);
  });

  it("returns true for zero cost", () => {
    expect(canAfford(0, 0)).toBe(true);
  });

  it("returns false for zero money with positive cost", () => {
    expect(canAfford(0, 1)).toBe(false);
  });
});

// ── buyGear ──────────────────────────────────────────────────────────

describe("buyGear", () => {
  it("succeeds and deducts cost for a shoe purchase", () => {
    const inv = makeInventory({ money: 200 });
    const result = buyGear("basic_trainers", inv);
    expect(result.success).toBe(true);
    expect(result.inventory.money).toBe(120); // 200 - 80
    expect(result.inventory.shoes.length).toBe(1);
    expect(result.inventory.shoes[0].templateId).toBe("basic_trainers");
    expect(result.inventory.shoes[0].durability).toBe(300);
  });

  it("succeeds and adds apparel to apparel array", () => {
    const inv = makeInventory({ money: 100 });
    const result = buyGear("tech_tee", inv);
    expect(result.success).toBe(true);
    expect(result.inventory.money).toBe(55); // 100 - 45
    expect(result.inventory.apparel.length).toBe(1);
    expect(result.inventory.apparel[0].templateId).toBe("tech_tee");
  });

  it("fails with insufficient funds", () => {
    const inv = makeInventory({ money: 10 });
    const result = buyGear("basic_trainers", inv);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.inventory.money).toBe(10); // unchanged
    expect(result.inventory.shoes.length).toBe(0);
  });

  it("fails for unknown template", () => {
    const inv = makeInventory({ money: 1000 });
    const result = buyGear("nonexistent", inv);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Unknown gear template");
  });

  it("allows buying free items with zero money", () => {
    const inv = makeInventory({ money: 0 });
    const result = buyGear("cotton_tee", inv); // cost = 0
    expect(result.success).toBe(true);
    expect(result.inventory.money).toBe(0);
    expect(result.inventory.apparel.length).toBe(1);
  });
});

// ── racePrize ────────────────────────────────────────────────────────

describe("racePrize", () => {
  // Tier 1 (5K): base = 50
  it("tier 1 top 10% = 150", () => {
    expect(racePrize(1, 0.05)).toBe(150);
  });

  it("tier 1 exactly 10% = 150", () => {
    expect(racePrize(1, 0.1)).toBe(150);
  });

  it("tier 1 top 25% = 100", () => {
    expect(racePrize(1, 0.2)).toBe(100);
  });

  it("tier 1 exactly 25% = 100", () => {
    expect(racePrize(1, 0.25)).toBe(100);
  });

  it("tier 1 top 50% = 50", () => {
    expect(racePrize(1, 0.4)).toBe(50);
  });

  it("tier 1 exactly 50% = 50", () => {
    expect(racePrize(1, 0.5)).toBe(50);
  });

  it("tier 1 below 50% = 12 (floor of 50 * 0.25)", () => {
    expect(racePrize(1, 0.8)).toBe(12);
  });

  // Tier 2 (10K): base = 100
  it("tier 2 top 10% = 300", () => {
    expect(racePrize(2, 0.05)).toBe(300);
  });

  it("tier 2 top 25% = 200", () => {
    expect(racePrize(2, 0.2)).toBe(200);
  });

  it("tier 2 below 50% = 25", () => {
    expect(racePrize(2, 0.9)).toBe(25);
  });

  // Tier 3 (Half Marathon): base = 200
  it("tier 3 top 10% = 600", () => {
    expect(racePrize(3, 0.08)).toBe(600);
  });

  it("tier 3 top 50% = 200", () => {
    expect(racePrize(3, 0.5)).toBe(200);
  });

  it("tier 3 below 50% = 50", () => {
    expect(racePrize(3, 0.6)).toBe(50);
  });

  // Tier 4 (Marathon): base = 500
  it("tier 4 top 10% = 1500", () => {
    expect(racePrize(4, 0.01)).toBe(1500);
  });

  it("tier 4 top 25% = 1000", () => {
    expect(racePrize(4, 0.15)).toBe(1000);
  });

  it("tier 4 top 50% = 500", () => {
    expect(racePrize(4, 0.35)).toBe(500);
  });

  it("tier 4 below 50% = 125", () => {
    expect(racePrize(4, 0.75)).toBe(125);
  });
});

// ── deductEntryFee ───────────────────────────────────────────────────

describe("deductEntryFee", () => {
  it("deducts fee when affordable", () => {
    const result = deductEntryFee(100, 25);
    expect(result.success).toBe(true);
    expect(result.money).toBe(75);
  });

  it("fails when insufficient funds", () => {
    const result = deductEntryFee(10, 25);
    expect(result.success).toBe(false);
    expect(result.money).toBe(10); // unchanged
    expect(result.error).toBeDefined();
  });

  it("succeeds when money equals fee exactly", () => {
    const result = deductEntryFee(25, 25);
    expect(result.success).toBe(true);
    expect(result.money).toBe(0);
  });
});
