/**
 * Seeded pseudo-random number generator (Mulberry32).
 * All game randomness uses this instead of Math.random() for reproducibility.
 */

/**
 * Mulberry32 PRNG. Returns a function that produces deterministic
 * values in [0, 1) from the given numeric seed.
 */
export function mulberry32(seed: number): () => number {
  let s = seed;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Simple string-to-number hash (djb2 variant).
 * Converts an arbitrary string into a 32-bit numeric seed.
 */
export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0; // ensure unsigned 32-bit
}

/**
 * Creates a deterministic RNG for a specific race instance.
 * Combines raceId and gameDay so the same race on the same day
 * always produces the same event sequence.
 */
export function createRaceRng(raceId: string, gameDay: number): () => number {
  const seed = hashString(`${raceId}:${gameDay}`);
  return mulberry32(seed);
}
