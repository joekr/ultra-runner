import { describe, it, expect, beforeEach } from "vitest";
import {
  scoreCadence,
  TapBuffer,
  computeStatGains,
  computeFatigue,
  calculateWeeklyMileageIncrease,
  isOverMileageThreshold,
  getDefaultTrainingPlan,
  getWorkoutForDay,
  createActiveWorkout,
  updateActiveWorkout,
  isWorkoutComplete,
  completeWorkout,
  type CadenceResult,
} from "../src/systems/training";

// ── scoreCadence ─────────────────────────────────────────────────────

describe("scoreCadence", () => {
  it("returns easy with 0 multiplier for rest workouts", () => {
    const result = scoreCadence(3.0, "rest");
    expect(result.quality).toBe("easy");
    expect(result.multiplier).toBe(0);
    expect(result.injuryRisk).toBe(0);
  });

  it("returns undertrained below min zone", () => {
    // easy_run min = 1.5
    const result = scoreCadence(1.0, "easy_run");
    expect(result.quality).toBe("undertrained");
    expect(result.multiplier).toBe(0.3);
    expect(result.injuryRisk).toBe(0.0);
  });

  it("returns easy between min and sweet[0]", () => {
    // easy_run min=1.5, sweet=[2.0, 2.8]
    const result = scoreCadence(1.7, "easy_run");
    expect(result.quality).toBe("easy");
    expect(result.multiplier).toBe(0.6);
    expect(result.injuryRisk).toBe(0.01);
  });

  it("returns sweet_spot within sweet zone", () => {
    // easy_run sweet=[2.0, 2.8]
    const result = scoreCadence(2.5, "easy_run");
    expect(result.quality).toBe("sweet_spot");
    expect(result.multiplier).toBe(1.0);
    expect(result.injuryRisk).toBe(0.02);
  });

  it("returns sweet_spot at exact sweet[0] boundary", () => {
    const result = scoreCadence(2.0, "easy_run");
    expect(result.quality).toBe("sweet_spot");
  });

  it("returns sweet_spot at exact sweet[1] boundary", () => {
    const result = scoreCadence(2.8, "easy_run");
    expect(result.quality).toBe("sweet_spot");
  });

  it("returns hard between sweet[1] and max", () => {
    // easy_run sweet[1]=2.8, max=4.0
    const result = scoreCadence(3.5, "easy_run");
    expect(result.quality).toBe("hard");
    expect(result.multiplier).toBe(0.7);
    expect(result.injuryRisk).toBe(0.08);
  });

  it("returns hard at exact max boundary", () => {
    const result = scoreCadence(4.0, "easy_run");
    expect(result.quality).toBe("hard");
  });

  it("returns overtrained above max", () => {
    // easy_run max=4.0
    const result = scoreCadence(5.0, "easy_run");
    expect(result.quality).toBe("overtrained");
    expect(result.multiplier).toBe(0.4);
    expect(result.injuryRisk).toBe(0.15);
  });

  it("works correctly with intervals cadence zones", () => {
    // intervals: min=2.5, sweet=[3.5, 4.5], max=6.0
    expect(scoreCadence(2.0, "intervals").quality).toBe("undertrained");
    expect(scoreCadence(3.0, "intervals").quality).toBe("easy");
    expect(scoreCadence(4.0, "intervals").quality).toBe("sweet_spot");
    expect(scoreCadence(5.5, "intervals").quality).toBe("hard");
    expect(scoreCadence(7.0, "intervals").quality).toBe("overtrained");
  });
});

// ── TapBuffer ────────────────────────────────────────────────────────

