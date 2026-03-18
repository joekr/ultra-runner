// state/migrations.ts — Save schema version migrations

import type { GameState } from "../types";
import { CURRENT_SCHEMA_VERSION } from "../types";

export const CURRENT_VERSION = CURRENT_SCHEMA_VERSION;

export type Migration = (state: any) => any;

/**
 * Migration registry. Keys are the TARGET version.
 * Each function transforms from version N-1 to N.
 *
 * Currently empty for v1 (initial schema). Add migrations here when
 * the schema changes:
 *
 * Example:
 *   2: (state) => ({ ...state, version: 2, settings: { ...state.settings, tapFeedback: true } }),
 */
export const migrations: Record<number, Migration> = {
  // No migrations needed for v1
};

/**
 * Apply migrations sequentially from state.version to CURRENT_VERSION.
 */
export function migrate(state: any): GameState {
  let current = state;
  while (current.version < CURRENT_VERSION) {
    const next = current.version + 1;
    const migration = migrations[next];
    if (!migration) {
      throw new Error(
        `No migration found for version ${current.version} → ${next}`,
      );
    }
    current = migration(current);
  }
  return current as GameState;
}

/**
 * Basic shape validation: ensures the state object has the required
 * top-level fields. Does not deep-validate every nested property.
 */
export function validateState(state: any): boolean {
  if (state == null || typeof state !== "object") return false;
  if (typeof state.version !== "number") return false;
  if (state.version < 1 || state.version > CURRENT_VERSION) return false;

  const requiredFields = [
    "runner",
    "stats",
    "condition",
    "calendar",
    "training",
    "race",
    "inventory",
    "history",
    "flags",
    "settings",
  ];

  for (const field of requiredFields) {
    if (state[field] == null || typeof state[field] !== "object") {
      return false;
    }
  }

  // Validate runner has name
  if (typeof state.runner.name !== "string") return false;

  // Validate stats has expected keys
  const statKeys = [
    "endurance",
    "speed",
    "strength",
    "mentalToughness",
    "recovery",
    "nutritionIQ",
  ];
  for (const key of statKeys) {
    if (
      state.stats[key] == null ||
      typeof state.stats[key].trainingXp !== "number"
    ) {
      return false;
    }
  }

  return true;
}
