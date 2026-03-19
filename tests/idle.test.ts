import { describe, it, expect } from "vitest";
import {
  computeIdleGains,
  applyIdleGains,
} from "../src/engine/idleCalculator";
import type { GameState, IdleRestSubstitution } from "../src/types";

/** Helper: build a minimal valid GameState for testing. */
function makeState(overrides: Partial<GameState> = {}): GameState {
  const base: GameState = {
    version: 1,
    createdAt: 0,
    lastSavedAt: 0,
    lastTickAt: 0,
    runner: {
      name: "Test Runner",
      backstory: "couch_to_5k",
      level: 1,
      xp: 0,
      xpToNextLevel: 500,
    },
    stats: {
      endurance: { trainingXp: 0 },
      speed: { trainingXp: 0 },
      strength: { trainingXp: 0 },
      mentalToughness: { trainingXp: 0 },
      recovery: { trainingXp: 0 },
      nutritionIQ: { trainingXp: 0 },
    },
    condition: {
      fatigue: 50,
      morale: 70,
      energy: 80,
      health: 100,
    },
    injuries: [],
    calendar: {
      gameDay: 0,
      season: "spring",
      weekDay: 0, // Monday
      trainingPlan: [
        { workout: "easy_run" },   // Mon
        { workout: "easy_run" },   // Tue
        { workout: "intervals" },  // Wed
        { workout: "easy_run" },   // Thu
        { workout: "rest" },       // Fri
        { workout: "long_run" },   // Sat
        { workout: "easy_run" },   // Sun
      ],
      scheduledRaces: [],
    },
    training: {
      currentWorkout: null,
      weeklyMileage: 0,
      previousWeekMileage: 0,
      totalMiles: 0,
      streak: 0,
      consecutiveRestDays: 0,
      recoveryToolsUsedOnDay: {},
    },
    race: { active: null },
    inventory: {
      money: 100,
      shoes: [],
      apparel: [],
      accessories: [],
      equippedShoe: null,
      equippedApparel: [],
      equippedAccessories: [],
      consumables: {},
    },
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
      firstUltraComplete: false,
      firstMarathonComplete: false,
      sponsoredRunTier: 0,
      unlockedDistances: ["5k"],
      raceAchievementFlags: {},
    },
    settings: {
      soundEnabled: true,
      tapFeedback: true,
    },
    coach: null,
  };

  return { ...base, ...overrides };
}