describe("TapBuffer", () => {
  let buffer: TapBuffer;

  beforeEach(() => {
    buffer = new TapBuffer();
  });

  it("starts empty with 0 taps", () => {
    expect(buffer.consumeTaps(1000)).toBe(0);
  });

  it("records and counts taps within window", () => {
    buffer.recordTap(1000);
    buffer.recordTap(1200);
    buffer.recordTap(1400);
    expect(buffer.consumeTaps(1000)).toBe(3);
  });

  it("expires stale taps outside window", () => {
    buffer.recordTap(100);
    buffer.recordTap(200);
    buffer.recordTap(1500);
    buffer.recordTap(1800);
    // Window of 1000ms from latest (1800): cutoff = 800
    // Only taps > 800 remain: 1500, 1800
    expect(buffer.consumeTaps(1000)).toBe(2);
  });

  it("calculates taps per second correctly", () => {
    buffer.recordTap(1100);
    buffer.recordTap(1250);
    buffer.recordTap(1500);
    buffer.recordTap(1750);
    buffer.recordTap(2000);
    // 5 taps within 1000ms window from latest (2000): cutoff=1000, all > 1000
    expect(buffer.getTapsPerSecond(1000)).toBe(5);
  });

  it("resets to empty", () => {
    buffer.recordTap(100);
    buffer.recordTap(200);
    buffer.reset();
    expect(buffer.consumeTaps(1000)).toBe(0);
  });
});

// ── computeStatGains ─────────────────────────────────────────────────

describe("computeStatGains", () => {
  it("distributes XP according to workout ratios for easy_run", () => {
    const cadence: CadenceResult = {
      quality: "sweet_spot",
      multiplier: 1.0,
      injuryRisk: 0.02,
    };
    const gains = computeStatGains("easy_run", cadence, 0, 100);
    // baseXpPerTick=1.0, dt=100 → base=1.0, multiplier=1.0, fatigue=0 → penalty=1.0
    // endurance: 1.0 * 0.6 = 0.6, recovery: 1.0 * 0.3 = 0.3, speed: 1.0 * 0.1 = 0.1
    expect(gains.endurance).toBeCloseTo(0.6);
    expect(gains.recovery).toBeCloseTo(0.3);
    expect(gains.speed).toBeCloseTo(0.1);
  });

  it("applies cadence multiplier", () => {
    const sweet: CadenceResult = { quality: "sweet_spot", multiplier: 1.0, injuryRisk: 0.02 };
    const under: CadenceResult = { quality: "undertrained", multiplier: 0.3, injuryRisk: 0.0 };
    const sweetGains = computeStatGains("easy_run", sweet, 0, 100);
    const underGains = computeStatGains("easy_run", under, 0, 100);
    expect(underGains.endurance).toBeCloseTo(sweetGains.endurance! * 0.3);
  });

  it("reduces gains with high fatigue", () => {
    const cadence: CadenceResult = { quality: "sweet_spot", multiplier: 1.0, injuryRisk: 0.02 };
    const fresh = computeStatGains("easy_run", cadence, 0, 100);
    const tired = computeStatGains("easy_run", cadence, 75, 100);
    // fatigue=0: penalty = max(0.2, 1-0/150) = 1.0
    // fatigue=75: penalty = max(0.2, 1-75/150) = 0.5
    expect(tired.endurance).toBeCloseTo(fresh.endurance! * 0.5);
  });

  it("clamps fatigue penalty to minimum 0.2", () => {
    const cadence: CadenceResult = { quality: "sweet_spot", multiplier: 1.0, injuryRisk: 0.02 };
    const exhausted = computeStatGains("easy_run", cadence, 150, 100);
    const fresh = computeStatGains("easy_run", cadence, 0, 100);
    // fatigue=150: penalty = max(0.2, 1-150/150) = max(0.2, 0) = 0.2
    expect(exhausted.endurance).toBeCloseTo(fresh.endurance! * 0.2);
  });

  it("scales with dtMs", () => {
    const cadence: CadenceResult = { quality: "sweet_spot", multiplier: 1.0, injuryRisk: 0.02 };
    const gains100 = computeStatGains("easy_run", cadence, 0, 100);
    const gains200 = computeStatGains("easy_run", cadence, 0, 200);
    expect(gains200.endurance).toBeCloseTo(gains100.endurance! * 2);
  });
});

