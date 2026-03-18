import { describe, it, expect } from "vitest";
import {
  calculateInjuryRisk,
  rollInjury,
  tickInjuryRecovery,
  getPerformancePenalty,
  canTrainSafely,
  escalateInjury,
} from "../src/systems/injury";
import type { Injury } from "../src/types";
import { mulberry32 } from "../src/engine/prng";

// ── Helpers ──────────────────────────────────────────────────────────

function makeInjury(overrides: Partial<Injury> = {}): Injury {
  return {
    id: "test_inj_1",
    type: "sore_knee",
    severity: "niggle",
    recoveryDays: 2,
    daysRemaining: 2,
    performancePenalty: 0.05,
    ...overrides,
  };
}

/** Returns a deterministic rng seeded to a known value */
function seededRng(seed = 42): () => number {
  return mulberry32(seed);
}

/** Returns a function that yields values from the given array in order */
function fixedRng(values: number[]): () => number {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i++;
    return v;
  };
}

// ── calculateInjuryRisk ─────────────────────────────────────────────

describe("calculateInjuryRisk", () => {
  it("returns base risk under normal conditions", () => {
    const risk = calculateInjuryRisk(50, 0.8, 5);
    expect(risk).toBeCloseTo(0.01, 5);
  });

  it("increases risk with fatigue above 70", () => {
    const risk = calculateInjuryRisk(80, 0.8, 5);
    // base 0.01 + (80-70)*0.003 = 0.01 + 0.03 = 0.04
    expect(risk).toBeCloseTo(0.04, 5);
  });

  it("adds extra risk with fatigue above 85", () => {
    const risk = calculateInjuryRisk(90, 0.8, 5);
    // base 0.01 + (90-70)*0.003 + (90-85)*0.008 = 0.01 + 0.06 + 0.04 = 0.11
    expect(risk).toBeCloseTo(0.11, 5);
  });

  it("adds risk for worn shoes below 20% durability", () => {
    const risk = calculateInjuryRisk(50, 0.15, 5);
    // base 0.01 + 0.03 = 0.04
    expect(risk).toBeCloseTo(0.04, 5);
  });

  it("adds risk for mileage increase over 10%", () => {
    const risk = calculateInjuryRisk(50, 0.8, 20);
    // base 0.01 + (20-10)*0.002 = 0.01 + 0.02 = 0.03
    expect(risk).toBeCloseTo(0.03, 5);
  });

  it("combines all risk factors", () => {
    const risk = calculateInjuryRisk(90, 0.1, 25);
    // base 0.01 + (90-70)*0.003 + (90-85)*0.008 + 0.03 + (25-10)*0.002
    // = 0.01 + 0.06 + 0.04 + 0.03 + 0.03 = 0.17
    expect(risk).toBeCloseTo(0.17, 5);
  });

  it("clamps risk to [0, 1]", () => {
    const risk = calculateInjuryRisk(100, 0.0, 500);
    expect(risk).toBeLessThanOrEqual(1);
    expect(risk).toBeGreaterThanOrEqual(0);
  });
});

// ── rollInjury ──────────────────────────────────────────────────────

describe("rollInjury", () => {
  it("returns null when rng roll exceeds risk", () => {
    // rng returns 0.5, risk is 0.1 → no injury
    const rng = fixedRng([0.5]);
    expect(rollInjury(0.1, rng)).toBeNull();
  });

  it("returns an Injury when rng roll is below risk", () => {
    // First roll: 0.01 < 0.5 → injury happens
    // Second roll: 0.3 < 0.7 → niggle
    // Third roll: 0.0 → picks first niggle template
    // Fourth roll: 0.0 → min recovery days
    const rng = fixedRng([0.01, 0.3, 0.0, 0.0]);
    const injury = rollInjury(0.5, rng);
    expect(injury).not.toBeNull();
    expect(injury!.severity).toBe("niggle");
    expect(injury!.performancePenalty).toBe(0.05);
  });

  it("generates minor injuries when second roll >= 0.7", () => {
    // First roll: 0.01 < 0.5 → injury
    // Second roll: 0.8 >= 0.7 → minor
    // Third roll: 0.0 → first minor template
    // Fourth roll: 0.0 → min recovery days (3)
    const rng = fixedRng([0.01, 0.8, 0.0, 0.0]);
    const injury = rollInjury(0.5, rng);
    expect(injury).not.toBeNull();
    expect(injury!.severity).toBe("minor");
    expect(injury!.performancePenalty).toBe(0.15);
    expect(injury!.recoveryDays).toBeGreaterThanOrEqual(3);
    expect(injury!.recoveryDays).toBeLessThanOrEqual(7);
  });

  it("produces 70/30 niggle/minor split over many rolls", () => {
    const rng = seededRng(123);
    let niggles = 0;
    let minors = 0;
    const trials = 5000;

    for (let i = 0; i < trials; i++) {
      // Always trigger injury (risk=1.0)
      const injury = rollInjury(1.0, rng);
      if (injury) {
        if (injury.severity === "niggle") niggles++;
        else minors++;
      }
    }

    const total = niggles + minors;
    const nigglePct = niggles / total;
    // Should be close to 0.7 ± tolerance
    expect(nigglePct).toBeGreaterThan(0.6);
    expect(nigglePct).toBeLessThan(0.8);
  });

  it("sets daysRemaining equal to recoveryDays", () => {
    const rng = fixedRng([0.01, 0.3, 0.0, 0.5]);
    const injury = rollInjury(0.5, rng);
    expect(injury).not.toBeNull();
    expect(injury!.daysRemaining).toBe(injury!.recoveryDays);
  });
});

// ── tickInjuryRecovery ──────────────────────────────────────────────

