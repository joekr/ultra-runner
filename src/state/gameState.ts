// state/gameState.ts — Signal-based state management

import { signal, computed } from "@preact/signals";
import type {
  GameState,
  InventoryState,
  Screen,
  StatsState,
  WeeklyPlan,
} from "../types";
import { CURRENT_SCHEMA_VERSION } from "../types";

// ── XP-to-stat conversion ─────────────────────────────────────────────

/** Convert accumulated XP to display stat value (1-100) */
export function xpToStat(xp: number): number {
  return Math.min(100, 1 + 14.2 * Math.log10(1 + xp));
}

// ── Core signals ──────────────────────────────────────────────────────

export const gameState = signal<GameState | null>(null);

export const currentScreen = signal<Screen>("runner_creation");

// ── Computed signals ──────────────────────────────────────────────────

/** Derived display values (1-100) for each stat */
export const statValues = computed(() => {
  const state = gameState.value;
  if (!state) {
    return {
      endurance: 1,
      speed: 1,
      strength: 1,
      mentalToughness: 1,
      recovery: 1,
      nutritionIQ: 1,
    };
  }
  const s = state.stats;
  return {
    endurance: xpToStat(s.endurance.trainingXp),
    speed: xpToStat(s.speed.trainingXp),
    strength: xpToStat(s.strength.trainingXp),
    mentalToughness: xpToStat(s.mentalToughness.trainingXp),
    recovery: xpToStat(s.recovery.trainingXp),
    nutritionIQ: xpToStat(s.nutritionIQ.trainingXp),
  };
});

/** Aggregate fitness level: average of all stat display values */
export const fitnessLevel = computed(() => {
  const vals = statValues.value;
  const all = [
    vals.endurance,
    vals.speed,
    vals.strength,
    vals.mentalToughness,
    vals.recovery,
    vals.nutritionIQ,
  ];
  return Math.round(all.reduce((a, b) => a + b, 0) / all.length);
});

// ── Backstory bonus XP ───────────────────────────────────────────────

type Backstory = "couch_to_5k" | "former_athlete" | "hiker" | "stress_runner";

function backstoryBonuses(backstory: Backstory): Partial<Record<keyof StatsState, number>> {
  switch (backstory) {
    case "couch_to_5k":
      return {}; // 1.15x early XP handled elsewhere
    case "former_athlete":
      return { endurance: 200 };
    case "hiker":
      return { strength: 150 };
    case "stress_runner":
      return { recovery: 150 };
  }
}

// ── Default training plan ─────────────────────────────────────────────

const DEFAULT_TRAINING_PLAN: WeeklyPlan = [
  { workout: "easy_run" },   // Mon
  { workout: "intervals" },  // Tue
  { workout: "easy_run" },   // Wed
  { workout: "rest" },       // Thu
  { workout: "easy_run" },   // Fri
  { workout: "long_run" },   // Sat
  { workout: "rest" },       // Sun
];

// ── Default starting inventory ────────────────────────────────────────

export const DEFAULT_INVENTORY: InventoryState = {
  money: 200,
  shoes: [
    {
      id: "shoe_basic_1",
      templateId: "basic_trainers",
      durability: 300,
      maxDurability: 300,
    },
  ],
  apparel: [
    {
      id: "apparel_cotton_tee_1",
      templateId: "cotton_tee",
      durability: 9999,
      maxDurability: 9999,
    },
    {
      id: "apparel_split_shorts_1",
      templateId: "split_shorts",
      durability: 9999,
      maxDurability: 9999,
    },
  ],
  accessories: [],
  equippedShoe: "shoe_basic_1",
  equippedApparel: ["apparel_cotton_tee_1", "apparel_split_shorts_1"],
  equippedAccessories: [],
  consumables: {},
};

// ── Create new game ───────────────────────────────────────────────────

/** Progression XP thresholds (level index -> cumulative XP needed) */
const LEVEL_THRESHOLDS = [0, 500, 1200, 2500, 4500, 7500, 12000, 18000, 26000, 36000, 48000, 65000];

export function createNewGame(name: string, backstory: Backstory): GameState {
  const now = Date.now();
  const bonuses = backstoryBonuses(backstory);

  const makeEntry = (stat: keyof StatsState) => ({
    trainingXp: bonuses[stat] ?? 0,
  });

  return {
    version: CURRENT_SCHEMA_VERSION,
    createdAt: now,
    lastSavedAt: now,
    lastTickAt: now,

    runner: {
      name,
      backstory,
      level: 1,
      xp: 0,
      xpToNextLevel: LEVEL_THRESHOLDS[1],
    },

    stats: {
      endurance: makeEntry("endurance"),
      speed: makeEntry("speed"),
      strength: makeEntry("strength"),
      mentalToughness: makeEntry("mentalToughness"),
      recovery: makeEntry("recovery"),
      nutritionIQ: makeEntry("nutritionIQ"),
    },

    condition: {
      fatigue: 0,
      morale: 70,
      energy: 100,
      health: 100,
    },

    injuries: [],

    calendar: {
      gameDay: 1,
      season: "spring",
      weekDay: 0, // Monday
      trainingPlan: DEFAULT_TRAINING_PLAN,
      scheduledRaces: [],
    },

    training: {
      currentWorkout: null,
      weeklyMileage: 0,
      previousWeekMileage: 0,
      totalMiles: 0,
      streak: 0,
      recoveryToolsUsedOnDay: {},
    },

    race: {
      active: null,
    },

    inventory: structuredClone(DEFAULT_INVENTORY),

    history: {
      completedRaces: [],
      personalBests: {},
      achievements: [],
      totalRacesFinished: 0,
      totalRacesDNF: 0,
    },

    flags: {
      tutorialComplete: false,
      firstRaceComplete: false,
      firstDNF: false,
      unlockedDistances: ["5k"],
    },

    settings: {
      soundEnabled: true,
      tapFeedback: true,
    },

    coach: null,
  };
}
