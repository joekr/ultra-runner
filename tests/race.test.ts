import { describe, it, expect } from "vitest";
import type { StatsState, ActiveRace } from "../src/types";
import {
  initializeRace,
  getSegmentInfo,
  computeSegmentTime,
  rollEvents,
  resolveEventChoice,
  processAidStation,
  resolveSegment,
  checkCutoff,
  calculatePosition,
  completeRace,
  createDNF,
  simulateNPCField,
  type RaceEvent,
} from "../src/systems/race";
import { mulberry32 } from "../src/engine/prng";

// ── Helpers ──────────────────────────────────────────────────────────

function makeStats(overrides: Partial<Record<keyof StatsState, number>> = {}): StatsState {
  const defaultXp = 100;
  return {
    endurance: { trainingXp: overrides.endurance ?? defaultXp },
    speed: { trainingXp: overrides.speed ?? defaultXp },
    strength: { trainingXp: overrides.strength ?? defaultXp },
    mentalToughness: { trainingXp: overrides.mentalToughness ?? defaultXp },
    recovery: { trainingXp: overrides.recovery ?? defaultXp },
    nutritionIQ: { trainingXp: overrides.nutritionIQ ?? defaultXp },
  };
}

function makeRace(overrides: Partial<ActiveRace> = {}): ActiveRace {
  return {
    raceId: "park_run_5k",
    currentSegment: 0,
    totalSegments: 3,
    elapsedTime: 0,
    position: 50,
    totalRunners: 100,
    energy: 100,
    fatigue: 0,
    morale: 80,
    pacePerSegment: [],
    segmentResults: [],
    rngSeed: 12345,
    ...overrides,
  };
}

// ── initializeRace ───────────────────────────────────────────────────

describe("initializeRace", () => {
  it("creates valid state for a known race", () => {
    const stats = makeStats();
    const race = initializeRace("park_run_5k", 1, stats, null);

    expect(race.raceId).toBe("park_run_5k");
    expect(race.currentSegment).toBe(0);
    expect(race.totalSegments).toBe(3);
    expect(race.elapsedTime).toBe(0);
    expect(race.energy).toBe(100);
    expect(race.fatigue).toBe(0);
    expect(race.morale).toBe(80);
    expect(race.pacePerSegment).toEqual([]);
    expect(race.segmentResults).toEqual([]);
    expect(race.totalRunners).toBeGreaterThanOrEqual(80);
    expect(race.totalRunners).toBeLessThanOrEqual(150);
    expect(race.rngSeed).toBeGreaterThan(0);
  });

  it("throws for unknown race", () => {
    expect(() => initializeRace("nonexistent", 1, makeStats(), null)).toThrow(
      "Unknown race",
    );
  });
});

// ── getSegmentInfo ───────────────────────────────────────────────────

describe("getSegmentInfo", () => {
  it("returns correct info for first segment", () => {
    const race = makeRace({ raceId: "bridge_run_10k", currentSegment: 0, totalSegments: 4 });
    const info = getSegmentInfo(race);
    expect(info.terrain).toBe("flat_road");
    expect(info.hasAidStation).toBe(false);
    expect(info.distance).toBeCloseTo(6.2 / 4);
  });

  it("returns correct info for segment with aid station", () => {
    const race = makeRace({ raceId: "bridge_run_10k", currentSegment: 1, totalSegments: 4 });
    const info = getSegmentInfo(race);
    expect(info.terrain).toBe("rolling_hills");
    expect(info.hasAidStation).toBe(true);
  });
});

// ── computeSegmentTime ───────────────────────────────────────────────

