import { describe, it, expect } from "vitest";
import type { InventoryState } from "../src/types";
import { canAfford, buyGear, racePrize, deductEntryFee } from "../src/systems/economy";

// ── Helper ───────────────────────────────────────────────────────────

function makeInventory(overrides?: Partial<InventoryState>): InventoryState {
  return {
    money: 200,
    shoes: [],
    apparel: [],
    accessories: [],
    equippedShoe: null,
    equippedApparel: [],
    equippedAccessories: [],
    consumables: {},
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
  // racePrize(tier, position, totalRunners)
  // Tier 1 (5K): base = 50

  it("1st place gets 2x base", () => {
    expect(racePrize(1, 1, 100)).toBe(100); // 50 * 2
  });

  it("2nd place gets 1.5x base", () => {
    expect(racePrize(1, 2, 100)).toBe(75); // 50 * 1.5
  });

  it("3rd place gets 1.25x base", () => {
    expect(racePrize(1, 3, 100)).toBe(62); // floor(50 * 1.25)
  });

  it("top 50% gets 1x base", () => {
    expect(racePrize(1, 40, 100)).toBe(50); // 50 * 1
  });

  it("top 75% gets 0.4x base", () => {
    expect(racePrize(1, 60, 100)).toBe(20); // 50 * 0.4
  });

  it("bottom 25% gets 0.1x base", () => {
    expect(racePrize(1, 90, 100)).toBe(5); // 50 * 0.1
  });

  // Tier 4 (Marathon): base = 500
  it("marathon 1st place = 1000", () => {
    expect(racePrize(4, 1, 500)).toBe(1000); // 500 * 2
  });

  it("marathon 2nd place = 750", () => {
    expect(racePrize(4, 2, 500)).toBe(750); // 500 * 1.5
  });

  it("marathon 3rd place = 625", () => {
    expect(racePrize(4, 3, 500)).toBe(625); // floor(500 * 1.25)
  });

  it("marathon mid-pack = 500", () => {
    expect(racePrize(4, 200, 500)).toBe(500); // 500 * 1
  });

  it("marathon back of pack = 50", () => {
    expect(racePrize(4, 450, 500)).toBe(50); // 500 * 0.1
  });

  it("podium pays significantly more than back of pack", () => {
    const first = racePrize(4, 1, 500);
    const last = racePrize(4, 490, 500);
    expect(first).toBe(1000);
    expect(last).toBe(50);
    expect(first / last).toBe(20);
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