// ── computeFatigue ───────────────────────────────────────────────────

describe("computeFatigue", () => {
  it("increases fatigue based on workout type", () => {
    const cadence: CadenceResult = { quality: "sweet_spot", multiplier: 1.0, injuryRisk: 0.02 };
    const result = computeFatigue("easy_run", cadence, 0, 0, 100);
    // baseFatiguePerTick=0.15, dt=100 → 0.15, no quality mod, recovery=0 → mod=1.0
    expect(result).toBeCloseTo(0.15);
  });

  it("applies hard quality multiplier of 1.5x", () => {
    const hard: CadenceResult = { quality: "hard", multiplier: 0.7, injuryRisk: 0.08 };
    const result = computeFatigue("easy_run", hard, 0, 0, 100);
    expect(result).toBeCloseTo(0.15 * 1.5);
  });

  it("applies overtrained quality multiplier of 2.5x", () => {
    const over: CadenceResult = { quality: "overtrained", multiplier: 0.4, injuryRisk: 0.15 };
    const result = computeFatigue("easy_run", over, 0, 0, 100);
    expect(result).toBeCloseTo(0.15 * 2.5);
  });

  it("reduces fatigue gain with high recovery stat", () => {
    const cadence: CadenceResult = { quality: "sweet_spot", multiplier: 1.0, injuryRisk: 0.02 };
    const noRecovery = computeFatigue("easy_run", cadence, 0, 0, 100);
    const highRecovery = computeFatigue("easy_run", cadence, 0, 100, 100);
    // recovery=100: mod = max(0.5, 1-100/200) = 0.5
    expect(highRecovery).toBeCloseTo(noRecovery * 0.5);
  });

  it("clamps fatigue to 100", () => {
    const cadence: CadenceResult = { quality: "overtrained", multiplier: 0.4, injuryRisk: 0.15 };
    const result = computeFatigue("intervals", cadence, 99, 0, 10000);
    expect(result).toBe(100);
  });

  it("clamps fatigue to 0 minimum", () => {
    const cadence: CadenceResult = { quality: "sweet_spot", multiplier: 1.0, injuryRisk: 0.02 };
    // rest has baseFatiguePerTick=0, so fatigue stays at 0
    const result = computeFatigue("rest", cadence, 0, 0, 100);
    expect(result).toBe(0);
  });
});

// ── Weekly calendar logic ────────────────────────────────────────────

describe("weekly calendar logic", () => {
  it("getDefaultTrainingPlan returns 7-day plan", () => {
    const plan = getDefaultTrainingPlan();
    expect(plan).toHaveLength(7);
    expect(plan[0].workout).toBe("easy_run");
    expect(plan[1].workout).toBe("intervals");
    expect(plan[3].workout).toBe("rest");
    expect(plan[5].workout).toBe("long_run");
    expect(plan[6].workout).toBe("rest");
  });

  it("getWorkoutForDay returns correct day", () => {
    const plan = getDefaultTrainingPlan();
    expect(getWorkoutForDay(plan, 0).workout).toBe("easy_run");
    expect(getWorkoutForDay(plan, 5).workout).toBe("long_run");
  });

  it("calculateWeeklyMileageIncrease computes percentage", () => {
    expect(calculateWeeklyMileageIncrease(22, 20)).toBeCloseTo(10);
    expect(calculateWeeklyMileageIncrease(20, 20)).toBeCloseTo(0);
  });

  it("calculateWeeklyMileageIncrease handles zero previous", () => {
    expect(calculateWeeklyMileageIncrease(10, 0)).toBe(100);
    expect(calculateWeeklyMileageIncrease(0, 0)).toBe(0);
  });

  describe("isOverMileageThreshold", () => {
    it("returns false at 9%", () => {
      expect(isOverMileageThreshold(9)).toBe(false);
    });

    it("returns false at exactly 10%", () => {
      expect(isOverMileageThreshold(10)).toBe(false);
    });

    it("returns true at 11%", () => {
      expect(isOverMileageThreshold(11)).toBe(true);
    });
  });
});

