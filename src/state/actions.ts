// state/actions.ts — State mutation functions

import type {
  GameState,
  Screen,
  StatsState,
  DayPlan,
  CoachState,
} from "../types";
import balanceData from "../data/balance.json";
import { gameState, currentScreen, createNewGame } from "./gameState";
import { save } from "../engine/saveManager";
import { createActiveWorkout, completeWorkout as completeWorkoutResult, calculateWeeklyMileageIncrease } from "../systems/training";
import { calculateInjuryRisk, rollInjury, tickInjuryRecovery, escalateInjury } from "../systems/injury";
import { initializeRace, completeRace, createDNF, getRaceById } from "../systems/race";
import type { RaceResult, DNFResult } from "../systems/race";
import { awardWorkoutXP, awardRaceXP, calculateLevel, xpToNextLevel, checkUnlocks } from "../systems/progression";
import { getShoeCondition, degradeShoe } from "../systems/gear";
import { mulberry32 } from "../engine/prng";
import { checkAchievements, getAchievementById } from "../systems/achievements";
import { pushAchievementNotifications } from "./achievementNotifications";
import { dailyPassiveFatigueRecovery, restDayFatigueRecovery, describeLevelUp } from "../systems/stats";

// ── Navigation ────────────────────────────────────────────────────────

// ── Day Advancement Helper ────────────────────────────────────────────

const SEASONS: Array<"spring" | "summer" | "fall" | "winter"> = [
  "spring", "summer", "fall", "winter",
];

function advanceDay(calendar: GameState["calendar"]) {
  const newWeekDay = (calendar.weekDay + 1) % 7;
  const newGameDay = calendar.gameDay + 1;
  const newSeason = SEASONS[Math.floor(newGameDay / 28) % 4];
  return { weekDay: newWeekDay, gameDay: newGameDay, season: newSeason };
}

// ── Navigation ────────────────────────────────────────────────────────

export function navigateTo(screen: Screen): void {
  currentScreen.value = screen;
}

// ── New Game ──────────────────────────────────────────────────────────

export function startNewGame(
  name: string,
  backstory: "couch_to_5k" | "former_athlete" | "hiker" | "stress_runner",
): void {
  const state = createNewGame(name, backstory);
  gameState.value = state;
  save(state);
  currentScreen.value = "dashboard";
}

// ── Training Plan ─────────────────────────────────────────────────────

export function updateTrainingPlan(
  dayIndex: number,
  workout: DayPlan["workout"],
): void {
  const state = gameState.value;
  if (!state) return;

  const newPlan = [...state.calendar.trainingPlan] as GameState["calendar"]["trainingPlan"];
  newPlan[dayIndex] = { workout };

  gameState.value = {
    ...state,
    calendar: {
      ...state.calendar,
      trainingPlan: newPlan,
    },
  };
}

// ── Workout ───────────────────────────────────────────────────────────

export function startWorkout(workoutType: string): void {
  const state = gameState.value;
  if (!state) return;

  const workout = createActiveWorkout(workoutType);

  gameState.value = {
    ...state,
    training: {
      ...state.training,
      currentWorkout: workout,
    },
  };

  currentScreen.value = "active_workout";
}

export interface WorkoutCompletionInfo {
  xpEarned: number;
  leveledUp: boolean;
  newLevel: number;
  newUnlocks: string[];
  levelPerks: string[];     // descriptions of what improved
  coachMessage: string | null;
}

