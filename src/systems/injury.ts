// systems/injury.ts — Injury system: risk calculation, rolling, recovery, penalties

import type { Injury } from "../types";
import balance from "../data/balance.json";

// ── Types ────────────────────────────────────────────────────────────

export interface InjuryTemplate {
  type: string;
  bodyPart: string;
  severity: "niggle" | "minor";
}

// ── Injury Pools ─────────────────────────────────────────────────────

const NIGGLE_TEMPLATES: InjuryTemplate[] = [
  { type: "sore_knee", bodyPart: "right_knee", severity: "niggle" },
  { type: "tight_hamstring", bodyPart: "left_hamstring", severity: "niggle" },
  { type: "tired_calves", bodyPart: "calves", severity: "niggle" },
  { type: "sore_hip", bodyPart: "left_hip", severity: "niggle" },
  { type: "stiff_ankle", bodyPart: "right_ankle", severity: "niggle" },
];

const MINOR_TEMPLATES: InjuryTemplate[] = [
  { type: "shin_splints", bodyPart: "left_shin", severity: "minor" },
  { type: "mild_strain", bodyPart: "right_quad", severity: "minor" },
  { type: "runner_knee", bodyPart: "right_knee", severity: "minor" },
  { type: "mild_plantar", bodyPart: "left_foot", severity: "minor" },
];

// ── Exports ──────────────────────────────────────────────────────────

export { NIGGLE_TEMPLATES, MINOR_TEMPLATES };

const cfg = balance.injury;

let idCounter = 0;

function generateId(): string {
  idCounter += 1;
  return `inj_${Date.now()}_${idCounter}`;
}

/**
 * Calculate injury risk based on current conditions.
 * Returns a probability in [0, 1].
 */
export function calculateInjuryRisk(
  fatigue: number,
  shoeDurabilityPct: number,
  weeklyMileageIncrease: number,
): number {
  let risk = cfg.baseRisk;

  // Fatigue modifiers
  if (fatigue > cfg.fatigueThreshold) {
    risk += (fatigue - cfg.fatigueThreshold) * 0.003;
  }
  if (fatigue > cfg.fatigueSevereThreshold) {
    risk += (fatigue - cfg.fatigueSevereThreshold) * 0.008;
  }

  // Worn shoes
  if (shoeDurabilityPct < cfg.wornShoeThreshold) {
    risk += 0.03;
  }

  // 10% rule violation
  if (weeklyMileageIncrease > cfg.mileageIncreaseThreshold) {
    risk += (weeklyMileageIncrease - cfg.mileageIncreaseThreshold) * 0.002;
  }

  return Math.min(1, Math.max(0, risk));
}

/**
 * Roll to determine if an injury occurs.
 * Returns an Injury object or null.
 */
export function rollInjury(risk: number, rng: () => number): Injury | null {
  if (rng() >= risk) {
    return null;
  }

  const severity: "niggle" | "minor" =
    rng() < cfg.niggleProbability ? "niggle" : "minor";

  const pool = severity === "niggle" ? NIGGLE_TEMPLATES : MINOR_TEMPLATES;
  const template = pool[Math.floor(rng() * pool.length)];

  const [minDays, maxDays] =
    severity === "niggle" ? cfg.niggleRecoveryDays : cfg.minorRecoveryDays;
  const recoveryDays =
    minDays + Math.floor(rng() * (maxDays - minDays + 1));

  const penalty =
    severity === "niggle" ? cfg.nigglePenalty : cfg.minorPenalty;

  return {
    id: generateId(),
    type: template.type,
    severity,
    recoveryDays,
    daysRemaining: recoveryDays,
    performancePenalty: penalty,
  };
}

/**
 * Advance injury recovery by one day.
 * Rest days provide a 0.5-day bonus (floored, min 0).
 * Returns only injuries that still have days remaining.
 */
export function tickInjuryRecovery(
  injuries: Injury[],
  isRestDay: boolean,
): Injury[] {
  return injuries
    .map((inj) => {
      // Rest days heal 1.5 days, training days heal 1 day
      const healAmount = isRestDay ? 1.5 : 1;
      const remaining = Math.max(0, inj.daysRemaining - healAmount);
      return { ...inj, daysRemaining: remaining };
    })
    .filter((inj) => inj.daysRemaining > 0);
}

/**
 * Sum performance penalties from all active injuries.
 * Capped at 0.5 (50%).
 */
export function getPerformancePenalty(injuries: Injury[]): number {
  const total = injuries.reduce((sum, inj) => sum + inj.performancePenalty, 0);
  return Math.min(0.5, total);
}

/**
 * Determine whether training is safe given current injuries and fatigue.
 */
export function canTrainSafely(
  injuries: Injury[],
  fatigue: number,
): { safe: boolean; warnings: string[] } {
  const warnings: string[] = [];
  let safe = true;

  if (injuries.some((inj) => inj.severity === "minor")) {
    warnings.push("Training with a minor injury risks making it worse");
  }

  if (fatigue > 70) {
    warnings.push("High fatigue increases injury risk");
  }

  if (fatigue > 85) {
    safe = false;
    warnings.push("Dangerously fatigued - rest recommended");
  }

  return { safe, warnings };
}

/**
 * When training on a niggle, there is a 20% chance it escalates to minor.
 * Returns a new minor-severity Injury or null.
 */
export function escalateInjury(
  injury: Injury,
  rng: () => number,
): Injury | null {
  if (injury.severity !== "niggle") {
    return null;
  }

  if (rng() >= 0.2) {
    return null;
  }

  // Pick a random minor template
  const template =
    MINOR_TEMPLATES[Math.floor(rng() * MINOR_TEMPLATES.length)];

  const [minDays, maxDays] = cfg.minorRecoveryDays;
  const recoveryDays =
    minDays + Math.floor(rng() * (maxDays - minDays + 1));

  return {
    id: generateId(),
    type: template.type,
    severity: "minor",
    recoveryDays,
    daysRemaining: recoveryDays,
    performancePenalty: cfg.minorPenalty,
  };
}
