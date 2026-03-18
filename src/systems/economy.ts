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

const BASE_PRIZES = [50, 100, 200, 500]; // tiers 1-4

export function racePrize(tier: number, position: number, _totalRunners: number): number {
  const basePrize = BASE_PRIZES[tier - 1] ?? 0;
  const pct = position / _totalRunners;

  // Podium finishes get bonus multipliers
  // 1st place: 2x    (5K: $100, Marathon: $1000)
  // 2nd place: 1.5x  (5K: $75, Marathon: $750)
  // 3rd place: 1.25x (5K: $62, Marathon: $625)
  // Top 50%:   1x    (5K: $50, Marathon: $500)
  // Top 75%:   0.4x  (5K: $20, Marathon: $200)
  // Bottom:    0.1x  (5K: $5, Marathon: $50)
  if (position === 1) return Math.floor(basePrize * 2);
  if (position === 2) return Math.floor(basePrize * 1.5);
  if (position === 3) return Math.floor(basePrize * 1.25);
  if (pct <= 0.5) return Math.floor(basePrize * 1);
  if (pct <= 0.75) return Math.floor(basePrize * 0.4);
  return Math.floor(basePrize * 0.1);
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
