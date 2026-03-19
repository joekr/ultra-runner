// systems/achievements.ts — Achievement checking logic

import type { GameState, StatsState } from "../types";
import { xpToStat } from "../state/gameState";
import { getRaceById } from "./race";
import achievementsData from "../data/achievements.json";

// ── Types ────────────────────────────────────────────────────────────

interface AchievementDef {
  id: string;
  name: string;
  description: string;
  category: string;
  conditionType: string;
  conditionValue: Record<string, unknown>;
}

const allAchievements = achievementsData as AchievementDef[];

// ── Main check ───────────────────────────────────────────────────────

/**
 * Check all achievements against the current game state.
 * Returns an array of achievement IDs that were newly earned this check.
 */
export function checkAchievements(state: GameState): string[] {
  const earned = new Set(state.history.achievements);
  const newlyEarned: string[] = [];

  for (const ach of allAchievements) {
    if (earned.has(ach.id)) continue;
    if (isConditionMet(ach, state)) {
      newlyEarned.push(ach.id);
    }
  }

  return newlyEarned;
}

/**
 * Get the full achievement definition by ID.
 */
export function getAchievementById(id: string): AchievementDef | undefined {
  return allAchievements.find((a) => a.id === id);
}

// ── Condition evaluation ─────────────────────────────────────────────

function isConditionMet(ach: AchievementDef, state: GameState): boolean {
  const cv = ach.conditionValue;

  switch (ach.conditionType) {
    case "race_finish":
      return checkRaceFinish(state, cv);

    case "race_time":
      return checkRaceTime(state, cv);

    case "race_dnf":
      return state.history.totalRacesDNF > 0;

    case "stat_threshold":
      return checkStatThreshold(state, cv);

    case "total_miles":
      return state.training.totalMiles >= (cv.miles as number);

    case "training_streak":
      return state.training.streak >= (cv.days as number);

    case "races_finished":
      return state.history.totalRacesFinished >= (cv.count as number);

    case "gear_purchase":
      return checkGearPurchase(state, cv);

    case "race_placement":
      return checkRacePlacement(state, cv);

    case "shoe_durability_zero":
      return state.inventory.shoes.some((s) => s.durability <= 0);

    case "personal_record":
      return state.history.completedRaces.some((r) => r.personalBest);

    case "all_races_in_tier":
      return checkAllRacesInTier(state, cv);

    case "race_flag":
      return !!(state.flags.raceAchievementFlags ?? {})[cv.flag as string];

    default:
      return false;
  }
}

function checkRaceFinish(state: GameState, cv: Record<string, unknown>): boolean {
  const tier = cv.tier as number;
  return state.history.completedRaces.some((r) => {
    if (r.result !== "finished") return false;
    const raceDef = getRaceById(r.raceId);
    return raceDef != null && raceDef.tier >= tier;
  });
}

function checkRaceTime(state: GameState, cv: Record<string, unknown>): boolean {
  const tier = cv.tier as number;
  const maxTimeMinutes = cv.maxTimeMinutes as number;
  const maxTimeSeconds = maxTimeMinutes * 60;

  return state.history.completedRaces.some((r) => {
    if (r.result !== "finished") return false;
    const raceDef = getRaceById(r.raceId);
    return raceDef != null && raceDef.tier === tier && r.finishTime <= maxTimeSeconds;
  });
}

function checkStatThreshold(state: GameState, cv: Record<string, unknown>): boolean {
  const statName = cv.stat as keyof StatsState;
  const threshold = cv.value as number;
  const entry = state.stats[statName];
  if (!entry) return false;
  const displayValue = xpToStat(entry.trainingXp);
  return displayValue >= threshold;
}

function checkGearPurchase(state: GameState, cv: Record<string, unknown>): boolean {
  const category = cv.category as string;
  if (category === "shoes") {
    // Check if they have any shoe beyond the starter basic_trainers
    return state.inventory.shoes.some((s) => s.templateId !== "basic_trainers");
  }
  if (category === "apparel") {
    // Check if they have any apparel beyond the starters
    return state.inventory.apparel.some(
      (a) => a.templateId !== "cotton_tee" && a.templateId !== "split_shorts",
    );
  }
  if (category === "accessories") {
    return state.inventory.accessories.length > 0;
  }
  return false;
}

function checkRacePlacement(state: GameState, cv: Record<string, unknown>): boolean {
  const maxPlace = cv.maxPlace as number;
  return state.history.completedRaces.some(
    (r) => r.result === "finished" && r.position <= maxPlace,
  );
}

function checkAllRacesInTier(_state: GameState, _cv: Record<string, unknown>): boolean {
  // TODO: Requires knowing all race IDs for a tier and checking completedRaces
  // For now, return false until race data catalog is fully wired
  return false;
}
