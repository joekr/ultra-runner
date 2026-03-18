// systems/progression.ts — XP/level calc, distance unlock checks

import balance from "../data/balance.json";

// ── Constants from balance.json ──────────────────────────────────────

export const LEVEL_THRESHOLDS: readonly number[] =
  balance.progression.levelThresholds;

export const XP_PER_WORKOUT: number = balance.progression.xpPerWorkout;
export const XP_PER_RACE_BASE: readonly number[] =
  balance.progression.xpPerRaceBase;
export const XP_PER_PR: number = balance.progression.xpPerPR;

// ── Distance unlocks by level ────────────────────────────────────────

export const DISTANCE_UNLOCKS: Record<number, string[]> = {
  1: ["5k"],
  3: ["10k"],
  7: ["half_marathon"],
  12: ["marathon"],
};

// ── Level calculation ────────────────────────────────────────────────

/** Determine current level from cumulative XP */
export function calculateLevel(totalXp: number): number {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
    } else {
      break;
    }
  }
  return level;
}

/** Returns current XP within current level, XP needed for next level, and 0-1 progress */
export function xpToNextLevel(totalXp: number): {
  current: number;
  needed: number;
  progress: number;
} {
  const level = calculateLevel(totalXp);
  const levelIndex = level - 1; // 0-based index into thresholds
  const currentThreshold = LEVEL_THRESHOLDS[levelIndex] ?? 0;

  // If at max level, return full progress
  if (levelIndex + 1 >= LEVEL_THRESHOLDS.length) {
    return { current: 0, needed: 0, progress: 1 };
  }

  const nextThreshold = LEVEL_THRESHOLDS[levelIndex + 1];
  const xpIntoLevel = totalXp - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;

  return {
    current: xpIntoLevel,
    needed: xpNeeded,
    progress: xpNeeded > 0 ? xpIntoLevel / xpNeeded : 1,
  };
}

// ── XP awards ────────────────────────────────────────────────────────

/**
 * Calculate XP earned from a race.
 * @param tier 0-based race tier (0=5k, 1=10k, 2=half, 3=marathon)
 * @param positionPercentile 0-1 where 0 = first, 1 = last
 * @param isPR whether this was a personal record
 */
export function awardRaceXP(
  tier: number,
  positionPercentile: number,
  isPR: boolean,
): number {
  const clampedTier = Math.min(tier, XP_PER_RACE_BASE.length - 1);
  let xp = XP_PER_RACE_BASE[Math.max(0, clampedTier)];

  // Placement bonus: top 10% gets 50% bonus, top 25% gets 25% bonus
  if (positionPercentile <= 0.1) {
    xp = Math.round(xp * 1.5);
  } else if (positionPercentile <= 0.25) {
    xp = Math.round(xp * 1.25);
  }

  // PR bonus
  if (isPR) {
    xp += XP_PER_PR;
  }

  return xp;
}

/** Returns the flat XP per workout completion */
export function awardWorkoutXP(): number {
  return XP_PER_WORKOUT;
}

// ── Unlock checks ────────────────────────────────────────────────────

/**
 * Returns newly unlocked distances for the given level.
 * Compares against currently unlocked list to only return new ones.
 */
export function checkUnlocks(
  level: number,
  currentUnlocked: string[],
): string[] {
  const newlyUnlocked: string[] = [];
  for (const [lvl, distances] of Object.entries(DISTANCE_UNLOCKS)) {
    if (level >= Number(lvl)) {
      for (const dist of distances) {
        if (!currentUnlocked.includes(dist)) {
          newlyUnlocked.push(dist);
        }
      }
    }
  }
  return newlyUnlocked;
}
