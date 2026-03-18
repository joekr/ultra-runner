// systems/gear.ts — Gear template access, equip/unequip, durability

import type { InventoryState, OwnedGear } from "../types";
import gearData from "../data/gear.json";

// ── Gear Template Type ───────────────────────────────────────────────

export interface GearTemplate {
  id: string;
  name: string;
  tier: number;
  cost: number;
  durability: number;
  effects: Record<string, number>;
  description: string;
  slot: "shoes" | "apparel" | "accessories";
  equipSlot?: string; // e.g. "top", "bottom", "socks", "head", "watch", "recovery", "light"
}

// ── Consumable Template Type ────────────────────────────────────────

export interface ConsumableTemplate {
  id: string;
  name: string;
  tier: number;
  cost: number;
  description: string;
  effects: { fatigueReduction: number };
  fuelCategory: "gel" | "chew" | "food" | "drink";
  requiredNutritionIQ: number;
  stackable: boolean;
}

// ── Internal: parse JSON into typed templates ────────────────────────

const shoeTemplates: GearTemplate[] = gearData.shoes.map((s) => ({
  ...s,
  effects: s.effects as Record<string, number>,
  slot: "shoes" as const,
}));

const apparelTemplates: GearTemplate[] = gearData.apparel.map((a) => ({
  ...a,
  effects: a.effects as unknown as Record<string, number>,
  equipSlot: (a as any).equipSlot as string | undefined,
  slot: "apparel" as const,
}));

const accessoryTemplates: GearTemplate[] = gearData.accessories.map((a) => ({
  ...a,
  effects: a.effects as unknown as Record<string, number>,
  equipSlot: (a as any).equipSlot as string | undefined,
  slot: "accessories" as const,
}));

const allTemplates = new Map<string, GearTemplate>();
for (const t of [...shoeTemplates, ...apparelTemplates, ...accessoryTemplates]) {
  allTemplates.set(t.id, t);
}

const consumableTemplates: ConsumableTemplate[] = (
  (gearData as any).consumables ?? []
).map((c: any) => ({
  id: c.id,
  name: c.name,
  tier: c.tier,
  cost: c.cost,
  description: c.description,
  effects: { fatigueReduction: c.effects.fatigueReduction },
  fuelCategory: (c as any).fuelCategory ?? "gel",
  requiredNutritionIQ: c.requiredNutritionIQ ?? 0,
  stackable: c.stackable,
}));

const consumableMap = new Map<string, ConsumableTemplate>();
for (const c of consumableTemplates) {
  consumableMap.set(c.id, c);
}

// ── Template access ──────────────────────────────────────────────────

export function getShoeTemplates(): GearTemplate[] {
  return shoeTemplates;
}

export function getApparelTemplates(): GearTemplate[] {
  return apparelTemplates;
}

export function getAccessoryTemplates(): GearTemplate[] {
  return accessoryTemplates;
}

export function getGearTemplate(templateId: string): GearTemplate | undefined {
  return allTemplates.get(templateId);
}

export function getConsumableTemplates(): ConsumableTemplate[] {
  return consumableTemplates;
}

export function getConsumableTemplate(id: string): ConsumableTemplate | undefined {
  return consumableMap.get(id);
}

// ── Instance creation ────────────────────────────────────────────────

let instanceCounter = 0;

export function createGearInstance(templateId: string): OwnedGear {
  const template = getGearTemplate(templateId);
  if (!template) {
    throw new Error(`Unknown gear template: ${templateId}`);
  }
  instanceCounter++;
  return {
    id: `gear_${templateId}_${instanceCounter}_${Date.now()}`,
    templateId,
    durability: template.durability,
    maxDurability: template.durability,
  };
}

// ── Equip / Unequip ──────────────────────────────────────────────────

export function equipShoe(gearId: string, inventory: InventoryState): InventoryState {
  const shoe = inventory.shoes.find((s) => s.id === gearId);
  if (!shoe) {
    return inventory; // gear not found, no-op
  }
  return { ...inventory, equippedShoe: gearId };
}

export function unequipShoe(inventory: InventoryState): InventoryState {
  return { ...inventory, equippedShoe: null };
}

export function equipApparel(gearId: string, inventory: InventoryState): InventoryState {
  const item = inventory.apparel.find((a) => a.id === gearId);
  if (!item) {
    return inventory; // gear not found, no-op
  }
  if (inventory.equippedApparel.includes(gearId)) {
    return inventory; // already equipped
  }

  // Unequip any item in the same slot (can't wear two shirts)
  const newItemTemplate = getGearTemplate(item.templateId);
  const newItemSlot = newItemTemplate?.equipSlot;
  let newEquipped = [...inventory.equippedApparel];
  if (newItemSlot) {
    newEquipped = newEquipped.filter((equippedId) => {
      const equippedItem = inventory.apparel.find((a) => a.id === equippedId);
      if (!equippedItem) return true;
      const equippedTemplate = getGearTemplate(equippedItem.templateId);
      return equippedTemplate?.equipSlot !== newItemSlot;
    });
  }
  newEquipped.push(gearId);

  return {
    ...inventory,
    equippedApparel: newEquipped,
  };
}

export function unequipApparel(gearId: string, inventory: InventoryState): InventoryState {
  return {
    ...inventory,
    equippedApparel: inventory.equippedApparel.filter((id) => id !== gearId),
  };
}

