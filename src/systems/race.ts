// systems/race.ts — Race simulation: segment-based state machine

import type { ActiveRace, SegmentResult, StatsState } from "../types";
import { xpToStat } from "../state/gameState";
import { createRaceRng, mulberry32, hashString } from "../engine/prng";
import racesData from "../data/races.json";
import eventsData from "../data/events.json";
import balanceData from "../data/balance.json";
import { racePrize } from "./economy";

// ── Types ────────────────────────────────────────────────────────────

export type RacePhase =
  | "pre_race"
  | "segment_setup"
  | "segment_running"
  | "event_check"
  | "segment_resolve"
  | "aid_station"
  | "race_complete"
  | "dnf";

export type Pace = "conservative" | "steady" | "aggressive";

export interface RaceDefinition {
  id: string;
  name: string;
  distance: number;
  unit: string;
  tier: number;
  terrain: string;
  segments: number;
  entryFee: number;
  basePrize: number;
  fieldSize: [number, number];
  cutoffMinutes: number | null;
  description: string;
  segmentDefinitions: Array<{ terrain: string; hasAidStation: boolean }>;
}

export interface RaceEvent {
  id: string;
  name: string;
  description: string;
  type: string;
  baseProbability: number;
  terrainTypes: string[];
  minTier: number;
  minSegment?: number;
  oncePerRace?: boolean;
  statCheck?: string | null;
  gearCheck?: string;
  effect: Record<string, number> | null;
  choices: Array<{
    label: string;
    effect: Record<string, number>;
    outcome: string;
  }> | null;
}

export interface RaceResult {
  finishTime: number;
  position: number;
  totalRunners: number;
  isPR: boolean;
  xpEarned: number;
  moneyEarned: number;
}

export interface DNFResult {
  finishTime: number;
  position: number;
  totalRunners: number;
  isPR: false;
  xpEarned: number;
  moneyEarned: number;
  reason: string;
}

// ── Helpers ──────────────────────────────────────────────────────────

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function getRaceById(raceId: string): RaceDefinition | undefined {
  return (racesData as RaceDefinition[]).find((r) => r.id === raceId);
}

// ── Core Functions ───────────────────────────────────────────────────

/**
 * Initialize a new active race from a race definition.
 */
export function initializeRace(
  raceId: string,
  gameDay: number,
  _stats: StatsState,
  _loadout: unknown,
): ActiveRace {
  const race = getRaceById(raceId);
  if (!race) {
    throw new Error(`Unknown race: ${raceId}`);
  }

  const rng = createRaceRng(raceId, gameDay);
  const seed = hashString(`${raceId}:${gameDay}`);

  // Generate field size from range
  const [minField, maxField] = race.fieldSize;
  const fieldSize = Math.floor(minField + rng() * (maxField - minField));

  return {
    raceId,
    currentSegment: 0,
    totalSegments: race.segments,
    elapsedTime: 0,
    position: Math.floor(fieldSize / 2), // start mid-pack
    totalRunners: fieldSize,
    energy: 100,
    fatigue: 0,
    morale: 80,
    pacePerSegment: [],
    segmentResults: [],
    rngSeed: seed,
  };
}

/**
 * Get info about the current segment of a race.
 */
export function getSegmentInfo(
  race: ActiveRace,
): { terrain: string; distance: number; hasAidStation: boolean } {
  const raceDef = getRaceById(race.raceId);
  if (!raceDef) {
    throw new Error(`Unknown race: ${race.raceId}`);
  }

  const segDef = raceDef.segmentDefinitions[race.currentSegment];
  if (!segDef) {
    throw new Error(
      `Invalid segment ${race.currentSegment} for race ${race.raceId}`,
    );
  }

  const distancePerSegment = raceDef.distance / raceDef.segments;

  return {
    terrain: segDef.terrain,
    distance: distancePerSegment,
    hasAidStation: segDef.hasAidStation,
  };
}

/**
 * Compute time in seconds for a single segment.
 */
export function computeSegmentTime(
  segment: { terrain: string; distance: number },
  pace: Pace,
  race: ActiveRace,
  stats: StatsState,
): number {
  const speedVal = xpToStat(stats.speed.trainingXp);

  // Base pace in min/mi
  let basePace = 15 - speedVal * 0.1;

  // Pace modifier
  const paceModifiers = balanceData.race.paceModifiers as Record<string, number>;
  basePace *= paceModifiers[pace] ?? 1.0;

  // Terrain modifier
  const terrainMods: Record<string, number> = {
    flat_road: 1.0,
    rolling_hills: 1.08,
    steep_climb: 1.35,
    technical_descent: 1.15,
  };
  basePace *= terrainMods[segment.terrain] ?? 1.0;

  // Fatigue: exponential slowdown past 60%
  if (race.fatigue > balanceData.race.fatigueSlowdownThreshold) {
    basePace *=
      1 +
      ((race.fatigue - balanceData.race.fatigueSlowdownThreshold) / 40) * 0.5;
  }

  // Energy bonk: below 20%
  if (race.energy < balanceData.race.energyBonkThreshold) {
    basePace *= balanceData.race.bonkPaceMultiplier;
  }

  // Return time in seconds: pace (min/mi) * distance (mi) * 60 (sec/min)
  return basePace * segment.distance * 60;
}