export function endWorkout(): WorkoutCompletionInfo | null {
  const state = gameState.value;
  if (!state || !state.training.currentWorkout) return null;

  const workout = state.training.currentWorkout;
  const gains = workout.statGainsAccumulated;

  // Apply accumulated stat gains
  const newStats = { ...state.stats } as StatsState;
  for (const [key, value] of Object.entries(gains)) {
    const statKey = key as keyof StatsState;
    if (newStats[statKey] && value) {
      newStats[statKey] = {
        trainingXp: newStats[statKey].trainingXp + value,
      };
    }
  }

  // Advance the game day — one workout = one day
  const { weekDay: newWeekDay, gameDay: newGameDay, season: newSeason } = advanceDay(state.calendar);

  // Update weekly mileage (reset on new week)
  const workoutMiles = workout.workoutType !== "rest"
    ? (completeWorkoutResult(workout)).totalMiles
    : 0;
  const isNewWeek = newWeekDay === 0; // wrapped back to Monday
  const newWeeklyMileage = isNewWeek ? 0 : state.training.weeklyMileage + workoutMiles;
  const newPrevWeekMileage = isNewWeek
    ? state.training.weeklyMileage + workoutMiles
    : state.training.previousWeekMileage;

  // Roll for injuries after workout
  const equippedShoe = state.inventory.shoes.find(
    (s) => s.id === state.inventory.equippedShoe
  );
  const shoeDurPct = equippedShoe
    ? getShoeCondition(equippedShoe).durabilityPct
    : 1;
  const mileageIncrease = calculateWeeklyMileageIncrease(
    newWeeklyMileage,
    newPrevWeekMileage,
  );
  const injuryRisk = calculateInjuryRisk(
    state.condition.fatigue,
    shoeDurPct,
    mileageIncrease,
  );
  const rng = mulberry32(Date.now());

  // Check existing injuries for escalation
  let newInjuries = [...state.injuries];
  for (const inj of state.injuries) {
    const escalated = escalateInjury(inj, rng);
    if (escalated) {
      newInjuries.push(escalated);
    }
  }

  // Roll for new injury
  const newInjury = rollInjury(injuryRisk, rng);
  if (newInjury) {
    newInjuries.push(newInjury);
  }

  // Award workout XP and check progression
  const workoutXp = awardWorkoutXP();
  const newTotalXp = state.runner.xp + workoutXp;
  const newLevel = calculateLevel(newTotalXp);
  const levelInfo = xpToNextLevel(newTotalXp);
  const newUnlocks = checkUnlocks(newLevel, state.flags.unlockedDistances);

  // Passive daily fatigue recovery — even training days recover some fatigue
  // (simulates sleeping, eating, normal daily recovery)
  const passiveRecovery = dailyPassiveFatigueRecovery(newStats, newLevel);
  const fatigueAfterRecovery = Math.max(0, state.condition.fatigue - passiveRecovery);

  let updatedState: GameState = {
    ...state,
    runner: {
      ...state.runner,
      xp: newTotalXp,
      level: newLevel,
      xpToNextLevel: levelInfo.needed,
    },
    stats: newStats,
    injuries: newInjuries,
    condition: {
      ...state.condition,
      fatigue: fatigueAfterRecovery,
    },
    calendar: {
      ...state.calendar,
      gameDay: newGameDay,
      weekDay: newWeekDay,
      season: newSeason,
    },
    training: {
      ...state.training,
      currentWorkout: null,
      weeklyMileage: newWeeklyMileage,
      previousWeekMileage: newPrevWeekMileage,
      totalMiles: state.training.totalMiles + workoutMiles,
      streak: state.training.streak + 1,
    },
    flags: {
      ...state.flags,
      unlockedDistances: newUnlocks.length > 0
        ? [...state.flags.unlockedDistances, ...newUnlocks]
        : state.flags.unlockedDistances,
    },
  };

  // Degrade equipped shoe based on miles run
  if (workoutMiles > 0 && updatedState.inventory.equippedShoe) {
    updatedState = {
      ...updatedState,
      inventory: degradeShoe(updatedState.inventory.equippedShoe, workoutMiles, updatedState.inventory),
    };
  }

  // Process weekly coach fee on new week
  const { newState: stateAfterCoach, message: coachMessage } = processCoachWeeklyFee(updatedState, isNewWeek);
  updatedState = stateAfterCoach;

  gameState.value = updatedState;

  save(gameState.value);
  runAchievementCheck();

  return {
    xpEarned: workoutXp,
    leveledUp: newLevel > state.runner.level,
    newLevel,
    newUnlocks,
    levelPerks: newLevel > state.runner.level ? describeLevelUp(state.runner.level, newLevel) : [],
    coachMessage,
  };
}

// ── Rest Day ──────────────────────────────────────────────────────────

