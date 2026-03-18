// state/actions.ts — State mutation functions

import type {
  GameState,
  Screen,
  ActiveWorkout,
  StatsState,
  DayPlan,
} from "../types";
import { gameState, currentScreen, createNewGame } from "./gameState";
import { save } from "../engine/saveManager";

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

  const workout: ActiveWorkout = {
    workoutType,
    startedAt: Date.now(),
    duration: 0,     // Will be set by the training system based on workout data
    elapsed: 0,
    taps: 0,
    effortMeter: 0,
    sweetSpotHits: 0,
    sweetSpotMisses: 0,
    statGainsAccumulated: {},
  };

  gameState.value = {
    ...state,
    training: {
      ...state.training,
      currentWorkout: workout,
    },
  };

  currentScreen.value = "active_workout";
}

export function endWorkout(): void {
  const state = gameState.value;
  if (!state || !state.training.currentWorkout) return;

  const gains = state.training.currentWorkout.statGainsAccumulated;

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

  gameState.value = {
    ...state,
    stats: newStats,
    training: {
      ...state.training,
      currentWorkout: null,
    },
  };

  save(gameState.value);
  currentScreen.value = "dashboard";
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
        { raceId, gameDay: state.calendar.gameDay + 7 },
      ],
    },
  };

  save(gameState.value);
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
