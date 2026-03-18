import { describe, it, expect } from "vitest";
import { GameClock, GAME_HOURS_PER_REAL_HOUR } from "../src/engine/clock";

describe("GameClock", () => {
  describe("time compression", () => {
    it("has the correct compression ratio from balance.json", () => {
      expect(GAME_HOURS_PER_REAL_HOUR).toBe(4);
    });

    it("converts real ms to game hours correctly", () => {
      const clock = new GameClock();
      // 1 real hour (3,600,000 ms) = 4 game hours
      clock.advance(3_600_000);
      expect(clock.getGameHours()).toBeCloseTo(4, 5);
    });

    it("6 real hours = 1 game day (24 game hours)", () => {
      const clock = new GameClock();
      const sixRealHours = 6 * 3_600_000;
      clock.advance(sixRealHours);
      expect(clock.getGameHours()).toBeCloseTo(24, 5);
      expect(clock.getGameDay()).toBe(1);
    });

    it("accumulates time across multiple advances", () => {
      const clock = new GameClock();
      // Advance 3 real hours in increments
      for (let i = 0; i < 3; i++) {
        clock.advance(3_600_000);
      }
      expect(clock.getGameHours()).toBeCloseTo(12, 5);
    });
  });

  describe("getGameDay", () => {
    it("starts at day 0", () => {
      const clock = new GameClock();
      expect(clock.getGameDay()).toBe(0);
    });

    it("increments after 24 game hours", () => {
      const clock = new GameClock();
      // 24 game hours = 6 real hours
      clock.advance(6 * 3_600_000);
      expect(clock.getGameDay()).toBe(1);
    });

    it("correctly calculates multi-day advancement", () => {
      const clock = new GameClock();
      // 7 game days = 42 real hours
      clock.advance(42 * 3_600_000);
      expect(clock.getGameDay()).toBe(7);
    });
  });

  describe("getWeekDay", () => {
    it("starts at 0 (Monday)", () => {
      const clock = new GameClock();
      expect(clock.getWeekDay()).toBe(0);
    });

    it("cycles through 0-6", () => {
      const clock = new GameClock();
      const sixRealHoursMs = 6 * 3_600_000;

      const days: number[] = [];
      for (let i = 0; i < 10; i++) {
        days.push(clock.getWeekDay());
        clock.advance(sixRealHoursMs);
      }

      expect(days).toEqual([0, 1, 2, 3, 4, 5, 6, 0, 1, 2]);
    });
  });

  describe("getSeason", () => {
    it("starts in spring", () => {
      const clock = new GameClock();
      expect(clock.getSeason()).toBe("spring");
    });

    it("transitions to summer after 28 game days", () => {
      const clock = new GameClock();
      // 28 game days = 28 * 6 real hours = 168 real hours
      clock.advance(168 * 3_600_000);
      expect(clock.getSeason()).toBe("summer");
    });

    it("cycles through all four seasons", () => {
      const clock = new GameClock();
      const oneDayMs = 6 * 3_600_000;

      expect(clock.getSeason()).toBe("spring");

      clock.advance(28 * oneDayMs);
      expect(clock.getSeason()).toBe("summer");

      clock.advance(28 * oneDayMs);
      expect(clock.getSeason()).toBe("fall");

      clock.advance(28 * oneDayMs);
      expect(clock.getSeason()).toBe("winter");

      clock.advance(28 * oneDayMs);
      expect(clock.getSeason()).toBe("spring"); // wraps around
    });
  });

  describe("setGameHours / getGameHours", () => {
    it("can set and get game hours directly", () => {
      const clock = new GameClock();
      clock.setGameHours(48);
      expect(clock.getGameHours()).toBe(48);
      expect(clock.getGameDay()).toBe(2);
    });

    it("constructor accepts initial game hours", () => {
      const clock = new GameClock(72);
      expect(clock.getGameHours()).toBe(72);
      expect(clock.getGameDay()).toBe(3);
    });
  });

  describe("advance return value", () => {
    it("returns the number of game hours added", () => {
      const clock = new GameClock();
      const added = clock.advance(3_600_000); // 1 real hour
      expect(added).toBeCloseTo(4, 5);
    });
  });
});
