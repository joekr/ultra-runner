import { describe, it, expect } from "vitest";
import { migrate, validateState, CURRENT_VERSION } from "../src/state/migrations";
import { createNewGame } from "../src/state/gameState";

describe("migrate", () => {
  it("should pass through state already at current version", () => {
    const state = createNewGame("Test", "couch_to_5k");
    const migrated = migrate(state);

    expect(migrated.version).toBe(CURRENT_VERSION);
    expect(migrated.runner.name).toBe("Test");
    expect(migrated.stats.endurance.trainingXp).toBe(0);
  });

  it("should throw for unknown version needing migration", () => {
    const state = { version: 0 };
    expect(() => migrate(state)).toThrow("No migration found");
  });

  it("should not modify state at current version", () => {
    const state = createNewGame("Unchanged", "hiker");
    const original = JSON.stringify(state);
    const migrated = migrate(state);

    // The migrated state should be equivalent (version hasn't changed)
    expect(migrated.version).toBe(state.version);
    expect(JSON.stringify(migrated)).toBe(original);
  });
});

describe("validateState", () => {
  it("should accept valid game state", () => {
    const state = createNewGame("Valid", "couch_to_5k");
    expect(validateState(state)).toBe(true);
  });

  it("should reject null", () => {
    expect(validateState(null)).toBe(false);
  });

  it("should reject non-objects", () => {
    expect(validateState("string")).toBe(false);
    expect(validateState(42)).toBe(false);
    expect(validateState(undefined)).toBe(false);
  });

  it("should reject object without version", () => {
    expect(validateState({})).toBe(false);
  });

  it("should reject version out of range", () => {
    expect(validateState({ version: 0 })).toBe(false);
    expect(validateState({ version: 999 })).toBe(false);
  });

  it("should reject missing top-level fields", () => {
    expect(validateState({ version: 1 })).toBe(false);
    expect(validateState({ version: 1, runner: { name: "X" } })).toBe(false);
  });

  it("should reject state with missing stat keys", () => {
    const state = createNewGame("Test", "couch_to_5k");
    const broken = {
      ...state,
      stats: { endurance: { trainingXp: 0 } }, // missing other stats
    };
    expect(validateState(broken)).toBe(false);
  });

  it("should reject state with non-string runner name", () => {
    const state = createNewGame("Test", "couch_to_5k") as any;
    state.runner.name = 42;
    expect(validateState(state)).toBe(false);
  });

  it("should accept all backstory variants", () => {
    for (const backstory of ["couch_to_5k", "former_athlete", "hiker", "stress_runner"] as const) {
      const state = createNewGame("Test", backstory);
      expect(validateState(state)).toBe(true);
    }
  });
});