// ── Workout lifecycle ────────────────────────────────────────────────

describe("workout lifecycle", () => {
  it("createActiveWorkout initializes with correct duration", () => {
    const workout = createActiveWorkout("easy_run");
    expect(workout.workoutType).toBe("easy_run");
    expect(workout.duration).toBe(25000);
    expect(workout.elapsed).toBe(0);
    expect(workout.taps).toBe(0);
    expect(workout.effortMeter).toBe(0);
    expect(workout.sweetSpotHits).toBe(0);
    expect(workout.sweetSpotMisses).toBe(0);
    expect(workout.statGainsAccumulated).toEqual({});
  });

  it("createActiveWorkout uses correct duration for long_run", () => {
    const workout = createActiveWorkout("long_run");
    expect(workout.duration).toBe(45000);
  });

  it("createActiveWorkout uses correct duration for intervals", () => {
    const workout = createActiveWorkout("intervals");
    expect(workout.duration).toBe(20000);
  });

  it("updateActiveWorkout advances elapsed and accumulates gains", () => {
    const workout = createActiveWorkout("easy_run");
    const cadence: CadenceResult = { quality: "sweet_spot", multiplier: 1.0, injuryRisk: 0.02 };
    const gains = { endurance: 0.6, recovery: 0.3, speed: 0.1 };
    const updated = updateActiveWorkout(workout, 100, cadence, gains);
    expect(updated.elapsed).toBe(100);
    expect(updated.sweetSpotHits).toBe(1);
    expect(updated.sweetSpotMisses).toBe(0);
    expect(updated.statGainsAccumulated.endurance).toBeCloseTo(0.6);
    expect(updated.statGainsAccumulated.recovery).toBeCloseTo(0.3);
  });

  it("updateActiveWorkout tracks misses for non-sweet-spot cadence", () => {
    const workout = createActiveWorkout("easy_run");
    const cadence: CadenceResult = { quality: "hard", multiplier: 0.7, injuryRisk: 0.08 };
    const updated = updateActiveWorkout(workout, 100, cadence, {});
    expect(updated.sweetSpotHits).toBe(0);
    expect(updated.sweetSpotMisses).toBe(1);
  });

  it("isWorkoutComplete returns false before duration", () => {
    const workout = createActiveWorkout("easy_run");
    expect(isWorkoutComplete(workout)).toBe(false);
  });

  it("isWorkoutComplete returns true at duration", () => {
    const workout = createActiveWorkout("easy_run");
    const done = { ...workout, elapsed: 25000 };
    expect(isWorkoutComplete(done)).toBe(true);
  });

  it("isWorkoutComplete returns true past duration", () => {
    const workout = createActiveWorkout("easy_run");
    const done = { ...workout, elapsed: 30000 };
    expect(isWorkoutComplete(done)).toBe(true);
  });

  it("completeWorkout returns accumulated gains and proportional miles", () => {
    const workout = createActiveWorkout("easy_run");
    const withGains = {
      ...workout,
      elapsed: 25000,
      statGainsAccumulated: { endurance: 10, recovery: 5, speed: 2 },
    };
    const result = completeWorkout(withGains);
    expect(result.totalStatGains.endurance).toBe(10);
    expect(result.totalStatGains.recovery).toBe(5);
    expect(result.totalStatGains.speed).toBe(2);
    expect(result.totalMiles).toBe(4); // baseMiles for easy_run, 100% completion
  });

  it("completeWorkout returns partial miles for incomplete workout", () => {
    const workout = createActiveWorkout("easy_run");
    const half = {
      ...workout,
      elapsed: 12500, // half of 25000
      statGainsAccumulated: {},
    };
    const result = completeWorkout(half);
    expect(result.totalMiles).toBeCloseTo(2); // half of 4 base miles
  });
});
