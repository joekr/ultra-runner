import { describe, it, expect } from "vitest";
import type { InventoryState, OwnedGear } from "../src/types";
import {
  getShoeTemplates,
  getApparelTemplates,
  getGearTemplate,
  createGearInstance,
  equipShoe,
  unequipShoe,
  equipApparel,
  unequipApparel,
  getEquippedBonuses,
  degradeShoe,
  getShoeCondition,
} from "../src/systems/gear";

// ── Helper: build a minimal test inventory ───────────────────────────

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

// ── Template access ──────────────────────────────────────────────────

describe("getShoeTemplates", () => {
  it("returns all shoe templates from gear.json", () => {
    const shoes = getShoeTemplates();
    expect(shoes.length).toBe(6);
    expect(shoes.map((s) => s.id)).toContain("basic_trainers");
    expect(shoes.map((s) => s.id)).toContain("cushioned_road");
    expect(shoes.map((s) => s.id)).toContain("trail_shoes");
    expect(shoes.map((s) => s.id)).toContain("carbon_racer");
    expect(shoes.map((s) => s.id)).toContain("premium_trail");
    expect(shoes.map((s) => s.id)).toContain("ultra_cushion");
    shoes.forEach((s) => expect(s.slot).toBe("shoes"));
  });
});

describe("getApparelTemplates", () => {
  it("returns all apparel templates from gear.json", () => {
    const apparel = getApparelTemplates();
    expect(apparel.length).toBe(9);
    expect(apparel.map((a) => a.id)).toContain("cotton_tee");
    expect(apparel.map((a) => a.id)).toContain("running_socks");
    expect(apparel.map((a) => a.id)).toContain("racing_singlet");
    expect(apparel.map((a) => a.id)).toContain("compression_socks");
    apparel.forEach((a) => expect(a.slot).toBe("apparel"));
  });
});

describe("getGearTemplate", () => {
  it("returns a template by ID", () => {
    const t = getGearTemplate("basic_trainers");
    expect(t).toBeDefined();
    expect(t!.name).toBe("Basic Trainers");
    expect(t!.cost).toBe(80);
  });

  it("returns undefined for unknown ID", () => {
    expect(getGearTemplate("nonexistent")).toBeUndefined();
  });
});

// ── Instance creation ────────────────────────────────────────────────

describe("createGearInstance", () => {
  it("creates an OwnedGear with full durability", () => {
    const instance = createGearInstance("basic_trainers");
    expect(instance.templateId).toBe("basic_trainers");
    expect(instance.durability).toBe(300);
    expect(instance.maxDurability).toBe(300);
    expect(instance.id).toBeTruthy();
  });

  it("creates unique IDs for each instance", () => {
    const a = createGearInstance("basic_trainers");
    const b = createGearInstance("basic_trainers");
    expect(a.id).not.toBe(b.id);
  });

  it("throws for unknown template", () => {
    expect(() => createGearInstance("fake")).toThrow("Unknown gear template: fake");
  });
});

// ── Equip / Unequip Shoes ────────────────────────────────────────────

describe("equipShoe", () => {
  it("sets equippedShoe to the given gearId", () => {
    const shoe: OwnedGear = { id: "s1", templateId: "basic_trainers", durability: 300, maxDurability: 300 };
    const inv = makeInventory({ shoes: [shoe] });
    const result = equipShoe("s1", inv);
    expect(result.equippedShoe).toBe("s1");
  });

  it("replaces previously equipped shoe (only one at a time)", () => {
    const s1: OwnedGear = { id: "s1", templateId: "basic_trainers", durability: 300, maxDurability: 300 };
    const s2: OwnedGear = { id: "s2", templateId: "cushioned_road", durability: 400, maxDurability: 400 };
    const inv = makeInventory({ shoes: [s1, s2], equippedShoe: "s1" });
    const result = equipShoe("s2", inv);
    expect(result.equippedShoe).toBe("s2");
  });

  it("no-ops if gearId not found in inventory", () => {
    const inv = makeInventory();
    const result = equipShoe("nonexistent", inv);
    expect(result.equippedShoe).toBeNull();
  });
});

describe("unequipShoe", () => {
  it("sets equippedShoe to null", () => {
    const inv = makeInventory({ equippedShoe: "s1" });
    const result = unequipShoe(inv);
    expect(result.equippedShoe).toBeNull();
  });
});

// ── Equip / Unequip Apparel ──────────────────────────────────────────

describe("equipApparel", () => {
  it("adds gearId to equippedApparel array", () => {
    const item: OwnedGear = { id: "a1", templateId: "cotton_tee", durability: 9999, maxDurability: 9999 };
    const inv = makeInventory({ apparel: [item] });
    const result = equipApparel("a1", inv);
    expect(result.equippedApparel).toContain("a1");
  });

  it("does not duplicate if already equipped", () => {
    const item: OwnedGear = { id: "a1", templateId: "cotton_tee", durability: 9999, maxDurability: 9999 };
    const inv = makeInventory({ apparel: [item], equippedApparel: ["a1"] });
    const result = equipApparel("a1", inv);
    expect(result.equippedApparel).toEqual(["a1"]);
  });

  it("no-ops if gearId not found in inventory", () => {
    const inv = makeInventory();
    const result = equipApparel("nonexistent", inv);
    expect(result.equippedApparel).toEqual([]);
  });
});

describe("unequipApparel", () => {
  it("removes gearId from equippedApparel", () => {
    const inv = makeInventory({ equippedApparel: ["a1", "a2"] });
    const result = unequipApparel("a1", inv);
    expect(result.equippedApparel).toEqual(["a2"]);
  });
});

