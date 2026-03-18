/**
 * Dual-loop game engine with fixed-timestep logic at 10 Hz.
 *
 * Uses requestAnimationFrame for scheduling, with an accumulator
 * pattern and a spiral-of-death clamp at 500 ms.
 */

const LOGIC_HZ = 10;
const LOGIC_DT = 1000 / LOGIC_HZ; // 100ms per tick
const MAX_FRAME_TIME = 500; // spiral-of-death clamp

let lastTime = 0;
let accumulator = 0;
let running = false;
let rafId: number | null = null;

/**
 * Start the game loop. Calls `onLogicTick(dt)` at a fixed 10 Hz rate,
 * where dt is always LOGIC_DT (100ms).
 */
export function startLoop(onLogicTick: (dt: number) => void): void {
  if (running) return;
  running = true;
  accumulator = 0;
  lastTime = performance.now();

  function frame(now: number): void {
    if (!running) return;

    const elapsed = Math.min(now - lastTime, MAX_FRAME_TIME);
    lastTime = now;
    accumulator += elapsed;

    while (accumulator >= LOGIC_DT) {
      onLogicTick(LOGIC_DT);
      accumulator -= LOGIC_DT;
    }

    rafId = requestAnimationFrame(frame);
  }

  rafId = requestAnimationFrame(frame);
}

/** Stop the game loop. */
export function stopLoop(): void {
  running = false;
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

/** Returns whether the loop is currently running. */
export function isRunning(): boolean {
  return running;
}

/** Exposed for testing: the fixed timestep in ms. */
export const TICK_MS = LOGIC_DT;