/**
 * Roll for events during a segment.
 */
export function rollEvents(
  race: ActiveRace,
  stats: StatsState,
  rng: () => number,
): RaceEvent[] {
  const raceDef = getRaceById(race.raceId);
  if (!raceDef) return [];

  const segDef = raceDef.segmentDefinitions[race.currentSegment];
  if (!segDef) return [];

  const terrain = segDef.terrain;
  const tier = raceDef.tier;

  // Track events already triggered this race
  const triggeredEventIds = new Set(
    race.segmentResults.flatMap((sr) => sr.events),
  );

  // Filter candidates
  const candidates = (eventsData as RaceEvent[]).filter((ev) => {
    // Terrain match
    if (!ev.terrainTypes.includes(terrain)) return false;
    // Tier check
    if (ev.minTier > tier) return false;
    // Min segment check
    if (ev.minSegment !== undefined && ev.minSegment > race.currentSegment)
      return false;
    // Once per race check
    if (ev.oncePerRace && triggeredEventIds.has(ev.id)) return false;

    return true;
  });

  const matched: RaceEvent[] = [];

  for (const ev of candidates) {
    if (matched.length >= 2) break;

    let prob = ev.baseProbability;

    // Stat check modifier: higher stat reduces probability of negative events
    if (ev.statCheck) {
      const statKey = ev.statCheck as keyof StatsState;
      const statEntry = stats[statKey];
      if (statEntry) {
        const statVal = xpToStat(statEntry.trainingXp);
        // Higher stat reduces prob for negative events, increases for positive
        if (ev.type === "negative") {
          prob *= 1 - statVal / 200; // at stat 100, halve the probability
        } else if (ev.type === "positive") {
          prob *= 1 + statVal / 200; // at stat 100, 1.5x probability
        }
      }
    }

    // Fatigue increases probability of negative events
    if (ev.type === "negative" && race.fatigue > 50) {
      prob *= 1 + (race.fatigue - 50) / 100;
    }

    if (rng() < prob) {
      matched.push(ev);
    }
  }

  return matched;
}

/**
 * Apply a choice from a race event to the race state.
 */
export function resolveEventChoice(
  event: RaceEvent,
  choiceIndex: number,
  race: ActiveRace,
): { race: ActiveRace; outcomeText: string } {
  const updated = { ...race };

  // If the event has no choices, apply the event's direct effect
  if (!event.choices || event.choices.length === 0) {
    if (event.effect) {
      applyEffects(updated, event.effect);
    }
    return { race: updated, outcomeText: event.description };
  }

  const choice = event.choices[choiceIndex];
  if (!choice) {
    return { race: updated, outcomeText: "Invalid choice." };
  }

  applyEffects(updated, choice.effect);

  return { race: updated, outcomeText: choice.outcome };
}

function applyEffects(
  race: ActiveRace,
  effects: Record<string, number>,
): void {
  if (effects.morale !== undefined) {
    race.morale = clamp(race.morale + effects.morale, 0, 100);
  }
  if (effects.energy !== undefined) {
    race.energy = clamp(race.energy + effects.energy, 0, 100);
  }
  if (effects.fatigue !== undefined) {
    race.fatigue = clamp(race.fatigue + effects.fatigue, 0, 100);
  }
  if (effects.timepenaltySeconds !== undefined) {
    race.elapsedTime += effects.timepenaltySeconds;
  }
}

/**
 * Process time spent at an aid station.
 */
export function processAidStation(
  race: ActiveRace,
  timeSpentSeconds: number,
): ActiveRace {
  const updated = { ...race };

  // Restore energy
  updated.energy = clamp(updated.energy + timeSpentSeconds / 30, 0, 100);
  // Reduce fatigue
  updated.fatigue = clamp(updated.fatigue - timeSpentSeconds / 60, 0, 100);
  // Add time to elapsed
  updated.elapsedTime += timeSpentSeconds;

  return updated;
}

/**
 * Resolve a full segment: compute time, drain energy, add fatigue, update position, record result.
 */
