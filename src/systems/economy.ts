// systems/economy.ts — Money management, purchases, race prizes

import type { InventoryState } from "../types";
import { createGearInstance, getGearTemplate } from "./gear";
import balanceData from "../data/balance.json";

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
  } else {
    updatedInventory.apparel = [...inventory.apparel, instance];
  }

  return { inventory: updatedInventory, success: true };
}

// ── Race prizes ──────────────────────────────────────────────────────

const BASE_PRIZES = [50, 100, 200, 500]; // tiers 1-4

export function racePrize(tier: number, positionPercentile: number): number {
  const basePrize = BASE_PRIZES[tier - 1] ?? 0;
  const multipliers = balanceData.economy.prizeMultipliers;

  if (positionPercentile <= 0.1) return basePrize * multipliers.top10pct;
  if (positionPercentile <= 0.25) return basePrize * multipliers.top25pct;
  if (positionPercentile <= 0.5) return basePrize * multipliers.top50pct;
  return Math.floor(basePrize * multipliers.other);
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
