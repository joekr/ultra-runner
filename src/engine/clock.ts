/**
 * Game clock — converts real elapsed time to in-game time.
 *
 * Time compression: 4 game hours per 1 real hour (from balance.json).
 * So 6 real hours = 1 game day (24 game hours).
 */

import balance from "../data/balance.json";

/** How many game hours pass for each real hour. */
export const GAME_HOURS_PER_REAL_HOUR: number =
  balance.timeCompression.gameHoursPerRealHour;

/** Milliseconds per real hour. */
const MS_PER_REAL_HOUR = 3_600_000;

/** Game hours per real millisecond. */
const GAME_HOURS_PER_MS = GAME_HOURS_PER_REAL_HOUR / MS_PER_REAL_HOUR;

/** Hours in one game day. */
const HOURS_PER_DAY = 24;

/** Days in one game week. */
const DAYS_PER_WEEK = 7;

/** Days per season (simplified: 28 days = 4 weeks). */
const DAYS_PER_SEASON = 28;

const SEASONS = ["spring", "summer", "fall", "winter"] as const;
export type Season = (typeof SEASONS)[number];

export class GameClock {
  /** Total accumulated game hours since game start. */
  private gameHours: number;

  constructor(initialGameHours = 0) {
    this.gameHours = initialGameHours;
  }

  /**
   * Advance the clock by real-world elapsed milliseconds.
   * Returns the number of game hours that were added.
   */
  advance(dtMs: number): number {
    const added = dtMs * GAME_HOURS_PER_MS;
    this.gameHours += added;
    return added;
  }

  /** Current game day (0-indexed, starts at day 0). */
  getGameDay(): number {
    return Math.floor(this.gameHours / HOURS_PER_DAY);
  }

  /** Day of the week: 0 = Monday, 6 = Sunday. */
  getWeekDay(): number {
    return this.getGameDay() % DAYS_PER_WEEK;
  }

  /** Current season based on 28-day cycles. */
  getSeason(): Season {
    const seasonIndex =
      Math.floor(this.getGameDay() / DAYS_PER_SEASON) % SEASONS.length;
    return SEASONS[seasonIndex];
  }

  /** Get total accumulated game hours. */
  getGameHours(): number {
    return this.gameHours;
  }

  /** Set accumulated game hours directly (e.g. when loading a save). */
  setGameHours(hours: number): void {
    this.gameHours = hours;
  }
}
