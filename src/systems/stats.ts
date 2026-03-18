// systems/stats.ts — Stat formulas, XP-to-value curve, scaling

import type { StatsState, StatEntry } from "../types";
import { xpToStat } from "../state/gameState";

// Re-export for convenience
export { xpToStat };

/** Convenience wrapper: get the display value (1-100) for a single stat entry */
export function getStatValue(stat: StatEntry): number {
  return xpToStat(stat.trainingXp);
}

/** Returns all 6 display values as a Record */
export function getAllStatValues(
  stats: StatsState,
): Record<string, number> {
  return {
    endurance: xpToStat(stats.endurance.trainingXp),
    speed: xpToStat(stats.speed.trainingXp),
    strength: xpToStat(stats.strength.trainingXp),
    mentalToughness: xpToStat(stats.mentalToughness.trainingXp),
    recovery: xpToStat(stats.recovery.trainingXp),
    nutritionIQ: xpToStat(stats.nutritionIQ.trainingXp),
  };
}

/** Average of all 6 stat display values, rounded */
export function fitnessLevel(stats: StatsState): number {
  const vals = getAllStatValues(stats);
  const all = Object.values(vals);
  return Math.round(all.reduce((a, b) => a + b, 0) / all.length);
}

/**
 * Fatigue accumulation multiplier based on fitness.
 * A brand new runner (fitness ~1) gets multiplier ~1.0 (full fatigue).
 * An elite runner (fitness ~80+) gets multiplier ~0.35 (65% less fatigue).
 *
 * Curve: 1.0 - 0.65 * (fitness / 100)^0.7
 * The exponent <1 means early fitness gains matter most — going from
 * fitness 1→20 helps a LOT more than 60→80.
 */
export function fatigueCurveMultiplier(stats: StatsState, level?: number): number {
  const fitness = fitnessLevel(stats);
  const baseMult = Math.max(0.3, 1.0 - 0.65 * Math.pow(fitness / 100, 0.7));
  // Level perk: additional fatigue reduction stacks on top
  const levelReduction = (level ?? 1) * 0.008;
  return Math.max(0.2, baseMult * (1 - levelReduction));
}

/**
 * Daily passive fatigue recovery — how much fatigue drops just from
 * sleeping/living between training days. Higher fitness = more recovery.
 *
 * New runner: ~5 fatigue recovered per day
 * Fit runner (fitness 50): ~12
 * Elite runner (fitness 80+): ~18
 */
export function dailyPassiveFatigueRecovery(stats: StatsState, level?: number): number {
  const fitness = fitnessLevel(stats);
  const levelBonus = (level ?? 1) * 0.2;
  return 5 + (fitness / 100) * 15 + levelBonus;
}

/**
 * Rest day fatigue recovery — much more than passive, scales with
 * Recovery stat specifically.
 *
 * New runner: ~18
 * Experienced (recovery stat 50): ~28
 * Elite (recovery stat 80+): ~35
 */
export function restDayFatigueRecovery(stats: StatsState): number {
  const recoveryStat = xpToStat(stats.recovery.trainingXp);
  return 15 + (recoveryStat / 100) * 25;
}

/**
 * Per-level bonuses. Every level slightly improves the runner's
 * base capabilities, representing the compounding effect of
 * consistent training over time.
 */
export interface LevelUpPerks {
  level: number;
  fatigueReduction: number;   // cumulative % less fatigue at this level
  paceBonus: number;          // cumulative % faster base pace
  recoveryBonus: number;      // cumulative bonus to daily passive recovery
  description: string[];      // human-readable perk descriptions for this level
}

/**
 * Calculate the cumulative perks for a given level.
 * Each level adds a small incremental bonus:
 *   - Fatigue reduction: +0.8% per level (level 10 = 8% less fatigue)
 *   - Pace bonus: +0.3% per level (level 10 = 3% faster)
 *   - Recovery bonus: +0.2 per level (level 10 = +2 passive recovery/day)
 */
export function getLevelPerks(level: number): LevelUpPerks {
  const fatigueReduction = level * 0.008;   // 0.8% per level
  const paceBonus = level * 0.003;          // 0.3% per level
  const recoveryBonus = level * 0.2;        // +0.2 per level

  return {
    level,
    fatigueReduction,
    paceBonus,
    recoveryBonus,
    description: [], // filled by describeLevelUp
  };
}

/**
 * Describe what changed between two levels for display in the UI.
 */
export function describeLevelUp(oldLevel: number, newLevel: number): string[] {
  const oldPerks = getLevelPerks(oldLevel);
  const newPerks = getLevelPerks(newLevel);
  const lines: string[] = [];

  const fatigueDelta = (newPerks.fatigueReduction - oldPerks.fatigueReduction) * 100;
  const paceDelta = (newPerks.paceBonus - oldPerks.paceBonus) * 100;
  const recoveryDelta = newPerks.recoveryBonus - oldPerks.recoveryBonus;

  if (fatigueDelta > 0) {
    lines.push(`Fatigue rate -${fatigueDelta.toFixed(1)}% (total: -${(newPerks.fatigueReduction * 100).toFixed(1)}%)`);
  }
  if (paceDelta > 0) {
    lines.push(`Base pace +${paceDelta.toFixed(1)}% faster (total: +${(newPerks.paceBonus * 100).toFixed(1)}%)`);
  }
  if (recoveryDelta > 0) {
    lines.push(`Daily recovery +${recoveryDelta.toFixed(1)} (total: +${newPerks.recoveryBonus.toFixed(1)}/day)`);
  }

  return lines;
}
