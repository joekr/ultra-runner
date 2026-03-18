import { describe, it, expect } from "vitest";
import {
  LEVEL_THRESHOLDS,
  XP_PER_WORKOUT,
  XP_PER_RACE_BASE,
  XP_PER_PR,
  DISTANCE_UNLOCKS,
  calculateLevel,
  xpToNextLevel,
  awardRaceXP,
  awardWorkoutXP,
  checkUnlocks,
} from "../src/systems/progression";
import { createNewGame } from "../src/state/gameState";

// ── Constants sanity ─────────────────────────────────────────────────

describe("progression constants", () => {
  it("LEVEL_THRESHOLDS starts at 0 and is ascending", () => {
    expect(LEVEL_THRESHOLDS[0]).toBe(0);
    for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
      expect(LEVEL_THRESHOLDS[i]).toBeGreaterThan(LEVEL_THRESHOLDS[i - 1]);
    }
  });

  it("XP_PER_WORKOUT is 100", () => {
    expect(XP_PER_WORKOUT).toBe(100);
  });

  it("XP_PER_RACE_BASE has 4 tiers", () => {
    expect(XP_PER_RACE_BASE).toHaveLength(4);
    expect(XP_PER_RACE_BASE[0]).toBe(200);
  });

  it("XP_PER_PR is 500", () => {
    expect(XP_PER_PR).toBe(500);
  });
});

// ── calculateLevel ───────────────────────────────────────────────────