export function takeRestDay(): void {
  const state = gameState.value;
  if (!state) return;

  // Rest day recovery — significantly more than passive daily recovery
  const recoveryAmount = restDayFatigueRecovery(state.stats);

  const { weekDay: newWeekDay, gameDay: newGameDay, season: newSeason } = advanceDay(state.calendar);
  const isNewWeek = newWeekDay === 0;

  // Heal injuries on rest days
  const healedInjuries = tickInjuryRecovery(state.injuries, true);

  let updatedState: GameState = {
    ...state,
    condition: {
      ...state.condition,
      fatigue: Math.max(0, state.condition.fatigue - recoveryAmount),
    },
    injuries: healedInjuries,
    calendar: {
      ...state.calendar,
      gameDay: newGameDay,
      weekDay: newWeekDay,
      season: newSeason,
    },
    training: {
      ...state.training,
      weeklyMileage: isNewWeek ? 0 : state.training.weeklyMileage,
      previousWeekMileage: isNewWeek
        ? state.training.weeklyMileage
        : state.training.previousWeekMileage,
    },
  };

  // Process weekly coach fee on new week
  const { newState: stateAfterCoach } = processCoachWeeklyFee(updatedState, isNewWeek);
  updatedState = stateAfterCoach;

  gameState.value = updatedState;

  save(gameState.value);
}

// ── Start Race ────────────────────────────────────────────────────────

export function startRace(raceId: string): void {
  const state = gameState.value;
  if (!state) return;

  const activeRace = initializeRace(raceId, state.calendar.gameDay, state.stats, null);

  // Remove this race from scheduled races
  const remainingScheduled = state.calendar.scheduledRaces.filter(
    (sr) => sr.raceId !== raceId,
  );

  gameState.value = {
    ...state,
    race: { active: activeRace },
    calendar: {
      ...state.calendar,
      scheduledRaces: remainingScheduled,
    },
  };

  currentScreen.value = "active_race";
}

// ── Race Registration ─────────────────────────────────────────────────

export function registerForRace(raceId: string, entryFee: number): void {
  const state = gameState.value;
  if (!state) return;
  if (state.inventory.money < entryFee) return;

  gameState.value = {
    ...state,
    inventory: {
      ...state.inventory,
      money: state.inventory.money - entryFee,
    },
    calendar: {
      ...state.calendar,
      scheduledRaces: [
        ...state.calendar.scheduledRaces,
        { raceId, gameDay: nextRaceDay(state.calendar.gameDay, state.calendar.weekDay) },
      ],
    },
  };

  save(gameState.value);
}

// ── Race Scheduling Helper ────────────────────────────────────────────

/**
 * Calculate the next race day — races happen on Saturday (weekDay 5).
 * Always at least 2 days out so you have time to prepare.
 */
function nextRaceDay(currentGameDay: number, currentWeekDay: number): number {
  // Saturday = weekDay 5
  const RACE_DAY = 5;
  let daysUntilSaturday = (RACE_DAY - currentWeekDay + 7) % 7;
  // If today is Saturday or it's less than 2 days away, push to next week's Saturday
  if (daysUntilSaturday < 2) {
    daysUntilSaturday += 7;
  }
  return currentGameDay + daysUntilSaturday;
}

// ── Distance Key Helper ───────────────────────────────────────────────

function distanceKey(raceId: string): string {
  const raceDef = getRaceById(raceId);
  if (!raceDef) return raceId;
  const dist = raceDef.distance;
  if (dist <= 3.2) return "5k";
  if (dist <= 6.3) return "10k";
  if (dist <= 13.2) return "half_marathon";
  return "marathon";
}

// Recovery fatigue by tier
const POST_RACE_FATIGUE: Record<number, number> = {
  1: 20,  // 5K
  2: 30,  // 10K
  3: 45,  // Half marathon
  4: 70,  // Marathon
};

// ── Race Completion ──────────────────────────────────────────────────

export interface RaceCompletionInfo {
  result: RaceResult;
  leveledUp: boolean;
  newLevel: number;
  newUnlocks: string[];
  levelPerks: string[];     // descriptions of what improved
  distKey: string;
}