describe("computeSegmentTime", () => {
  const segment = { terrain: "flat_road", distance: 1.0 };

  it("is faster with higher speed stat", () => {
    const race = makeRace();
    const slowStats = makeStats({ speed: 10 });
    const fastStats = makeStats({ speed: 5000 });

    const slowTime = computeSegmentTime(segment, "steady", race, slowStats);
    const fastTime = computeSegmentTime(segment, "steady", race, fastStats);

    expect(fastTime).toBeLessThan(slowTime);
  });

  it("is slower with high fatigue", () => {
    const stats = makeStats();
    const fresh = makeRace({ fatigue: 0 });
    const tired = makeRace({ fatigue: 80 });

    const freshTime = computeSegmentTime(segment, "steady", fresh, stats);
    const tiredTime = computeSegmentTime(segment, "steady", tired, stats);

    expect(tiredTime).toBeGreaterThan(freshTime);
  });

  it("applies bonk penalty when energy below 20", () => {
    const stats = makeStats();
    const normal = makeRace({ energy: 50 });
    const bonked = makeRace({ energy: 10 });

    const normalTime = computeSegmentTime(segment, "steady", normal, stats);
    const bonkedTime = computeSegmentTime(segment, "steady", bonked, stats);

    expect(bonkedTime).toBeGreaterThan(normalTime);
    // Bonk multiplier is 1.5x
    expect(bonkedTime / normalTime).toBeCloseTo(1.5, 1);
  });

  it("pace modifiers work correctly", () => {
    const race = makeRace();
    const stats = makeStats();

    const conservative = computeSegmentTime(segment, "conservative", race, stats);
    const steady = computeSegmentTime(segment, "steady", race, stats);
    const aggressive = computeSegmentTime(segment, "aggressive", race, stats);

    expect(conservative).toBeGreaterThan(steady);
    expect(steady).toBeGreaterThan(aggressive);
    expect(conservative / steady).toBeCloseTo(1.15, 1);
    expect(aggressive / steady).toBeCloseTo(0.88, 1);
  });

  it("terrain modifiers apply correctly", () => {
    const race = makeRace();
    const stats = makeStats();
    const flat = { terrain: "flat_road", distance: 1.0 };
    const hills = { terrain: "rolling_hills", distance: 1.0 };
    const steep = { terrain: "steep_climb", distance: 1.0 };

    const flatTime = computeSegmentTime(flat, "steady", race, stats);
    const hillsTime = computeSegmentTime(hills, "steady", race, stats);
    const steepTime = computeSegmentTime(steep, "steady", race, stats);

    expect(hillsTime).toBeGreaterThan(flatTime);
    expect(steepTime).toBeGreaterThan(hillsTime);
  });
});

// ── rollEvents ───────────────────────────────────────────────────────

describe("rollEvents", () => {
  it("filters by terrain and tier", () => {
    const race = makeRace({ raceId: "park_run_5k", currentSegment: 0 });
    const stats = makeStats();
    // Use a fixed RNG that always returns a very low number (triggers events)
    const rng = () => 0.01;

    const events = rollEvents(race, stats, rng);

    // All returned events should match flat_road terrain and tier <= 1
    for (const ev of events) {
      expect(ev.terrainTypes).toContain("flat_road");
      expect(ev.minTier).toBeLessThanOrEqual(1);
    }
  });

  it("returns at most 2 events per segment", () => {
    const race = makeRace({ raceId: "park_run_5k", currentSegment: 0 });
    const stats = makeStats();
    const rng = () => 0.001; // triggers everything

    const events = rollEvents(race, stats, rng);
    expect(events.length).toBeLessThanOrEqual(2);
  });

  it("respects minSegment filter", () => {
    const race = makeRace({
      raceId: "big_city_marathon",
      currentSegment: 1,
      totalSegments: 8,
    });
    const stats = makeStats();
    const rng = () => 0.001;

    const events = rollEvents(race, stats, rng);

    // "the_wall" requires minSegment 6, should not appear at segment 1
    const wallEvent = events.find((e) => e.id === "the_wall");
    expect(wallEvent).toBeUndefined();
  });
});

// ── resolveEventChoice ───────────────────────────────────────────────