describe("calculateLevel", () => {
  it("returns level 1 for 0 XP", () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it("returns level 1 for XP below first threshold", () => {
    expect(calculateLevel(LEVEL_THRESHOLDS[1] - 1)).toBe(1);
  });

  it("returns level 2 at exactly second threshold", () => {
    expect(calculateLevel(LEVEL_THRESHOLDS[1])).toBe(2);
  });

  it("returns level 3 at third threshold", () => {
    expect(calculateLevel(LEVEL_THRESHOLDS[2])).toBe(3);
  });

  it("returns level 5 at fifth threshold", () => {
    expect(calculateLevel(LEVEL_THRESHOLDS[4])).toBe(5);
  });

  it("returns max level for very large XP", () => {
    expect(calculateLevel(99999999)).toBe(LEVEL_THRESHOLDS.length);
  });

  it("returns correct level just below a threshold", () => {
    expect(calculateLevel(LEVEL_THRESHOLDS[2] - 1)).toBe(2);
  });
});

// ── xpToNextLevel ────────────────────────────────────────────────────

describe("xpToNextLevel", () => {
  it("returns correct values for 0 XP (level 1)", () => {
    const result = xpToNextLevel(0);
    expect(result.current).toBe(0);
    expect(result.needed).toBe(LEVEL_THRESHOLDS[1]); // first threshold
    expect(result.progress).toBe(0);
  });

  it("returns correct progress mid-level", () => {
    const mid = Math.floor(LEVEL_THRESHOLDS[1] / 2);
    const result = xpToNextLevel(mid);
    expect(result.current).toBe(mid);
    expect(result.needed).toBe(LEVEL_THRESHOLDS[1]);
    expect(result.progress).toBeCloseTo(0.5, 1);
  });

  it("returns 0 progress at exact threshold", () => {
    const t1 = LEVEL_THRESHOLDS[1];
    const t2 = LEVEL_THRESHOLDS[2];
    const result = xpToNextLevel(t1);
    expect(result.current).toBe(0);
    expect(result.needed).toBe(t2 - t1);
    expect(result.progress).toBe(0);
  });

  it("returns full progress at max level", () => {
    const result = xpToNextLevel(99999999);
    expect(result.progress).toBe(1);
  });

  it("progress is between 0 and 1", () => {
    for (const xp of [0, 100, 500, 1000, 5000, 30000]) {
      const result = xpToNextLevel(xp);
      expect(result.progress).toBeGreaterThanOrEqual(0);
      expect(result.progress).toBeLessThanOrEqual(1);
    }
  });
});

// ── awardRaceXP ──────────────────────────────────────────────────────

describe("awardRaceXP", () => {
  it("returns base XP for tier 0 mid-pack finish", () => {
    expect(awardRaceXP(0, 0.5, false)).toBe(200);
  });

  it("returns higher base XP for higher tiers", () => {
    expect(awardRaceXP(1, 0.5, false)).toBe(400);
    expect(awardRaceXP(2, 0.5, false)).toBe(800);
    expect(awardRaceXP(3, 0.5, false)).toBe(1500);
  });

  it("gives 50% bonus for top 10% placement", () => {
    expect(awardRaceXP(0, 0.05, false)).toBe(300); // 200 * 1.5
  });

  it("gives 25% bonus for top 25% placement", () => {
    expect(awardRaceXP(0, 0.2, false)).toBe(250); // 200 * 1.25
  });

  it("gives no placement bonus for 50th percentile", () => {
    expect(awardRaceXP(0, 0.5, false)).toBe(200);
  });

  it("adds PR bonus", () => {
    expect(awardRaceXP(0, 0.5, true)).toBe(200 + 500);
  });

  it("stacks placement and PR bonuses", () => {
    expect(awardRaceXP(0, 0.05, true)).toBe(300 + 500); // 1.5x base + PR
  });

  it("clamps tier to max available", () => {
    // Tier 99 should use highest available (index 3)
    expect(awardRaceXP(99, 0.5, false)).toBe(1500);
  });
});

// ── awardWorkoutXP ───────────────────────────────────────────────────

describe("awardWorkoutXP", () => {
  it("returns flat XP per workout", () => {
    expect(awardWorkoutXP()).toBe(100);
  });
});

// ── DISTANCE_UNLOCKS ─────────────────────────────────────────────────

describe("DISTANCE_UNLOCKS", () => {
  it("has correct mapping", () => {
    expect(DISTANCE_UNLOCKS[1]).toEqual(["5k"]);
    expect(DISTANCE_UNLOCKS[3]).toEqual(["10k"]);
    expect(DISTANCE_UNLOCKS[5]).toEqual(["half_marathon"]);
    expect(DISTANCE_UNLOCKS[8]).toEqual(["marathon"]);
    expect(DISTANCE_UNLOCKS[12]).toEqual(["50k"]);
    expect(DISTANCE_UNLOCKS[50]).toEqual(["barkley"]);
  });
});

// ── checkUnlocks ─────────────────────────────────────────────────────

describe("checkUnlocks", () => {
  it("returns 5k for level 1 with nothing unlocked", () => {
    expect(checkUnlocks(1, [])).toEqual(["5k"]);
  });

  it("returns nothing if already unlocked", () => {
    expect(checkUnlocks(1, ["5k"])).toEqual([]);
  });

  it("returns 10k at level 3", () => {
    const newUnlocks = checkUnlocks(3, ["5k"]);
    expect(newUnlocks).toContain("10k");
    expect(newUnlocks).not.toContain("5k"); // already unlocked
  });

  it("returns all missing unlocks for high level", () => {
    const newUnlocks = checkUnlocks(12, ["5k"]);
    expect(newUnlocks).toContain("10k");
    expect(newUnlocks).toContain("half_marathon");
    expect(newUnlocks).toContain("marathon");
    expect(newUnlocks).toContain("50k");
    expect(newUnlocks).not.toContain("5k");
  });

  it("returns empty array if level too low for new unlocks", () => {
    expect(checkUnlocks(2, ["5k"])).toEqual([]);
  });

  it("returns multiple unlocks when skipping levels", () => {
    // Jump from level 1 to level 5 with only 5k unlocked
    const newUnlocks = checkUnlocks(5, ["5k"]);
    expect(newUnlocks).toEqual(["10k", "half_marathon"]);
  });
});

// ── Backstory bonuses in createNewGame ───────────────────────────────

describe("backstory bonuses in createNewGame", () => {
  it("couch_to_5k: no stat bonus", () => {
    const state = createNewGame("Beginner", "couch_to_5k");
    expect(state.stats.endurance.trainingXp).toBe(0);
    expect(state.stats.speed.trainingXp).toBe(0);
    expect(state.stats.strength.trainingXp).toBe(0);
    expect(state.stats.mentalToughness.trainingXp).toBe(0);
    expect(state.stats.recovery.trainingXp).toBe(0);
    expect(state.stats.nutritionIQ.trainingXp).toBe(0);
  });

  it("former_athlete: +200 endurance trainingXp", () => {
    const state = createNewGame("Athlete", "former_athlete");
    expect(state.stats.endurance.trainingXp).toBe(200);
    expect(state.stats.speed.trainingXp).toBe(0);
    expect(state.stats.strength.trainingXp).toBe(0);
    expect(state.stats.recovery.trainingXp).toBe(0);
  });

  it("hiker: +150 strength trainingXp", () => {
    const state = createNewGame("Hiker", "hiker");
    expect(state.stats.strength.trainingXp).toBe(150);
    expect(state.stats.endurance.trainingXp).toBe(0);
  });

  it("stress_runner: +150 recovery trainingXp", () => {
    const state = createNewGame("Stressed", "stress_runner");
    expect(state.stats.recovery.trainingXp).toBe(150);
    expect(state.stats.endurance.trainingXp).toBe(0);
  });
});
