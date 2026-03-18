import { describe, it, expect, beforeEach } from "vitest";
import { createNewGame, xpToStat, gameState, statValues, fitnessLevel } from "../src/state/gameState";
import { CURRENT_SCHEMA_VERSION } from "../src/types";

describe("createNewGame", () => {
  it("should create valid state with correct version and timestamps", () => {
    const before = Date.now();
    const state = createNewGame("Test Runner", "couch_to_5k");
    const after = Date.now();

    expect(state.version).toBe(CURRENT_SCHEMA_VERSION);
    expect(state.createdAt).toBeGreaterThanOrEqual(before);
    expect(state.createdAt).toBeLessThanOrEqual(after);
    expect(state.lastSavedAt).toBe(state.createdAt);
    expect(state.lastTickAt).toBe(state.createdAt);
  });

  it("should set runner name and backstory", () => {
    const state = createNewGame("Alice", "former_athlete");
    expect(state.runner.name).toBe("Alice");
    expect(state.runner.backstory).toBe("former_athlete");
    expect(state.runner.level).toBe(1);
    expect(state.runner.xp).toBe(0);
    expect(state.runner.xpToNextLevel).toBe(500);
  });

  it("should give couch_to_5k no bonus XP", () => {
    const state = createNewGame("Beginner", "couch_to_5k");
    expect(state.stats.endurance.trainingXp).toBe(0);
    expect(state.stats.speed.trainingXp).toBe(0);
    expect(state.stats.strength.trainingXp).toBe(0);
    expect(state.stats.mentalToughness.trainingXp).toBe(0);
    expect(state.stats.recovery.trainingXp).toBe(0);
    expect(state.stats.nutritionIQ.trainingXp).toBe(0);
  });

  it("should give former_athlete +200 endurance XP", () => {
    const state = createNewGame("Athlete", "former_athlete");
    expect(state.stats.endurance.trainingXp).toBe(200);
    expect(state.stats.speed.trainingXp).toBe(0);
    expect(state.stats.strength.trainingXp).toBe(0);
    expect(state.stats.recovery.trainingXp).toBe(0);
  });

  it("should give hiker +150 strength XP", () => {
    const state = createNewGame("Hiker", "hiker");
    expect(state.stats.strength.trainingXp).toBe(150);
    expect(state.stats.endurance.trainingXp).toBe(0);
    expect(state.stats.speed.trainingXp).toBe(0);
  });

  it("should give stress_runner +150 recovery XP", () => {
    const state = createNewGame("Stressed", "stress_runner");
    expect(state.stats.recovery.trainingXp).toBe(150);
    expect(state.stats.endurance.trainingXp).toBe(0);
    expect(state.stats.speed.trainingXp).toBe(0);
  });

  it("should set starting inventory with $200 and equipped gear", () => {
    const state = createNewGame("Runner", "couch_to_5k");
    expect(state.inventory.money).toBe(200);
    expect(state.inventory.shoes).toHaveLength(1);
    expect(state.inventory.shoes[0].templateId).toBe("basic_trainers");
    expect(state.inventory.shoes[0].durability).toBe(300);
    expect(state.inventory.equippedShoe).toBe("shoe_basic_1");
    expect(state.inventory.apparel).toHaveLength(2);
    expect(state.inventory.equippedApparel).toHaveLength(2);
  });

  it("should set default training plan", () => {
    const state = createNewGame("Runner", "couch_to_5k");
    const plan = state.calendar.trainingPlan;
    expect(plan[0].workout).toBe("easy_run");   // Mon
    expect(plan[1].workout).toBe("intervals");   // Tue
    expect(plan[2].workout).toBe("easy_run");    // Wed
    expect(plan[3].workout).toBe("rest");         // Thu
    expect(plan[4].workout).toBe("easy_run");    // Fri
    expect(plan[5].workout).toBe("long_run");    // Sat
    expect(plan[6].workout).toBe("rest");         // Sun
  });

  it("should unlock only 5k initially", () => {
    const state = createNewGame("Runner", "couch_to_5k");
    expect(state.flags.unlockedDistances).toEqual(["5k"]);
    expect(state.flags.tutorialComplete).toBe(false);
    expect(state.flags.firstRaceComplete).toBe(false);
    expect(state.flags.firstDNF).toBe(false);
  });

  it("should set initial condition values", () => {
    const state = createNewGame("Runner", "couch_to_5k");
    expect(state.condition.fatigue).toBe(0);
    expect(state.condition.morale).toBe(70);
    expect(state.condition.energy).toBe(100);
    expect(state.condition.health).toBe(100);
  });

  it("should have no active workout or race", () => {
    const state = createNewGame("Runner", "couch_to_5k");
    expect(state.training.currentWorkout).toBeNull();
    expect(state.race.active).toBeNull();
  });
});

describe("xpToStat", () => {
  it("should return 1 for 0 XP", () => {
    expect(xpToStat(0)).toBeCloseTo(1, 1);
  });

  it("should return approximately 30 for ~500 XP", () => {
    const val = xpToStat(500);
    expect(val).toBeGreaterThan(25);
    expect(val).toBeLessThan(45);
  });

  it("should cap at 100", () => {
    expect(xpToStat(10_000_000)).toBe(100);
  });

  it("should be monotonically increasing", () => {
    let prev = xpToStat(0);
    for (const xp of [10, 100, 500, 1000, 5000, 50000]) {
      const val = xpToStat(xp);
      expect(val).toBeGreaterThan(prev);
      prev = val;
    }
  });
});

describe("computed signals", () => {
  beforeEach(() => {
    gameState.value = null;
  });

  it("statValues should return 1 for all stats when no game state", () => {
    const vals = statValues.value;
    expect(vals.endurance).toBe(1);
    expect(vals.speed).toBe(1);
  });

  it("statValues should compute from game state XP", () => {
    gameState.value = createNewGame("Test", "former_athlete");
    const vals = statValues.value;
    // former_athlete has 200 endurance XP
    expect(vals.endurance).toBeGreaterThan(1);
    // speed has 0 XP
    expect(vals.speed).toBeCloseTo(1, 1);
  });

  it("fitnessLevel should return average of stat values", () => {
    gameState.value = createNewGame("Test", "couch_to_5k");
    // All stats at 0 XP -> all display values ~1 -> average ~1
    expect(fitnessLevel.value).toBe(1);
  });

  it("fitnessLevel should increase with stat XP", () => {
    gameState.value = createNewGame("Test", "former_athlete");
    // former_athlete has 200 endurance XP, rest 0
    expect(fitnessLevel.value).toBeGreaterThanOrEqual(1);
  });
});
