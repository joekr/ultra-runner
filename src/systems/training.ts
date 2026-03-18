// systems/training.ts — Workout execution: cadence scoring, stat gains, fatigue, calendar, lifecycle

import type { ActiveWorkout, StatsState, WeeklyPlan, DayPlan } from "../types";
import workouts from "../data/workouts.json";

// ── Types ────────────────────────────────────────────────────────────

export interface CadenceResult {
  quality: "undertrained" | "easy" | "sweet_spot" | "hard" | "overtrained";
  multiplier: number;
  injuryRisk: number;
}

interface WorkoutData {
  id: string;
  name: string;
  description: string;
  durationMs: number;
  baseMiles: number;
  cadenceZone: { min: number; sweet: [number, number]; max: number } | null;
  baseXpPerTick: number;
  baseFatiguePerTick: number;
  statDistribution: Record<string, number>;
  idleEligible: boolean;
  baseXpPerDay: number;
  recoveryAmount?: number;
}

// ── Helpers ──────────────────────────────────────────────────────────

function findWorkout(workoutType: string): WorkoutData {
  const w = (workouts as WorkoutData[]).find((w) => w.id === workoutType);
  if (!w) throw new Error(`Unknown workout type: ${workoutType}`);
  return w;
}

// ── Task 1: Cadence Scoring ──────────────────────────────────────────

export function scoreCadence(
  tapsPerSecond: number,
  workoutType: string,
): CadenceResult {
  if (workoutType === "rest") {
    return { quality: "easy", multiplier: 0, injuryRisk: 0 };
  }

  const workout = findWorkout(workoutType);
  const zone = workout.cadenceZone;
  if (!zone) {
    return { quality: "easy", multiplier: 0, injuryRisk: 0 };
  }

  if (tapsPerSecond < zone.min) {
    return { quality: "undertrained", multiplier: 0.3, injuryRisk: 0.0 };
  }
  if (tapsPerSecond < zone.sweet[0]) {
    return { quality: "easy", multiplier: 0.6, injuryRisk: 0.01 };
  }
  if (tapsPerSecond <= zone.sweet[1]) {
    return { quality: "sweet_spot", multiplier: 1.0, injuryRisk: 0.02 };
  }
  if (tapsPerSecond <= zone.max) {
    return { quality: "hard", multiplier: 0.7, injuryRisk: 0.08 };
  }
  return { quality: "overtrained", multiplier: 0.4, injuryRisk: 0.15 };
}

// ── Task 2: Tap Input Buffer ─────────────────────────────────────────

export class TapBuffer {
  private tapBuffer: number[] = [];

  recordTap(timestamp: number): void {
    this.tapBuffer.push(timestamp);
  }

  consumeTaps(windowMs: number): number {
    if (this.tapBuffer.length === 0) return 0;
    const now = this.tapBuffer[this.tapBuffer.length - 1];
    const cutoff = now - windowMs;
    this.tapBuffer = this.tapBuffer.filter((t) => t > cutoff);
    return this.tapBuffer.length;
  }

  getTapsPerSecond(windowMs: number): number {
    const count = this.consumeTaps(windowMs);
    return count / (windowMs / 1000);
  }

  reset(): void {
    this.tapBuffer = [];
  }
}

// ── Task 3: Stat Gain Calculation ────────────────────────────────────

export function computeStatGains(
  workoutType: string,
  cadenceResult: CadenceResult,
  fatigue: number,
  dtMs: number,
): Record<string, number> {
  const workout = findWorkout(workoutType);
  const baseXp = workout.baseXpPerTick * (dtMs / 100);
  const afterCadence = baseXp * cadenceResult.multiplier;
  const fatiguePenalty = Math.max(0.2, 1 - fatigue / 150);
  const finalXp = afterCadence * fatiguePenalty;

  const gains: Record<string, number> = {};
  for (const [stat, ratio] of Object.entries(workout.statDistribution)) {
    gains[stat] = finalXp * ratio;
  }
  return gains;
}

// ── Task 4: Fatigue Accumulation ─────────────────────────────────────

export function computeFatigue(
  workoutType: string,
  cadenceResult: CadenceResult,
  currentFatigue: number,
  recoveryStatValue: number,
  dtMs: number,
  fitnessMultiplier?: number,
): number {
  const workout = findWorkout(workoutType);
  let baseFatigue = workout.baseFatiguePerTick * (dtMs / 100);

  // Quality multipliers — perfect cadence reduces fatigue, bad cadence increases it
  const fatigueQualityMultipliers: Record<CadenceResult["quality"], number> = {
    sweet_spot: 0.7,     // perfect form = 30% less fatigue
    easy: 1.0,           // slightly slow = normal fatigue
    undertrained: 1.0,   // way too slow = normal (not pushing hard enough to tire faster)
    hard: 1.5,           // pushing too fast = 50% more fatigue
    overtrained: 2.5,    // mashing = 150% more fatigue
  };
  baseFatigue *= fatigueQualityMultipliers[cadenceResult.quality];

  // Fitness-based reduction: fitter runners accumulate fatigue slower
  // This is the primary lever — a fitness 80 runner gets ~65% less fatigue
  if (fitnessMultiplier !== undefined) {
    baseFatigue *= fitnessMultiplier;
  }

  // Recovery stat gives a small additional reduction on top
  const recoveryMod = Math.max(0.7, 1 - recoveryStatValue / 300);
  baseFatigue *= recoveryMod;

  const newFatigue = currentFatigue + baseFatigue;
  return Math.min(100, Math.max(0, newFatigue));
}