export function equipAccessory(gearId: string, inventory: InventoryState): InventoryState {
  const item = inventory.accessories.find((a) => a.id === gearId);
  if (!item) {
    return inventory; // gear not found, no-op
  }
  if (inventory.equippedAccessories.includes(gearId)) {
    return inventory; // already equipped
  }

  // Unequip any item in the same slot (can't wear two watches)
  const newItemTemplate = getGearTemplate(item.templateId);
  const newItemSlot = newItemTemplate?.equipSlot;
  let newEquipped = [...inventory.equippedAccessories];
  if (newItemSlot) {
    newEquipped = newEquipped.filter((equippedId) => {
      const equippedItem = inventory.accessories.find((a) => a.id === equippedId);
      if (!equippedItem) return true;
      const equippedTemplate = getGearTemplate(equippedItem.templateId);
      return equippedTemplate?.equipSlot !== newItemSlot;
    });
  }
  newEquipped.push(gearId);

  return {
    ...inventory,
    equippedAccessories: newEquipped,
  };
}

export function unequipAccessory(gearId: string, inventory: InventoryState): InventoryState {
  return {
    ...inventory,
    equippedAccessories: inventory.equippedAccessories.filter((id) => id !== gearId),
  };
}

// ── Equipped bonuses ─────────────────────────────────────────────────

export interface EquippedBonuses {
  speedBonus: number;
  terrainBonuses: Record<string, number>;
  blistReduction: number;
  chafePenalty: number;
  weatherProtection: number;
  heatProtection: number;
  recoveryBonus: number;
  xpBonus: number;
  nightBonus: number;
}

export function getEquippedBonuses(inventory: InventoryState): EquippedBonuses {
  const result: EquippedBonuses = {
    speedBonus: 0,
    terrainBonuses: {},
    blistReduction: 0,
    chafePenalty: 0,
    weatherProtection: 0,
    heatProtection: 0,
    recoveryBonus: 0,
    xpBonus: 0,
    nightBonus: 0,
  };

  // Collect all equipped gear instances
  const equippedItems: OwnedGear[] = [];

  if (inventory.equippedShoe) {
    const shoe = inventory.shoes.find((s) => s.id === inventory.equippedShoe);
    if (shoe) {
      // Dead shoes provide no bonuses
      const condition = getShoeCondition(shoe);
      if (!condition.isDead) {
        equippedItems.push(shoe);
      }
    }
  }

  for (const apparelId of inventory.equippedApparel) {
    const item = inventory.apparel.find((a) => a.id === apparelId);
    if (item) {
      equippedItems.push(item);
    }
  }

  for (const accessoryId of inventory.equippedAccessories) {
    const item = inventory.accessories.find((a) => a.id === accessoryId);
    if (item) {
      equippedItems.push(item);
    }
  }

  // Aggregate effects from templates
  for (const gear of equippedItems) {
    const template = getGearTemplate(gear.templateId);
    if (!template) continue;

    const effects = template.effects;
    if (effects.speedBonus) {
      result.speedBonus += effects.speedBonus;
    }
    if (effects.blistReduction) {
      result.blistReduction += effects.blistReduction;
    }
    if (effects.chafePenalty) {
      result.chafePenalty += effects.chafePenalty;
    }
    if (effects.weatherProtection) {
      result.weatherProtection += effects.weatherProtection;
    }
    if (effects.heatProtection) {
      result.heatProtection += effects.heatProtection;
    }
    if (effects.recoveryBonus) {
      result.recoveryBonus += effects.recoveryBonus;
    }
    if (effects.xpBonus) {
      result.xpBonus += effects.xpBonus;
    }
    if (effects.nightBonus) {
      result.nightBonus += effects.nightBonus;
    }
    // Terrain-specific bonuses: any key containing "terrain" or known terrain names
    if (effects.terrain) {
      // The "terrain" field names a terrain type; the speedBonus applies there
      // Store as terrain-specific bonus
      const terrainType = String(effects.terrain);
      result.terrainBonuses[terrainType] =
        (result.terrainBonuses[terrainType] ?? 0) + (effects.speedBonus ?? 0);
    }
    if (effects.roadPenalty) {
      // Negative bonus for flat_road when wearing trail shoes
      result.terrainBonuses["flat_road"] =
        (result.terrainBonuses["flat_road"] ?? 0) - effects.roadPenalty;
    }
  }

  return result;
}

// ── Shoe durability ──────────────────────────────────────────────────

export function degradeShoe(
  gearId: string,
  miles: number,
  inventory: InventoryState,
): InventoryState {
  return {
    ...inventory,
    shoes: inventory.shoes.map((shoe) => {
      if (shoe.id !== gearId) return shoe;
      return {
        ...shoe,
        durability: Math.max(0, shoe.durability - miles),
      };
    }),
  };
}

export interface ShoeCondition {
  durabilityPct: number;
  isWorn: boolean;
  isDead: boolean;
}

export function getShoeCondition(shoe: OwnedGear): ShoeCondition {
  const durabilityPct = shoe.maxDurability > 0 ? shoe.durability / shoe.maxDurability : 0;
  return {
    durabilityPct,
    isWorn: durabilityPct < 0.2,
    isDead: shoe.durability <= 0,
  };
}