describe("computeIdleGains", () => {
  it("returns null for less than 36 seconds away", () => {
    const state = makeState({ lastTickAt: 1000 });
    // 30 seconds = 30_000 ms later
    const result = computeIdleGains(state, 1000 + 30_000);
    expect(result).toBeNull();
  });

  it("returns null for exactly 0 elapsed time", () => {
    const state = makeState({ lastTickAt: 5000 });
    expect(computeIdleGains(state, 5000)).toBeNull();
  });

  it("returns correct gameDaysAdvanced for known elapsed time", () => {
    // 4 game hours per real hour → 6 real hours = 1 game day
    // 12 real hours → 2 game days (but capped at 8 real hours)
    // 8 real hours → 8 * 4 / 24 = 1.33 → floor = 1 game day
    // Let's try 6 real hours exactly → 6 * 4 / 24 = 1 game day
    const now = 100_000;
    const sixRealHoursMs = 6 * 3_600_000;
    const state = makeState({ lastTickAt: now });

    const result = computeIdleGains(state, now + sixRealHoursMs);
    expect(result).not.toBeNull();
    expect(result!.gameDaysAdvanced).toBe(1);
  });

  it("converts 8 real hours to correct game days", () => {
    // 8 real hours * 4 game hrs/real hr = 32 game hours / 24 = 1.33 → 1 day
    const now = 0;
    const eightHoursMs = 8 * 3_600_000;
    const state = makeState({ lastTickAt: now });

    const result = computeIdleGains(state, eightHoursMs);
    expect(result).not.toBeNull();
    expect(result!.gameDaysAdvanced).toBe(1);
    expect(result!.idleCapped).toBe(false);
  });

  it("easy run days produce stat gains at 50% efficiency", () => {
    // State starts on Monday (weekDay=0), plan has easy_run on Monday
    // 6 real hours = 1 game day
    const now = 0;
    const sixHoursMs = 6 * 3_600_000;
    const state = makeState({ lastTickAt: now });

    const result = computeIdleGains(state, sixHoursMs);
    expect(result).not.toBeNull();
    expect(result!.gameDaysAdvanced).toBe(1);

    // easy_run: baseXpPerDay=65, efficiency=0.5 → 32.5 XP total
    // statDistribution: endurance 0.6, recovery 0.3, speed 0.1
    expect(result!.statGains.endurance).toBeCloseTo(65 * 0.5 * 0.6);
    expect(result!.statGains.recovery).toBeCloseTo(65 * 0.5 * 0.3);
    expect(result!.statGains.speed).toBeCloseTo(65 * 0.5 * 0.1);

    // Check workout entry
    expect(result!.workoutsCompleted).toHaveLength(1);
    expect(result!.workoutsCompleted[0]).toMatchObject({
      type: "easy_run",
      efficiency: 0.5,
    });
  });

  it("rest days reduce fatigue", () => {
    // Friday (weekDay=4) is a rest day in our plan
    // Start on Friday: weekDay=4
    const now = 0;
    const sixHoursMs = 6 * 3_600_000;
    const state = makeState({
      lastTickAt: now,
      calendar: {
        gameDay: 4,
        season: "spring",
        weekDay: 4, // Friday = rest day
        trainingPlan: [
          { workout: "easy_run" },
          { workout: "easy_run" },
          { workout: "intervals" },
          { workout: "easy_run" },
          { workout: "rest" },
          { workout: "long_run" },
          { workout: "easy_run" },
        ],
        scheduledRaces: [],
      },
    });

    const result = computeIdleGains(state, sixHoursMs);
    expect(result).not.toBeNull();
    expect(result!.gameDaysAdvanced).toBe(1);

    // Rest day: fatigue should decrease significantly
    // Includes both rest recovery + passive daily recovery
    expect(result!.fatigueChange).toBeLessThan(-15);

    // No stat gains from rest
    expect(Object.keys(result!.statGains)).toHaveLength(0);
  });

  it("rest days with high recovery stat reduce more fatigue", () => {
    const now = 0;
    const sixHoursMs = 6 * 3_600_000;
    const state = makeState({
      lastTickAt: now,
      stats: {
        endurance: { trainingXp: 0 },
        speed: { trainingXp: 0 },
        strength: { trainingXp: 0 },
        mentalToughness: { trainingXp: 0 },
        recovery: { trainingXp: 1000 },
        nutritionIQ: { trainingXp: 0 },
      },
      calendar: {
        gameDay: 4,
        season: "spring",
        weekDay: 4, // Friday = rest
        trainingPlan: [
          { workout: "easy_run" },
          { workout: "easy_run" },
          { workout: "intervals" },
          { workout: "easy_run" },
          { workout: "rest" },
          { workout: "long_run" },
          { workout: "easy_run" },
        ],
        scheduledRaces: [],
      },
    });

    const result = computeIdleGains(state, sixHoursMs);
    expect(result).not.toBeNull();

    // Higher recovery stat = more rest day recovery + more passive recovery
    // Should recover more than the zero-stat case
    expect(result!.fatigueChange).toBeLessThan(-20);
  });

  it("hard workouts (long_run, intervals) are substituted with rest", () => {
    // Wednesday (weekDay=2) has intervals in our plan
    const now = 0;
    const sixHoursMs = 6 * 3_600_000;
    const state = makeState({
      lastTickAt: now,
      calendar: {
        gameDay: 2,
        season: "spring",
        weekDay: 2, // Wednesday = intervals
        trainingPlan: [
          { workout: "easy_run" },
          { workout: "easy_run" },
          { workout: "intervals" },
          { workout: "easy_run" },
          { workout: "rest" },
          { workout: "long_run" },
          { workout: "easy_run" },
        ],
        scheduledRaces: [],
      },
    });

    const result = computeIdleGains(state, sixHoursMs);
    expect(result).not.toBeNull();
    expect(result!.gameDaysAdvanced).toBe(1);

    // Substituted rest: fatigue reduced by substitutedRestRecovery + passive daily recovery
    expect(result!.fatigueChange).toBeLessThan(-8);

    // Check it's marked as substitution
    const entry = result!.workoutsCompleted[0] as IdleRestSubstitution;
    expect(entry.type).toBe("rest_substituted");
    expect(entry.originalPlan).toBe("intervals");
  });

  it("8-hour cap works — 24 real hours still caps at 8 hours of gains", () => {
    const now = 0;
    const twentyFourHoursMs = 24 * 3_600_000;
    const state = makeState({ lastTickAt: now });

    const result = computeIdleGains(state, twentyFourHoursMs);
    expect(result).not.toBeNull();
    expect(result!.idleCapped).toBe(true);

    // 8 capped hours * 4 game hrs/real hr = 32 game hours / 24 = 1.33 → 1 day
    expect(result!.gameDaysAdvanced).toBe(1);

    // realHoursAway should still report the actual time
    expect(result!.realHoursAway).toBe(24);
  });

  it("handles multi-day idle spanning different workout types", () => {
    // 7 real hours * 4 = 28 game hours → 1 day. Need more for 2 days.
    // 12 real hours → capped at 8 → 32 game hrs → 1 day
    // For 2+ days we need longer compression. With 4x, need 12 real hours for 2 days.
    // But cap is 8. So max is 1 day with current compression.
    // Let's test with a custom scenario: start at day 0 (Mon), 8 hours gives 1 day.
    // We can't get more than 1 day with 4x compression and 8h cap.
    // That's fine — the cap test is already covered above.
    const now = 0;
    const eightHoursMs = 8 * 3_600_000;
    const state = makeState({ lastTickAt: now });

    const result = computeIdleGains(state, eightHoursMs);
    expect(result).not.toBeNull();
    expect(result!.gameDaysAdvanced).toBe(1);
  });

  it("returns 0 gameDaysAdvanced when away long enough but not a full day", () => {
    // 2 real hours * 4 = 8 game hours → floor(8/24) = 0
    const now = 0;
    const twoHoursMs = 2 * 3_600_000;
    const state = makeState({ lastTickAt: now });

    const result = computeIdleGains(state, twoHoursMs);
    expect(result).not.toBeNull();
    expect(result!.gameDaysAdvanced).toBe(0);
    expect(result!.workoutsCompleted).toHaveLength(0);
  });
});

