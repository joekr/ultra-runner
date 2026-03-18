import { describe, it, expect } from "vitest";
import { mulberry32, hashString, createRaceRng } from "../src/engine/prng";

describe("mulberry32", () => {
  it("produces deterministic sequences from the same seed", () => {
    const rng1 = mulberry32(42);
    const rng2 = mulberry32(42);

    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());

    expect(seq1).toEqual(seq2);
  });

  it("produces values in [0, 1)", () => {
    const rng = mulberry32(12345);
    for (let i = 0; i < 1000; i++) {
      const val = rng();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it("produces different sequences for different seeds", () => {
    const rng1 = mulberry32(1);
    const rng2 = mulberry32(2);

    const seq1 = Array.from({ length: 5 }, () => rng1());
    const seq2 = Array.from({ length: 5 }, () => rng2());

    expect(seq1).not.toEqual(seq2);
  });

  it("has reasonable distribution (not all values in a narrow band)", () => {
    const rng = mulberry32(99999);
    let below = 0;
    let above = 0;
    const n = 10000;
    for (let i = 0; i < n; i++) {
      if (rng() < 0.5) below++;
      else above++;
    }
    // Expect roughly 50/50 split (within 5% tolerance)
    expect(below / n).toBeGreaterThan(0.45);
    expect(below / n).toBeLessThan(0.55);
  });
});

describe("hashString", () => {
  it("produces consistent values for the same string", () => {
    expect(hashString("hello")).toBe(hashString("hello"));
    expect(hashString("race_5k")).toBe(hashString("race_5k"));
  });

  it("produces different values for different strings", () => {
    expect(hashString("hello")).not.toBe(hashString("world"));
    expect(hashString("race_5k")).not.toBe(hashString("race_10k"));
  });

  it("returns a non-negative number", () => {
    const values = ["", "a", "test", "ultra-runner", "🏃"];
    for (const v of values) {
      const h = hashString(v);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(h)).toBe(true);
    }
  });
});

describe("createRaceRng", () => {
  it("produces deterministic output for same raceId and gameDay", () => {
    const rng1 = createRaceRng("5k_local", 10);
    const rng2 = createRaceRng("5k_local", 10);

    const seq1 = Array.from({ length: 5 }, () => rng1());
    const seq2 = Array.from({ length: 5 }, () => rng2());

    expect(seq1).toEqual(seq2);
  });

  it("produces different output for different raceId", () => {
    const rng1 = createRaceRng("5k_local", 10);
    const rng2 = createRaceRng("10k_city", 10);

    const seq1 = Array.from({ length: 5 }, () => rng1());
    const seq2 = Array.from({ length: 5 }, () => rng2());

    expect(seq1).not.toEqual(seq2);
  });

  it("produces different output for different gameDay", () => {
    const rng1 = createRaceRng("5k_local", 10);
    const rng2 = createRaceRng("5k_local", 20);

    const seq1 = Array.from({ length: 5 }, () => rng1());
    const seq2 = Array.from({ length: 5 }, () => rng2());

    expect(seq1).not.toEqual(seq2);
  });
});