// ── Task 5: Weekly Calendar Logic ────────────────────────────────────

export function getWorkoutForDay(
  plan: WeeklyPlan,
  dayIndex: number,
): DayPlan {
  return plan[dayIndex];
}

export function calculateWeeklyMileageIncrease(
  current: number,
  previous: number,
): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function isOverMileageThreshold(increase: number): boolean {
  return increase > 10;
}

export function getDefaultTrainingPlan(): WeeklyPlan {
  return [
    { workout: "easy_run" },   // Mon
    { workout: "intervals" },  // Tue
    { workout: "easy_run" },   // Wed
    { workout: "rest" },       // Thu
    { workout: "easy_run" },   // Fri
    { workout: "long_run" },   // Sat
    { workout: "rest" },       // Sun
  ];
}

// ── Task 6: Workout Lifecycle ────────────────────────────────────────

export function createActiveWorkout(workoutType: string): ActiveWorkout {
  const workout = findWorkout(workoutType);
  return {
    workoutType,
    startedAt: Date.now(),
    duration: workout.durationMs,
    elapsed: 0,
    taps: 0,
    effortMeter: 0,
    sweetSpotHits: 0,
    sweetSpotMisses: 0,
    statGainsAccumulated: {},
  };
}

export function updateActiveWorkout(
  workout: ActiveWorkout,
  dtMs: number,
  cadenceResult: CadenceResult,
  statGains: Record<string, number>,
): ActiveWorkout {
  const newAccumulated = { ...workout.statGainsAccumulated };
  for (const [stat, xp] of Object.entries(statGains)) {
    const key = stat as keyof StatsState;
    newAccumulated[key] = (newAccumulated[key] ?? 0) + xp;
  }

  const isSweetSpot = cadenceResult.quality === "sweet_spot";

  return {
    ...workout,
    elapsed: workout.elapsed + dtMs,
    sweetSpotHits: workout.sweetSpotHits + (isSweetSpot ? 1 : 0),
    sweetSpotMisses: workout.sweetSpotMisses + (isSweetSpot ? 0 : 1),
    statGainsAccumulated: newAccumulated,
  };
}

export function isWorkoutComplete(workout: ActiveWorkout): boolean {
  return workout.elapsed >= workout.duration;
}

export function completeWorkout(workout: ActiveWorkout): {
  totalStatGains: Record<string, number>;
  totalMiles: number;
} {
  const workoutData = findWorkout(workout.workoutType);
  const totalStatGains: Record<string, number> = {};
  for (const [stat, xp] of Object.entries(workout.statGainsAccumulated)) {
    totalStatGains[stat] = xp ?? 0;
  }

  // Miles proportional to completion
  const completionRatio =
    workoutData.durationMs > 0
      ? Math.min(1, workout.elapsed / workoutData.durationMs)
      : 0;
  const totalMiles = workoutData.baseMiles * completionRatio;

  return { totalStatGains, totalMiles };
}

// ── Mileage helpers ─────────────────────────────────────────────────

export function getBaseMiles(workoutType: string): number {
  return findWorkout(workoutType).baseMiles;
}

// ── Walking mechanic ────────────────────────────────────────────────

/**
 * Compute new (lower) fatigue while walking.
 * Base recovery rate: -0.3 per 100ms tick.
 * recoveryBonus from gear multiplies recovery: (1 + recoveryBonus * 3).
 */
export function computeWalkingFatigue(
  currentFatigue: number,
  recoveryBonus: number,
  dtMs: number,
): number {
  const baseRecovery = -0.3 * (dtMs / 100);
  const bonusMultiplier = 1 + recoveryBonus * 3;
  const newFatigue = currentFatigue + baseRecovery * bonusMultiplier;
  return Math.min(100, Math.max(0, newFatigue));
}

/**
 * Stat gains while walking: 20% of easy_run base gains.
 * Walking always counts as easy effort.
 */
export function computeWalkingStatGains(
  fatigue: number,
  dtMs: number,
): Record<string, number> {
  const easyRun = findWorkout("easy_run");
  const baseXp = easyRun.baseXpPerTick * (dtMs / 100);
  // Walking multiplier: 0.2 (20% of normal)
  const walkingXp = baseXp * 0.2;
  const fatiguePenalty = Math.max(0.2, 1 - fatigue / 150);
  const finalXp = walkingXp * fatiguePenalty;

  const gains: Record<string, number> = {};
  for (const [stat, ratio] of Object.entries(easyRun.statDistribution)) {
    gains[stat] = finalXp * ratio;
  }
  return gains;
}