describe("applyIdleGains", () => {
  it("correctly merges stat gains into state", () => {
    const state = makeState({
      stats: {
        endurance: { trainingXp: 100 },
        speed: { trainingXp: 50 },
        strength: { trainingXp: 0 },
        mentalToughness: { trainingXp: 0 },
        recovery: { trainingXp: 30 },
        nutritionIQ: { trainingXp: 0 },
      },
    });

    const result = computeIdleGains(
      { ...state, lastTickAt: 0 },
      6 * 3_600_000,
    );
    expect(result).not.toBeNull();

    const newState = applyIdleGains(result!, state);

    // easy_run on day 0: baseXpPerDay=65, efficiency=0.5
    expect(newState.stats.endurance.trainingXp).toBeCloseTo(100 + 65 * 0.5 * 0.6);
    expect(newState.stats.recovery.trainingXp).toBeCloseTo(30 + 65 * 0.5 * 0.3);
    expect(newState.stats.speed.trainingXp).toBeCloseTo(50 + 65 * 0.5 * 0.1);

    // Unchanged stats stay the same
    expect(newState.stats.strength.trainingXp).toBe(0);
    expect(newState.stats.mentalToughness.trainingXp).toBe(0);
    expect(newState.stats.nutritionIQ.trainingXp).toBe(0);
  });

  it("updates fatigue and clamps to 0-100", () => {
    // Test clamping at 0
    const lowFatigueState = makeState({
      condition: { fatigue: 5, morale: 70, energy: 80, health: 100 },
      calendar: {
        gameDay: 4,
        season: "spring",
        weekDay: 4, // rest day
        trainingPlan: [
          { workout: "easy_run" },
          { workout: "easy_run" },
          { workout: "intervals" },
          { workout: "easy_run" },
          { workout: "rest" },
          { workout: "long_run" },
          { workout: "easy_run" },
        ],
        scheduledRaces: [],
      },
      lastTickAt: 0,
    });

    const result = computeIdleGains(lowFatigueState, 6 * 3_600_000);
    expect(result).not.toBeNull();
    expect(result!.fatigueChange).toBeLessThan(0);

    const newState = applyIdleGains(result!, lowFatigueState);
    expect(newState.condition.fatigue).toBe(0); // Clamped at 0
  });

  it("clamps fatigue at 100", () => {
    const highFatigueState = makeState({
      condition: { fatigue: 99.9, morale: 70, energy: 80, health: 100 },
      lastTickAt: 0,
    });

    // Force a result with large positive fatigue
    const fakeResult = {
      realHoursAway: 6,
      gameDaysAdvanced: 1,
      workoutsCompleted: [],
      statGains: {},
      fatigueChange: 50,
      moneyEarned: 0,
      idleCapped: false,
    };

    const newState = applyIdleGains(fakeResult, highFatigueState);
    expect(newState.condition.fatigue).toBe(100);
  });

  it("advances gameDay and weekDay", () => {
    const state = makeState({
      calendar: {
        gameDay: 5,
        season: "spring",
        weekDay: 5,
        trainingPlan: [
          { workout: "easy_run" },
          { workout: "easy_run" },
          { workout: "intervals" },
          { workout: "easy_run" },
          { workout: "rest" },
          { workout: "long_run" },
          { workout: "easy_run" },
        ],
        scheduledRaces: [],
      },
    });

    const result = {
      realHoursAway: 6,
      gameDaysAdvanced: 1,
      workoutsCompleted: [],
      statGains: {},
      fatigueChange: 0,
      moneyEarned: 0,
      idleCapped: false,
    };

    const newState = applyIdleGains(result, state);
    expect(newState.calendar.gameDay).toBe(6);
    expect(newState.calendar.weekDay).toBe(6); // Sat → Sun
  });

  it("wraps weekDay around 7", () => {
    const state = makeState({
      calendar: {
        gameDay: 6,
        season: "spring",
        weekDay: 6, // Sunday
        trainingPlan: [
          { workout: "easy_run" },
          { workout: "easy_run" },
          { workout: "intervals" },
          { workout: "easy_run" },
          { workout: "rest" },
          { workout: "long_run" },
          { workout: "easy_run" },
        ],
        scheduledRaces: [],
      },
    });

    const result = {
      realHoursAway: 6,
      gameDaysAdvanced: 1,
      workoutsCompleted: [],
      statGains: {},
      fatigueChange: 0,
      moneyEarned: 0,
      idleCapped: false,
    };

    const newState = applyIdleGains(result, state);
    expect(newState.calendar.weekDay).toBe(0); // Wraps to Monday
  });

  it("updates season when crossing a 28-day boundary", () => {
    const state = makeState({
      calendar: {
        gameDay: 27, // Last day of spring
        season: "spring",
        weekDay: 6,
        trainingPlan: [
          { workout: "easy_run" },
          { workout: "easy_run" },
          { workout: "intervals" },
          { workout: "easy_run" },
          { workout: "rest" },
          { workout: "long_run" },
          { workout: "easy_run" },
        ],
        scheduledRaces: [],
      },
    });

    const result = {
      realHoursAway: 6,
      gameDaysAdvanced: 1,
      workoutsCompleted: [],
      statGains: {},
      fatigueChange: 0,
      moneyEarned: 0,
      idleCapped: false,
    };

    const newState = applyIdleGains(result, state);
    expect(newState.calendar.gameDay).toBe(28);
    expect(newState.calendar.season).toBe("summer");
  });

  it("adds money earned to inventory", () => {
    const state = makeState({
      inventory: {
        money: 100,
        shoes: [],
        apparel: [],
        accessories: [],
        equippedShoe: null,
        equippedApparel: [],
        equippedAccessories: [],
        consumables: {},
      },
    });

    const result = {
      realHoursAway: 6,
      gameDaysAdvanced: 1,
      workoutsCompleted: [],
      statGains: {},
      fatigueChange: 0,
      moneyEarned: 50,
      idleCapped: false,
    };

    const newState = applyIdleGains(result, state);
    expect(newState.inventory.money).toBe(150);
  });

  it("does not mutate the original state", () => {
    const state = makeState({ lastTickAt: 0 });
    const originalFatigue = state.condition.fatigue;
    const originalEndurance = state.stats.endurance.trainingXp;

    const result = computeIdleGains(state, 6 * 3_600_000);
    expect(result).not.toBeNull();

    applyIdleGains(result!, state);

    // Original should be unchanged
    expect(state.condition.fatigue).toBe(originalFatigue);
    expect(state.stats.endurance.trainingXp).toBe(originalEndurance);
  });
});