export function completeRaceAction(): RaceCompletionInfo | null {
  const state = gameState.value;
  if (!state || !state.race.active) return null;

  const activeRace = state.race.active;
  const result = completeRace(activeRace, state.stats, state.history.personalBests);
  const raceDef = getRaceById(activeRace.raceId);
  const tier = raceDef?.tier ?? 1;
  const distKey = distanceKey(activeRace.raceId);

  // Award race XP via progression system
  const positionPct = result.position / result.totalRunners;
  const raceXp = awardRaceXP(tier - 1, positionPct, result.isPR);
  const newTotalXp = state.runner.xp + raceXp;
  const newLevel = calculateLevel(newTotalXp);
  const levelInfo = xpToNextLevel(newTotalXp);
  const newUnlocks = checkUnlocks(newLevel, state.flags.unlockedDistances);

  // Update personal bests
  const newPersonalBests = { ...state.history.personalBests };
  if (result.isPR) {
    newPersonalBests[activeRace.raceId] = result.finishTime;
    // Also store by distance key for cross-race comparison
    const prevDistBest = newPersonalBests[distKey];
    if (prevDistBest === undefined || prevDistBest === null || result.finishTime < prevDistBest) {
      newPersonalBests[distKey] = result.finishTime;
    }
  }

  const completedRace = {
    raceId: activeRace.raceId,
    gameDay: state.calendar.gameDay,
    finishTime: result.finishTime,
    position: result.position,
    totalRunners: result.totalRunners,
    result: "finished" as const,
    xpEarned: raceXp,
    moneyEarned: result.moneyEarned,
    personalBest: result.isPR,
  };

  // Post-race recovery fatigue
  const postRaceFatigue = POST_RACE_FATIGUE[tier] ?? 20;

  // Advance day — race day is over, move to Sunday
  const { weekDay: newWeekDay, gameDay: newGameDay, season: newSeason } = advanceDay(state.calendar);

  // Race experience trains Nutrition IQ
  const nutritionXpByTier = [20, 40, 80, 150];
  const nutritionXpGain = nutritionXpByTier[(tier - 1)] ?? 20;
  const updatedStats = { ...state.stats };
  updatedStats.nutritionIQ = {
    trainingXp: state.stats.nutritionIQ.trainingXp + nutritionXpGain,
  };

  gameState.value = {
    ...state,
    runner: {
      ...state.runner,
      xp: newTotalXp,
      level: newLevel,
      xpToNextLevel: levelInfo.needed,
    },
    stats: updatedStats,
    race: { active: null },
    condition: {
      ...state.condition,
      fatigue: Math.min(100, state.condition.fatigue + postRaceFatigue),
    },
    calendar: {
      ...state.calendar,
      gameDay: newGameDay,
      weekDay: newWeekDay,
      season: newSeason,
    },
    history: {
      ...state.history,
      completedRaces: [...state.history.completedRaces, completedRace],
      personalBests: newPersonalBests,
      totalRacesFinished: state.history.totalRacesFinished + 1,
    },
    inventory: {
      ...state.inventory,
      money: state.inventory.money + result.moneyEarned,
    },
    flags: {
      ...state.flags,
      firstRaceComplete: true,
      unlockedDistances: newUnlocks.length > 0
        ? [...state.flags.unlockedDistances, ...newUnlocks]
        : state.flags.unlockedDistances,
    },
  };

  save(gameState.value);
  runAchievementCheck();

  return {
    result: { ...result, xpEarned: raceXp },
    leveledUp: newLevel > state.runner.level,
    newLevel,
    newUnlocks,
    levelPerks: newLevel > state.runner.level ? describeLevelUp(state.runner.level, newLevel) : [],
    distKey,
  };
}

export interface DNFCompletionInfo {
  result: DNFResult;
  leveledUp: boolean;
  newLevel: number;
  newUnlocks: string[];
  levelPerks: string[];
}

export function dnfRaceAction(reason: string): DNFCompletionInfo | null {
  const state = gameState.value;
  if (!state || !state.race.active) return null;

  const activeRace = state.race.active;
  const result = createDNF(activeRace, reason);
  const raceDef = getRaceById(activeRace.raceId);
  const tier = raceDef?.tier ?? 1;

  // Award partial XP
  const newTotalXp = state.runner.xp + result.xpEarned;
  const newLevel = calculateLevel(newTotalXp);
  const levelInfo = xpToNextLevel(newTotalXp);
  const newUnlocks = checkUnlocks(newLevel, state.flags.unlockedDistances);

  const completedRace = {
    raceId: activeRace.raceId,
    gameDay: state.calendar.gameDay,
    finishTime: result.finishTime,
    position: result.totalRunners,
    totalRunners: result.totalRunners,
    result: "dnf" as const,
    xpEarned: result.xpEarned,
    moneyEarned: 0,
    personalBest: false,
  };

  // Post-race fatigue (reduced for DNF since race wasn't completed)
  const postRaceFatigue = Math.floor((POST_RACE_FATIGUE[tier] ?? 20) * 0.6);

  // Advance day — race day is over
  const { weekDay: newWeekDay, gameDay: newGameDay, season: newSeason } = advanceDay(state.calendar);

  gameState.value = {
    ...state,
    runner: {
      ...state.runner,
      xp: newTotalXp,
      level: newLevel,
      xpToNextLevel: levelInfo.needed,
    },
    race: { active: null },
    condition: {
      ...state.condition,
      fatigue: Math.min(100, state.condition.fatigue + postRaceFatigue),
    },
    calendar: {
      ...state.calendar,
      gameDay: newGameDay,
      weekDay: newWeekDay,
      season: newSeason,
    },
    history: {
      ...state.history,
      completedRaces: [...state.history.completedRaces, completedRace],
      totalRacesDNF: state.history.totalRacesDNF + 1,
    },
    flags: {
      ...state.flags,
      firstDNF: true,
      unlockedDistances: newUnlocks.length > 0
        ? [...state.flags.unlockedDistances, ...newUnlocks]
        : state.flags.unlockedDistances,
    },
  };

  save(gameState.value);
  runAchievementCheck();

  return {
    result,
    leveledUp: newLevel > state.runner.level,
    newLevel,
    newUnlocks,
    levelPerks: newLevel > state.runner.level ? describeLevelUp(state.runner.level, newLevel) : [],
  };
}

