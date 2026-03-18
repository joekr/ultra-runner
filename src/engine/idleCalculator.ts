/**
 * Idle/Offline Progression Calculator
 *
 * When the player returns after being away, this module computes what
 * happened while they were gone: auto-completed easy workouts at 50%
 * efficiency, rest days, and substituted rest for hard workouts.
 */

import type {
  GameState,
  IdleResult,
  IdleWorkoutEntry,
  IdleRestSubstitution,
  StatsState,
} from "../types";
import balance from "../data/balance.json";
import workouts from "../data/workouts.json";
import { GAME_HOURS_PER_REAL_HOUR } from "./clock";

const MAX_IDLE_HOURS = balance.idle.maxHours;
const IDLE_EFFICIENCY = balance.idle.efficiency;
const REST_RECOVERY_BASE = balance.idle.restRecoveryBase;
const REST_RECOVERY_PER_STAT = balance.idle.restRecoveryPerRecoveryStat;
const SUBSTITUTED_REST_RECOVERY = balance.idle.substitutedRestRecovery;

const HOURS_PER_DAY = 24;
const DAYS_PER_SEASON = 28;
const SEASONS = ["spring", "summer", "fall", "winter"] as const;

/** Build a lookup from workout id to its data. */
const workoutMap = new Map(workouts.map((w) => [w.id, w]));

/**
 * Compute what the player's runner did while the game was closed.
 *
 * Returns null if the player was away for less than ~36 seconds
 * (0.01 real hours), since there's nothing meaningful to simulate.
 */
export function computeIdleGains(
  state: GameState,
  nowMs: number,
): IdleResult | null {
  const elapsedMs = nowMs - state.lastTickAt;
  let realHoursAway = elapsedMs / 3_600_000;

  if (realHoursAway < 0.01) {
    return null;
  }

  const idleCapped = realHoursAway > MAX_IDLE_HOURS;
  const effectiveHours = Math.min(realHoursAway, MAX_IDLE_HOURS);

  const gameDaysAdvanced = Math.floor(
    (effectiveHours * GAME_HOURS_PER_REAL_HOUR) / HOURS_PER_DAY,
  );

  if (gameDaysAdvanced < 1) {
    // Not enough time for a full game day — still return a result with 0 days
    return {
      realHoursAway,
      gameDaysAdvanced: 0,
      workoutsCompleted: [],
      statGains: {},
      fatigueChange: 0,
      moneyEarned: 0,
      idleCapped,
    };
  }

  const workoutsCompleted: Array<IdleWorkoutEntry | IdleRestSubstitution> = [];
  const statGains: Partial<Record<keyof StatsState, number>> = {};
  let fatigueChange = 0;

  // Get recovery stat value for rest day calculations.
  // The recovery stat XP is stored; we use the raw trainingXp as a proxy
  // (the xpToStat formula gives 1-100, but we just use trainingXp * factor).
  // Per the design: rest reduces fatigue by recoveryAmount + recovery stat * 0.2.
  // "recovery stat" here means the display value derived from XP.
  // For simplicity we use the formula: min(100, 1 + 14.2 * log10(1 + xp))
  const recoveryXp = state.stats.recovery.trainingXp;
  const recoveryStat = Math.min(100, 1 + 14.2 * Math.log10(1 + recoveryXp));

  for (let d = 0; d < gameDaysAdvanced; d++) {
    const dayIndex = state.calendar.gameDay + d;
    const weekDay = (state.calendar.weekDay + d) % 7;
    const plannedWorkout = state.calendar.trainingPlan[weekDay].workout;
    const workoutData = workoutMap.get(plannedWorkout);

    if (workoutData && workoutData.idleEligible) {
      if (plannedWorkout === "rest") {
        // Rest day: reduce fatigue
        const recovery = REST_RECOVERY_BASE + recoveryStat * REST_RECOVERY_PER_STAT;
        fatigueChange -= recovery;
        workoutsCompleted.push({
          day: dayIndex,
          type: "rest",
          efficiency: 1,
        });
      } else {
        // Idle-eligible workout (easy_run, cross_training): award XP at reduced efficiency
        const baseXp = workoutData.baseXpPerDay;
        const effectiveXp = baseXp * IDLE_EFFICIENCY;
        const dist = workoutData.statDistribution as Record<string, number>;

        for (const [stat, weight] of Object.entries(dist)) {
          const key = stat as keyof StatsState;
          statGains[key] = (statGains[key] ?? 0) + effectiveXp * weight;
        }

        // Add fatigue from workout (use baseFatiguePerTick as a per-day proxy)
        fatigueChange += workoutData.baseFatiguePerTick * IDLE_EFFICIENCY;

        workoutsCompleted.push({
          day: dayIndex,
          type: plannedWorkout,
          efficiency: IDLE_EFFICIENCY,
        });
      }
    } else {
      // Hard workout (long_run, intervals) or unknown: substitute rest
      fatigueChange -= SUBSTITUTED_REST_RECOVERY;
      workoutsCompleted.push({
        day: dayIndex,
        type: "rest_substituted",
        originalPlan: plannedWorkout,
      } as IdleRestSubstitution);
    }
  }

  return {
    realHoursAway,
    gameDaysAdvanced,
    workoutsCompleted,
    statGains,
    fatigueChange,
    moneyEarned: 0, // Sponsorship income: future feature
    idleCapped,
  };
}

/**
 * Apply computed idle gains to the game state, returning a new state object.
 */
export function applyIdleGains(
  result: IdleResult,
  state: GameState,
): GameState {
  // Deep-clone stats to avoid mutation
  const newStats = { ...state.stats };
  for (const [stat, xp] of Object.entries(result.statGains)) {
    const key = stat as keyof StatsState;
    newStats[key] = {
      ...newStats[key],
      trainingXp: newStats[key].trainingXp + (xp ?? 0),
    };
  }

  // Update fatigue (clamp 0-100)
  const newFatigue = Math.max(
    0,
    Math.min(100, state.condition.fatigue + result.fatigueChange),
  );

  // Advance calendar
  const newGameDay = state.calendar.gameDay + result.gameDaysAdvanced;
  const newWeekDay = (state.calendar.weekDay + result.gameDaysAdvanced) % 7;

  // Update season based on new game day (28-day cycles)
  const seasonIndex =
    Math.floor(newGameDay / DAYS_PER_SEASON) % SEASONS.length;
  const newSeason = SEASONS[seasonIndex];

  return {
    ...state,
    stats: newStats,
    condition: {
      ...state.condition,
      fatigue: newFatigue,
    },
    calendar: {
      ...state.calendar,
      gameDay: newGameDay,
      weekDay: newWeekDay,
      season: newSeason,
    },
    inventory: {
      ...state.inventory,
      money: state.inventory.money + result.moneyEarned,
    },
    lastTickAt: Date.now(),
  };
}