export function resolveSegment(
  race: ActiveRace,
  pace: Pace,
  stats: StatsState,
): ActiveRace {
  const updated = { ...race };
  const segInfo = getSegmentInfo(race);

  // Compute segment time
  const segTime = computeSegmentTime(segInfo, pace, race, stats);
  updated.elapsedTime += segTime;

  // Drain energy based on pace
  const energyDrain = balanceData.race.energyDrainPerSegment as Record<string, number>;
  updated.energy = clamp(
    updated.energy - (energyDrain[pace] ?? 12),
    0,
    100,
  );

  // Add fatigue based on pace
  const fatiguePace: Record<string, number> = {
    conservative: 3,
    steady: 5,
    aggressive: 8,
  };
  updated.fatigue = clamp(
    updated.fatigue + (fatiguePace[pace] ?? 5),
    0,
    100,
  );

  // Drop morale
  updated.morale = clamp(
    updated.morale - balanceData.race.moraleDropPerSegment,
    0,
    100,
  );

  // Update position among NPCs
  const rng = mulberry32(updated.rngSeed + updated.currentSegment);
  const npcTimes = simulateNPCField(
    updated.totalRunners - 1,
    updated.totalSegments,
    rng,
  );
  const pos = calculatePosition(updated.elapsedTime, npcTimes);
  updated.position = pos.position;

  // Record pace choice
  updated.pacePerSegment = [...updated.pacePerSegment, pace];

  // Record segment result
  const result: SegmentResult = {
    segment: updated.currentSegment,
    time: segTime,
    events: [],
    statChanges: {},
  };
  updated.segmentResults = [...updated.segmentResults, result];

  // Advance to next segment or complete
  updated.currentSegment += 1;

  // Check for DNF: morale threshold
  if (updated.morale <= balanceData.race.dnfMoraleThreshold) {
    // DNF state - caller should handle
  }

  return updated;
}

/**
 * Generate an array of NPC total race times with a normal-ish distribution.
 * Returns times in seconds representing total race times.
 */
export function simulateNPCField(
  fieldSize: number,
  totalSegments: number,
  rng: () => number,
): number[] {
  const times: number[] = [];

  // Average NPC pace: ~10 min/mi, roughly 600 seconds per segment-mile
  // Generate a spread of finishing times using Box-Muller transform
  const meanTimePerSegment = 600; // ~10 min/mile equivalent
  const stdDev = 120; // 2 min spread

  for (let i = 0; i < fieldSize; i++) {
    // Box-Muller transform for normal distribution
    const u1 = rng();
    const u2 = rng();
    const z = Math.sqrt(-2 * Math.log(Math.max(u1, 0.0001))) *
      Math.cos(2 * Math.PI * u2);

    const npcTime = (meanTimePerSegment + z * stdDev) * totalSegments;
    times.push(Math.max(npcTime, totalSegments * 300)); // min ~5 min/segment
  }

  return times.sort((a, b) => a - b);
}

/**
 * Calculate player position among NPCs.
 */
export function calculatePosition(
  playerTime: number,
  npcTimes: number[],
): { position: number; total: number } {
  // Count NPCs the player beat (player time is lower)
  let beaten = 0;
  for (const t of npcTimes) {
    if (playerTime <= t) beaten++;
  }

  return {
    position: npcTimes.length + 1 - beaten, // 1-indexed
    total: npcTimes.length + 1, // include the player
  };
}

/**
 * Check if the player has exceeded the cutoff time.
 */
export function checkCutoff(
  race: ActiveRace,
  cutoffMinutes: number | null,
): boolean {
  if (cutoffMinutes === null) return false;
  return race.elapsedTime > cutoffMinutes * 60;
}

/**
 * Calculate final results and rewards for a completed race.
 */
export function completeRace(
  race: ActiveRace,
  _stats: StatsState,
  personalBests?: Record<string, number | null>,
): RaceResult {
  const raceDef = getRaceById(race.raceId);
  if (!raceDef) {
    throw new Error(`Unknown race: ${race.raceId}`);
  }

  const finishTime = race.elapsedTime;
  const position = race.position;
  const totalRunners = race.totalRunners;

  // Check for PR
  const prevBest = personalBests?.[race.raceId];
  const isPR = prevBest === undefined || prevBest === null || finishTime < prevBest;

  // XP earned based on tier
  const tierXp = balanceData.progression.xpPerRaceBase;
  let xpEarned = tierXp[raceDef.tier - 1] ?? tierXp[0];
  if (isPR) {
    xpEarned += balanceData.progression.xpPerPR;
  }

  // Money earned based on position (podium gets bonuses)
  const moneyEarned = racePrize(raceDef.tier, position, totalRunners);

  return {
    finishTime,
    position,
    totalRunners,
    isPR,
    xpEarned,
    moneyEarned,
  };
}

/**
 * Create a DNF result with partial rewards.
 */
export function createDNF(
  race: ActiveRace,
  reason: string,
): DNFResult {
  const raceDef = getRaceById(race.raceId);
  if (!raceDef) {
    throw new Error(`Unknown race: ${race.raceId}`);
  }

  // Partial XP: fraction of segments completed
  const tierXp = balanceData.progression.xpPerRaceBase;
  const baseXp = tierXp[raceDef.tier - 1] ?? tierXp[0];
  const completionFraction = race.currentSegment / race.totalSegments;
  const xpEarned = Math.floor(baseXp * completionFraction * 0.5);

  return {
    finishTime: race.elapsedTime,
    position: race.totalRunners, // last place
    totalRunners: race.totalRunners,
    isPR: false,
    xpEarned,
    moneyEarned: 0,
    reason,
  };
}
