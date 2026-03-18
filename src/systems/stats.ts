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