// ── Equipped bonuses ─────────────────────────────────────────────────

describe("getEquippedBonuses", () => {
  it("returns zero bonuses with no equipment", () => {
    const inv = makeInventory();
    const bonuses = getEquippedBonuses(inv);
    expect(bonuses.speedBonus).toBe(0);
    expect(bonuses.blistReduction).toBe(0);
    expect(bonuses.chafePenalty).toBe(0);
    expect(Object.keys(bonuses.terrainBonuses).length).toBe(0);
  });

  it("aggregates bonuses from multiple equipped items", () => {
    const shoe: OwnedGear = { id: "s1", templateId: "cushioned_road", durability: 400, maxDurability: 400 };
    const socks: OwnedGear = { id: "a1", templateId: "running_socks", durability: 9999, maxDurability: 9999 };
    const tee: OwnedGear = { id: "a2", templateId: "cotton_tee", durability: 9999, maxDurability: 9999 };

    const inv = makeInventory({
      shoes: [shoe],
      apparel: [socks, tee],
      equippedShoe: "s1",
      equippedApparel: ["a1", "a2"],
    });

    const bonuses = getEquippedBonuses(inv);
    expect(bonuses.speedBonus).toBeCloseTo(0.05);
    expect(bonuses.blistReduction).toBeCloseTo(0.3);
    expect(bonuses.chafePenalty).toBeCloseTo(0.05);
  });

  it("gives no bonuses from dead shoes", () => {
    const shoe: OwnedGear = { id: "s1", templateId: "cushioned_road", durability: 0, maxDurability: 400 };
    const inv = makeInventory({
      shoes: [shoe],
      equippedShoe: "s1",
    });

    const bonuses = getEquippedBonuses(inv);
    expect(bonuses.speedBonus).toBe(0);
  });

  it("handles trail shoe terrain bonuses and road penalty", () => {
    const shoe: OwnedGear = { id: "s1", templateId: "trail_shoes", durability: 350, maxDurability: 350 };
    const inv = makeInventory({
      shoes: [shoe],
      equippedShoe: "s1",
    });

    const bonuses = getEquippedBonuses(inv);
    expect(bonuses.speedBonus).toBeCloseTo(0.10);
    expect(bonuses.terrainBonuses["flat_road"]).toBeCloseTo(-0.05);
  });
});

// ── Shoe durability ──────────────────────────────────────────────────

describe("degradeShoe", () => {
  it("reduces durability by the given miles", () => {
    const shoe: OwnedGear = { id: "s1", templateId: "basic_trainers", durability: 300, maxDurability: 300 };
    const inv = makeInventory({ shoes: [shoe] });
    const result = degradeShoe("s1", 50, inv);
    expect(result.shoes[0].durability).toBe(250);
  });

  it("clamps durability to 0", () => {
    const shoe: OwnedGear = { id: "s1", templateId: "basic_trainers", durability: 10, maxDurability: 300 };
    const inv = makeInventory({ shoes: [shoe] });
    const result = degradeShoe("s1", 50, inv);
    expect(result.shoes[0].durability).toBe(0);
  });

  it("does not affect other shoes", () => {
    const s1: OwnedGear = { id: "s1", templateId: "basic_trainers", durability: 300, maxDurability: 300 };
    const s2: OwnedGear = { id: "s2", templateId: "cushioned_road", durability: 400, maxDurability: 400 };
    const inv = makeInventory({ shoes: [s1, s2] });
    const result = degradeShoe("s1", 100, inv);
    expect(result.shoes[0].durability).toBe(200);
    expect(result.shoes[1].durability).toBe(400);
  });
});

describe("getShoeCondition", () => {
  it("reports healthy shoe correctly", () => {
    const shoe: OwnedGear = { id: "s1", templateId: "basic_trainers", durability: 300, maxDurability: 300 };
    const cond = getShoeCondition(shoe);
    expect(cond.durabilityPct).toBeCloseTo(1.0);
    expect(cond.isWorn).toBe(false);
    expect(cond.isDead).toBe(false);
  });

  it("reports worn shoe at < 20% durability", () => {
    const shoe: OwnedGear = { id: "s1", templateId: "basic_trainers", durability: 50, maxDurability: 300 };
    const cond = getShoeCondition(shoe);
    expect(cond.durabilityPct).toBeCloseTo(50 / 300);
    expect(cond.isWorn).toBe(true);
    expect(cond.isDead).toBe(false);
  });

  it("reports dead shoe at 0 durability", () => {
    const shoe: OwnedGear = { id: "s1", templateId: "basic_trainers", durability: 0, maxDurability: 300 };
    const cond = getShoeCondition(shoe);
    expect(cond.durabilityPct).toBe(0);
    expect(cond.isWorn).toBe(true);
    expect(cond.isDead).toBe(true);
  });

  it("boundary: exactly 20% is not worn", () => {
    const shoe: OwnedGear = { id: "s1", templateId: "basic_trainers", durability: 60, maxDurability: 300 };
    const cond = getShoeCondition(shoe);
    // 60/300 = 0.2 — not strictly less than 0.2
    expect(cond.isWorn).toBe(false);
  });

  it("boundary: just below 20% is worn", () => {
    const shoe: OwnedGear = { id: "s1", templateId: "basic_trainers", durability: 59, maxDurability: 300 };
    const cond = getShoeCondition(shoe);
    expect(cond.isWorn).toBe(true);
  });
});