// ── Achievement Check Helper ─────────────────────────────────────────

function runAchievementCheck(): void {
  const state = gameState.value;
  if (!state) return;

  const newIds = checkAchievements(state);
  if (newIds.length === 0) return;

  // Add to history
  gameState.value = {
    ...state,
    history: {
      ...state.history,
      achievements: [...state.history.achievements, ...newIds],
    },
  };
  save(gameState.value);

  // Push notifications
  const notifications = newIds
    .map((id) => {
      const def = getAchievementById(id);
      return def ? { id: def.id, name: def.name, description: def.description } : null;
    })
    .filter((n): n is NonNullable<typeof n> => n != null);

  pushAchievementNotifications(notifications);
}

// ── Coach ─────────────────────────────────────────────────────────

const coachTiers = (balanceData as any).coach.tiers as Array<{
  tier: number;
  name: string;
  weeklyCost: number;
  xpMultiplier: number;
  fatigueReduction: number;
  levelRequired: number;
  description: string;
}>;

export function getCoachTiers() {
  return coachTiers;
}

export function hireCoach(tier: number): { success: boolean; message: string } {
  const state = gameState.value;
  if (!state) return { success: false, message: "No game state." };

  const tierData = coachTiers.find((t) => t.tier === tier);
  if (!tierData) return { success: false, message: "Invalid coach tier." };

  if (state.runner.level < tierData.levelRequired) {
    return { success: false, message: `Requires level ${tierData.levelRequired}.` };
  }

  if (state.inventory.money < tierData.weeklyCost) {
    return { success: false, message: `Not enough money. Need $${tierData.weeklyCost}.` };
  }

  const coach: CoachState = {
    hired: true,
    tier: tierData.tier,
    name: tierData.name,
    weeklyCost: tierData.weeklyCost,
    xpMultiplier: tierData.xpMultiplier,
    fatigueReduction: tierData.fatigueReduction,
  };

  gameState.value = {
    ...state,
    coach,
    inventory: {
      ...state.inventory,
      money: state.inventory.money - tierData.weeklyCost,
    },
  };

  save(gameState.value);
  return { success: true, message: `Hired ${tierData.name}!` };
}

export function fireCoach(): void {
  const state = gameState.value;
  if (!state) return;

  gameState.value = {
    ...state,
    coach: null,
  };

  save(gameState.value);
}

/** Deducts weekly coach fee if it's a new week. Returns a message if coach was auto-fired. */
function processCoachWeeklyFee(state: GameState, isNewWeek: boolean): { newState: GameState; message: string | null } {
  if (!isNewWeek || !state.coach?.hired) {
    return { newState: state, message: null };
  }

  const cost = state.coach.weeklyCost;
  if (state.inventory.money >= cost) {
    return {
      newState: {
        ...state,
        inventory: {
          ...state.inventory,
          money: state.inventory.money - cost,
        },
      },
      message: null,
    };
  }

  // Can't afford — auto-fire
  return {
    newState: {
      ...state,
      coach: null,
    },
    message: `Can't afford coach fee ($${cost}/week). Coach dismissed.`,
  };
}

// ── Generic Updater ───────────────────────────────────────────────────

export function updateGameState(partial: Partial<GameState>): void {
  const state = gameState.value;
  if (!state) return;

  gameState.value = {
    ...state,
    ...partial,
  };
}
