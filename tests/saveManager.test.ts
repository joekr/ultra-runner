import { describe, it, expect, beforeEach, vi } from "vitest";
import { save, load, hasSave, deleteSave, SAVE_KEY } from "../src/engine/saveManager";
import { createNewGame } from "../src/state/gameState";

// Mock localStorage for Node test environment
const storage = new Map<string, string>();

const localStorageMock = {
  getItem: vi.fn((key: string) => storage.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => { storage.set(key, value); }),
  removeItem: vi.fn((key: string) => { storage.delete(key); }),
  clear: vi.fn(() => { storage.clear(); }),
  get length() { return storage.size; },
  key: vi.fn((_index: number) => null),
};

// Install mock before anything uses localStorage
Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("saveManager", () => {
  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
  });

  describe("save and load roundtrip", () => {
    it("should save and load game state correctly", () => {
      const state = createNewGame("TestRunner", "hiker");
      save(state);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        SAVE_KEY,
        expect.any(String),
      );

      const loaded = load();
      expect(loaded).not.toBeNull();
      expect(loaded!.runner.name).toBe("TestRunner");
      expect(loaded!.runner.backstory).toBe("hiker");
      expect(loaded!.stats.strength.trainingXp).toBe(150);
      expect(loaded!.version).toBe(6);
    });

    it("should preserve all top-level state fields", () => {
      const state = createNewGame("Full", "stress_runner");
      save(state);

      const loaded = load()!;
      expect(loaded.inventory.money).toBe(200);
      expect(loaded.flags.unlockedDistances).toEqual(["5k"]);
      expect(loaded.calendar.trainingPlan).toHaveLength(7);
      expect(loaded.condition.energy).toBe(100);
      expect(loaded.injuries).toEqual([]);
      expect(loaded.training.currentWorkout).toBeNull();
      expect(loaded.race.active).toBeNull();
    });
  });

  describe("hasSave", () => {
    it("should return false when no save exists", () => {
      expect(hasSave()).toBe(false);
    });

    it("should return true after saving", () => {
      const state = createNewGame("Test", "couch_to_5k");
      save(state);
      expect(hasSave()).toBe(true);
    });
  });

  describe("deleteSave", () => {
    it("should remove the save", () => {
      const state = createNewGame("Test", "couch_to_5k");
      save(state);
      expect(hasSave()).toBe(true);

      deleteSave();
      expect(hasSave()).toBe(false);
      expect(load()).toBeNull();
    });
  });

  describe("load with invalid data", () => {
    it("should return null for invalid JSON", () => {
      storage.set(SAVE_KEY, "not json at all{{{");
      expect(load()).toBeNull();
    });

    it("should return null for missing required fields", () => {
      storage.set(SAVE_KEY, JSON.stringify({ version: 1 }));
      expect(load()).toBeNull();
    });
  });
});