describe("resolveEventChoice", () => {
  it("applies morale and energy effects from choice", () => {
    const event: RaceEvent = {
      id: "test_event",
      name: "Test",
      description: "Test event",
      type: "negative",
      baseProbability: 1.0,
      terrainTypes: ["flat_road"],
      minTier: 1,
      effect: null,
      choices: [
        {
          label: "Option A",
          effect: { morale: -10, energy: -5 },
          outcome: "You chose A.",
        },
        {
          label: "Option B",
          effect: { timepenaltySeconds: 60, morale: 5 },
          outcome: "You chose B.",
        },
      ],
    };

    const race = makeRace({ morale: 80, energy: 100, elapsedTime: 0 });

    const resultA = resolveEventChoice(event, 0, race);
    expect(resultA.race.morale).toBe(70);
    expect(resultA.race.energy).toBe(95);
    expect(resultA.outcomeText).toBe("You chose A.");

    const resultB = resolveEventChoice(event, 1, race);
    expect(resultB.race.morale).toBe(85);
    expect(resultB.race.elapsedTime).toBe(60);
    expect(resultB.outcomeText).toBe("You chose B.");
  });

  it("applies direct effect for choiceless events", () => {
    const event: RaceEvent = {
      id: "crowd_energy",
      name: "Crowd Energy",
      description: "The crowd cheers!",
      type: "positive",
      baseProbability: 0.3,
      terrainTypes: ["flat_road"],
      minTier: 1,
      effect: { morale: 10 },
      choices: null,
    };

    const race = makeRace({ morale: 60 });
    const result = resolveEventChoice(event, 0, race);
    expect(result.race.morale).toBe(70);
  });
});

// ── processAidStation ────────────────────────────────────────────────

describe("processAidStation", () => {
  it("restores energy and reduces fatigue", () => {
    const race = makeRace({ energy: 50, fatigue: 60, elapsedTime: 1000 });
    const updated = processAidStation(race, 120); // 2 minutes

    // energy: 50 + 120/30 = 54
    expect(updated.energy).toBeCloseTo(54);
    // fatigue: 60 - 120/60 = 58
    expect(updated.fatigue).toBeCloseTo(58);
    // elapsed: 1000 + 120 = 1120
    expect(updated.elapsedTime).toBe(1120);
  });

  it("clamps energy to 100", () => {
    const race = makeRace({ energy: 99, fatigue: 1 });
    const updated = processAidStation(race, 300);
    expect(updated.energy).toBe(100);
  });

  it("clamps fatigue to 0", () => {
    const race = makeRace({ energy: 50, fatigue: 1 });
    const updated = processAidStation(race, 300);
    expect(updated.fatigue).toBe(0);
  });
});

// ── checkCutoff ──────────────────────────────────────────────────────

describe("checkCutoff", () => {
  it("returns false when no cutoff", () => {
    const race = makeRace({ elapsedTime: 99999 });
    expect(checkCutoff(race, null)).toBe(false);
  });

  it("returns false when under cutoff", () => {
    const race = makeRace({ elapsedTime: 5000 }); // ~83 minutes
    expect(checkCutoff(race, 90)).toBe(false);
  });

  it("returns true when over cutoff", () => {
    const race = makeRace({ elapsedTime: 5500 }); // ~91.7 minutes
    expect(checkCutoff(race, 90)).toBe(true);
  });
});

// ── calculatePosition ────────────────────────────────────────────────

describe("calculatePosition", () => {
  it("returns 1st place when player is fastest", () => {
    const npcTimes = [1000, 1100, 1200, 1300];
    const result = calculatePosition(900, npcTimes);
    expect(result.position).toBe(1);
    expect(result.total).toBe(5);
  });

  it("returns last place when player is slowest", () => {
    const npcTimes = [800, 900, 1000];
    const result = calculatePosition(1500, npcTimes);
    expect(result.position).toBe(4);
    expect(result.total).toBe(4);
  });

  it("returns middle position correctly", () => {
    const npcTimes = [800, 900, 1000, 1100, 1200];
    const result = calculatePosition(950, npcTimes);
    // Beats 1000, 1100, 1200 (3 NPCs), so position = 6 - 3 = 3
    expect(result.position).toBe(3);
    expect(result.total).toBe(6);
  });
});

// ── simulateNPCField ─────────────────────────────────────────────────

