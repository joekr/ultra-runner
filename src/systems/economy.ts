// systems/economy.ts — Money management, purchases, race prizes

import type { InventoryState } from "../types";
import { createGearInstance, getGearTemplate, getConsumableTemplate } from "./gear";

// ── Affordability check ──────────────────────────────────────────────

export function canAfford(money: number, cost: number): boolean {
  return money >= cost;
}

// ── Purchase gear ────────────────────────────────────────────────────

export interface BuyGearResult {
  inventory: InventoryState;
  success: boolean;
  error?: string;
}

export function buyGear(templateId: string, inventory: InventoryState): BuyGearResult {
  const template = getGearTemplate(templateId);
  if (!template) {
    return { inventory, success: false, error: `Unknown gear template: ${templateId}` };
  }

  if (!canAfford(inventory.money, template.cost)) {
    return {
      inventory,
      success: false,
      error: `Insufficient funds: need $${template.cost}, have $${inventory.money}`,
    };
  }

  const instance = createGearInstance(templateId);
  const updatedInventory: InventoryState = {
    ...inventory,
    money: inventory.money - template.cost,
  };

  if (template.slot === "shoes") {
    updatedInventory.shoes = [...inventory.shoes, instance];
  } else if (template.slot === "accessories") {
    updatedInventory.accessories = [...inventory.accessories, instance];
  } else {
    updatedInventory.apparel = [...inventory.apparel, instance];
  }

  return { inventory: updatedInventory, success: true };
}

// ── Purchase consumable ──────────────────────────────────────────

export interface BuyConsumableResult {
  inventory: InventoryState;
  success: boolean;
  error?: string;
}

export function buyConsumable(
  templateId: string,
  quantity: number,
  inventory: InventoryState,
): BuyConsumableResult {
  const template = getConsumableTemplate(templateId);
  if (!template) {
    return { inventory, success: false, error: `Unknown consumable: ${templateId}` };
  }

  const totalCost = template.cost * quantity;
  if (!canAfford(inventory.money, totalCost)) {
    return {
      inventory,
      success: false,
      error: `Insufficient funds: need $${totalCost}, have $${inventory.money}`,
    };
  }

  const currentQty = inventory.consumables[templateId] ?? 0;
  return {
    inventory: {
      ...inventory,
      money: inventory.money - totalCost,
      consumables: {
        ...inventory.consumables,
        [templateId]: currentQty + quantity,
      },
    },
    success: true,
  };
}

// ── Race prizes ──────────────────────────────────────────────────────

const BASE_PRIZES = [10, 20, 40, 75, 100, 125, 150, 200, 300, 0]; // tiers 1-10 (Barkley has no prize)

export function racePrize(tier: number, position: number, _totalRunners: number): number {
  const basePrize = BASE_PRIZES[tier - 1] ?? 0;
  const pct = position / _totalRunners;

  // 1st: $20 (5K) to $150 (Marathon)
  // Mid-pack: $10 (5K) to $75 (Marathon)
  // Back: $1-2 participation
  if (position === 1) return Math.floor(basePrize * 2);
  if (position === 2) return Math.floor(basePrize * 1.5);
  if (position === 3) return Math.floor(basePrize * 1.25);
  if (pct <= 0.5) return Math.floor(basePrize * 1);
  if (pct <= 0.75) return Math.floor(basePrize * 0.4);
  return Math.max(1, Math.floor(basePrize * 0.1));
}

// ── Race entry fee ───────────────────────────────────────────────────

export interface EntryFeeResult {
  money: number;
  success: boolean;
  error?: string;
}

export function deductEntryFee(money: number, fee: number): EntryFeeResult {
  if (!canAfford(money, fee)) {
    return {
      money,
      success: false,
      error: `Insufficient funds: need $${fee}, have $${money}`,
    };
  }
  return { money: money - fee, success: true };
}
