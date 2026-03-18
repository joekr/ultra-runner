import { describe, it, expect } from "vitest";
import {
  xpToStat,
  getStatValue,
  getAllStatValues,
  fitnessLevel,
} from "../src/systems/stats";
import type { StatsState } from "../src/types";

// ── Helper ───────────────────────────────────────────────────────────

function makeStats(
  overrides: Partial<Record<keyof StatsState, number>> = {},
): StatsState {
  const base = {
    endurance: { trainingXp: 0 },
    speed: { trainingXp: 0 },
    strength: { trainingXp: 0 },
    mentalToughness: { trainingXp: 0 },
    recovery: { trainingXp: 0 },
    nutritionIQ: { trainingXp: 0 },
  };
  for (const [key, val] of Object.entries(overrides)) {
    (base as Record<string, { trainingXp: number }>)[key] = {
      trainingXp: val,
    };
  }
  return base;
}

// ── xpToStat breakpoints ─────────────────────────────────────────────

describe("xpToStat breakpoints", () => {
  it("returns 1 for 0 XP", () => {
    expect(xpToStat(0)).toBeCloseTo(1, 1);
  });

  it("returns ~30 for 500 XP", () => {
    const val = xpToStat(500);
    expect(val).toBeGreaterThan(25);
    expect(val).toBeLessThan(45);
  });

  it("returns ~60 for 5000 XP", () => {
    const val = xpToStat(5000);
    expect(val).toBeGreaterThan(47);
    expect(val).toBeLessThan(68);
  });

  it("returns ~85 for 50000 XP", () => {
    const val = xpToStat(50000);
    expect(val).toBeGreaterThan(65);
    expect(val).toBeLessThan(92);
  });

  it("caps at 100 for very large XP", () => {
    expect(xpToStat(10_000_000)).toBe(100);
  });

  it("returns less than 100 for 999999 XP", () => {
    const val = xpToStat(999999);
    expect(val).toBeGreaterThan(80);
    expect(val).toBeLessThanOrEqual(100);
  });

  it("is monotonically increasing", () => {
    let prev = xpToStat(0);
    for (const xp of [10, 100, 500, 1000, 5000, 50000, 999999]) {
      const val = xpToStat(xp);
      expect(val).toBeGreaterThanOrEqual(prev);
      prev = val;
    }
  });
});

// ── getStatValue ─────────────────────────────────────────────────────

describe("getStatValue", () => {
  it("returns display value for a stat entry", () => {
    expect(getStatValue({ trainingXp: 0 })).toBeCloseTo(1, 1);
    expect(getStatValue({ trainingXp: 500 })).toBeGreaterThan(25);
  });
});

// ── getAllStatValues ──────────────────────────────────────────────────

describe("getAllStatValues", () => {
  it("returns all 6 stat display values", () => {
    const stats = makeStats({ endurance: 500, speed: 0 });
    const vals = getAllStatValues(stats);
    expect(Object.keys(vals)).toHaveLength(6);
    expect(vals.endurance).toBeGreaterThan(25);
    expect(vals.speed).toBeCloseTo(1, 1);
  });
});

// ── fitnessLevel ─────────────────────────────────────────────────────

describe("fitnessLevel", () => {
  it("returns 1 when all stats are at 0 XP", () => {
    const stats = makeStats();
    expect(fitnessLevel(stats)).toBe(1);
  });

  it("returns average of stat display values, rounded", () => {
    // All stats at same XP should give that xpToStat value rounded
    const xp = 500;
    const stats = makeStats({
      endurance: xp,
      speed: xp,
      strength: xp,
      mentalToughness: xp,
      recovery: xp,
      nutritionIQ: xp,
    });
    const expected = Math.round(xpToStat(xp));
    expect(fitnessLevel(stats)).toBe(expected);
  });

  it("averages mixed stat values correctly", () => {
    const stats = makeStats({ endurance: 1000, speed: 0 });
    const level = fitnessLevel(stats);
    // Should be between 1 and xpToStat(1000)
    expect(level).toBeGreaterThan(1);
    expect(level).toBeLessThan(xpToStat(1000));
  });
});