describe("tickInjuryRecovery", () => {
  it("reduces daysRemaining by 1 on a training day", () => {
    const injuries = [makeInjury({ daysRemaining: 5 })];
    const result = tickInjuryRecovery(injuries, false);
    expect(result).toHaveLength(1);
    expect(result[0].daysRemaining).toBe(4);
  });

  it("reduces by additional 0.5 (floored) on rest day", () => {
    const injuries = [makeInjury({ daysRemaining: 5 })];
    const result = tickInjuryRecovery(injuries, true);
    // 5 - 1 = 4, then 4 - 0.5 = 3.5, floor → 3
    expect(result).toHaveLength(1);
    expect(result[0].daysRemaining).toBe(3);
  });

  it("removes injuries where daysRemaining reaches 0", () => {
    const injuries = [makeInjury({ daysRemaining: 1 })];
    const result = tickInjuryRecovery(injuries, false);
    // 1 - 1 = 0 → filtered out
    expect(result).toHaveLength(0);
  });

  it("rest day bonus does not go below 0", () => {
    const injuries = [makeInjury({ daysRemaining: 1 })];
    const result = tickInjuryRecovery(injuries, true);
    // 1 - 1 = 0, then max(0, floor(0 - 0.5)) = 0 → filtered out
    expect(result).toHaveLength(0);
  });

  it("handles multiple injuries independently", () => {
    const injuries = [
      makeInjury({ id: "a", daysRemaining: 3 }),
      makeInjury({ id: "b", daysRemaining: 1 }),
      makeInjury({ id: "c", daysRemaining: 5 }),
    ];
    const result = tickInjuryRecovery(injuries, false);
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.id)).toEqual(["a", "c"]);
    expect(result[0].daysRemaining).toBe(2);
    expect(result[1].daysRemaining).toBe(4);
  });
});

// ── getPerformancePenalty ────────────────────────────────────────────

describe("getPerformancePenalty", () => {
  it("returns 0 with no injuries", () => {
    expect(getPerformancePenalty([])).toBe(0);
  });

  it("sums penalties from multiple injuries", () => {
    const injuries = [
      makeInjury({ performancePenalty: 0.05 }),
      makeInjury({ performancePenalty: 0.15 }),
    ];
    expect(getPerformancePenalty(injuries)).toBeCloseTo(0.2, 5);
  });

  it("caps at 0.5", () => {
    const injuries = [
      makeInjury({ performancePenalty: 0.15 }),
      makeInjury({ performancePenalty: 0.15 }),
      makeInjury({ performancePenalty: 0.15 }),
      makeInjury({ performancePenalty: 0.15 }),
    ];
    expect(getPerformancePenalty(injuries)).toBe(0.5);
  });
});

// ── canTrainSafely ──────────────────────────────────────────────────

describe("canTrainSafely", () => {
  it("returns safe with no injuries and low fatigue", () => {
    const result = canTrainSafely([], 50);
    expect(result.safe).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it("warns about minor injuries", () => {
    const injuries = [makeInjury({ severity: "minor" })];
    const result = canTrainSafely(injuries, 50);
    expect(result.safe).toBe(true);
    expect(result.warnings).toContain(
      "Training with a minor injury risks making it worse",
    );
  });

  it("warns about high fatigue > 70", () => {
    const result = canTrainSafely([], 75);
    expect(result.safe).toBe(true);
    expect(result.warnings).toContain("High fatigue increases injury risk");
  });

  it("marks unsafe and warns when fatigue > 85", () => {
    const result = canTrainSafely([], 90);
    expect(result.safe).toBe(false);
    expect(result.warnings).toContain(
      "Dangerously fatigued - rest recommended",
    );
  });

  it("includes both fatigue warnings when fatigue > 85", () => {
    const result = canTrainSafely([], 90);
    expect(result.warnings).toHaveLength(2);
    expect(result.warnings).toContain("High fatigue increases injury risk");
    expect(result.warnings).toContain(
      "Dangerously fatigued - rest recommended",
    );
  });
});

// ── escalateInjury ──────────────────────────────────────────────────

describe("escalateInjury", () => {
  it("returns null for non-niggle injuries", () => {
    const minor = makeInjury({ severity: "minor" });
    const rng = fixedRng([0.0]);
    expect(escalateInjury(minor, rng)).toBeNull();
  });

  it("returns null when rng >= 0.2 (no escalation)", () => {
    const niggle = makeInjury({ severity: "niggle" });
    const rng = fixedRng([0.5, 0.0, 0.0]);
    expect(escalateInjury(niggle, rng)).toBeNull();
  });

  it("escalates niggle to minor when rng < 0.2", () => {
    const niggle = makeInjury({ severity: "niggle" });
    // First roll: 0.1 < 0.2 → escalate
    // Second roll: 0.0 → pick first minor template
    // Third roll: 0.0 → min recovery days (3)
    const rng = fixedRng([0.1, 0.0, 0.0]);
    const result = escalateInjury(niggle, rng);
    expect(result).not.toBeNull();
    expect(result!.severity).toBe("minor");
    expect(result!.performancePenalty).toBe(0.15);
    expect(result!.recoveryDays).toBeGreaterThanOrEqual(3);
    expect(result!.recoveryDays).toBeLessThanOrEqual(7);
  });

  it("produces ~20% escalation rate over many rolls", () => {
    const rng = seededRng(999);
    let escalated = 0;
    const trials = 2000;

    for (let i = 0; i < trials; i++) {
      const niggle = makeInjury({ severity: "niggle" });
      if (escalateInjury(niggle, rng) !== null) escalated++;
    }

    const rate = escalated / trials;
    expect(rate).toBeGreaterThan(0.12);
    expect(rate).toBeLessThan(0.28);
  });
});