describe("simulateNPCField", () => {
  it("generates the correct number of NPC times", () => {
    const rng = mulberry32(42);
    const times = simulateNPCField(50, 3, rng);
    expect(times.length).toBe(50);
  });

  it("returns sorted times", () => {
    const rng = mulberry32(42);
    const times = simulateNPCField(100, 4, rng);
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeGreaterThanOrEqual(times[i - 1]);
    }
  });

  it("all times are positive", () => {
    const rng = mulberry32(99);
    const times = simulateNPCField(200, 8, rng);
    for (const t of times) {
      expect(t).toBeGreaterThan(0);
    }
  });
});

// ── resolveSegment ───────────────────────────────────────────────────

describe("resolveSegment", () => {
  it("advances the segment counter", () => {
    const race = makeRace();
    const stats = makeStats();
    const updated = resolveSegment(race, "steady", stats);
    expect(updated.currentSegment).toBe(1);
  });

  it("records a segment result", () => {
    const race = makeRace();
    const stats = makeStats();
    const updated = resolveSegment(race, "steady", stats);
    expect(updated.segmentResults.length).toBe(1);
    expect(updated.segmentResults[0].segment).toBe(0);
    expect(updated.segmentResults[0].time).toBeGreaterThan(0);
  });

  it("drains energy and adds fatigue", () => {
    const race = makeRace({ energy: 100, fatigue: 0 });
    const stats = makeStats();
    const updated = resolveSegment(race, "steady", stats);
    expect(updated.energy).toBeLessThan(100);
    expect(updated.fatigue).toBeGreaterThan(0);
  });

  it("records pace choice", () => {
    const race = makeRace();
    const stats = makeStats();
    const updated = resolveSegment(race, "aggressive", stats);
    expect(updated.pacePerSegment).toEqual(["aggressive"]);
  });
});

// ── completeRace ─────────────────────────────────────────────────────

describe("completeRace", () => {
  it("returns valid results", () => {
    const race = makeRace({
      raceId: "park_run_5k",
      elapsedTime: 1800,
      position: 10,
      totalRunners: 100,
    });
    const stats = makeStats();
    const result = completeRace(race, stats);

    expect(result.finishTime).toBe(1800);
    expect(result.position).toBe(10);
    expect(result.totalRunners).toBe(100);
    expect(result.xpEarned).toBeGreaterThan(0);
    expect(result.moneyEarned).toBeGreaterThan(0);
  });

  it("detects PR when no previous best exists", () => {
    const race = makeRace({ elapsedTime: 1800 });
    const stats = makeStats();
    const result = completeRace(race, stats, {});
    expect(result.isPR).toBe(true);
  });

  it("detects PR when beating previous best", () => {
    const race = makeRace({ elapsedTime: 1800 });
    const stats = makeStats();
    const result = completeRace(race, stats, { park_run_5k: 2000 });
    expect(result.isPR).toBe(true);
  });

  it("does not flag PR when slower than previous best", () => {
    const race = makeRace({ elapsedTime: 2000 });
    const stats = makeStats();
    const result = completeRace(race, stats, { park_run_5k: 1800 });
    expect(result.isPR).toBe(false);
  });

  it("awards more money for higher placement", () => {
    const stats = makeStats();

    const topRace = makeRace({ position: 5, totalRunners: 100, elapsedTime: 1500 });
    const midRace = makeRace({ position: 60, totalRunners: 100, elapsedTime: 2000 });

    const topResult = completeRace(topRace, stats);
    const midResult = completeRace(midRace, stats);

    expect(topResult.moneyEarned).toBeGreaterThan(midResult.moneyEarned);
  });
});

// ── createDNF ────────────────────────────────────────────────────────

describe("createDNF", () => {
  it("returns partial XP and the reason", () => {
    const race = makeRace({
      currentSegment: 1,
      totalSegments: 3,
      elapsedTime: 600,
    });
    const result = createDNF(race, "Low morale");

    expect(result.reason).toBe("Low morale");
    expect(result.isPR).toBe(false);
    expect(result.moneyEarned).toBe(0);
    expect(result.xpEarned).toBeGreaterThan(0);
    expect(result.xpEarned).toBeLessThan(200); // less than full tier 1 base
    expect(result.position).toBe(race.totalRunners); // last place
  });
});
