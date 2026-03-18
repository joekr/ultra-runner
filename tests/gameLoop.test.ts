import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { startLoop, stopLoop, isRunning, TICK_MS } from "../src/engine/gameLoop";

describe("gameLoop", () => {
  let rafCallbacks: Array<(time: number) => void>;
  let rafIdCounter: number;
  let originalRaf: typeof globalThis.requestAnimationFrame;
  let originalCaf: typeof globalThis.cancelAnimationFrame;
  let originalPerformanceNow: typeof performance.now;

  beforeEach(() => {
    rafCallbacks = [];
    rafIdCounter = 0;

    originalRaf = globalThis.requestAnimationFrame;
    originalCaf = globalThis.cancelAnimationFrame;
    originalPerformanceNow = performance.now;

    // Mock requestAnimationFrame to capture callbacks
    globalThis.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
      rafCallbacks.push(cb as (time: number) => void);
      return ++rafIdCounter;
    }) as unknown as typeof globalThis.requestAnimationFrame;

    globalThis.cancelAnimationFrame = vi.fn();

    // We need to stop any running loop from previous tests
    stopLoop();
  });

  afterEach(() => {
    stopLoop();
    globalThis.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = originalCaf;
    performance.now = originalPerformanceNow;
  });

  it("isRunning returns false initially", () => {
    expect(isRunning()).toBe(false);
  });

  it("isRunning returns true after startLoop", () => {
    const tick = vi.fn();
    startLoop(tick);
    expect(isRunning()).toBe(true);
  });

  it("isRunning returns false after stopLoop", () => {
    const tick = vi.fn();
    startLoop(tick);
    stopLoop();
    expect(isRunning()).toBe(false);
  });

  it("does not double-start if startLoop is called twice", () => {
    const tick = vi.fn();
    startLoop(tick);
    startLoop(tick);
    // Only one rAF should have been requested
    expect(rafCallbacks.length).toBe(1);
  });

  it("fires logic ticks at the correct rate", () => {
    let mockTime = 1000;
    performance.now = vi.fn(() => mockTime);

    const tick = vi.fn();
    startLoop(tick);

    // First rAF callback — simulate 250ms elapsed (should get 2 ticks at 100ms each)
    const firstCb = rafCallbacks[rafCallbacks.length - 1];
    mockTime = 1250;
    firstCb(mockTime);

    expect(tick).toHaveBeenCalledTimes(2);
    expect(tick).toHaveBeenCalledWith(TICK_MS);
  });

  it("clamps frame time to 500ms to prevent spiral of death", () => {
    let mockTime = 1000;
    performance.now = vi.fn(() => mockTime);

    const tick = vi.fn();
    startLoop(tick);

    // Simulate 2000ms elapsed — should be clamped to 500ms = 5 ticks
    const cb = rafCallbacks[rafCallbacks.length - 1];
    mockTime = 3000;
    cb(mockTime);

    expect(tick).toHaveBeenCalledTimes(5);
  });

  it("accumulates partial frame time correctly", () => {
    let mockTime = 1000;
    performance.now = vi.fn(() => mockTime);

    const tick = vi.fn();
    startLoop(tick);

    // 50ms elapsed — less than 1 tick, no calls yet
    const cb1 = rafCallbacks[rafCallbacks.length - 1];
    mockTime = 1050;
    cb1(mockTime);
    expect(tick).toHaveBeenCalledTimes(0);

    // Another 60ms — total accumulated 110ms, should fire 1 tick
    const cb2 = rafCallbacks[rafCallbacks.length - 1];
    mockTime = 1110;
    cb2(mockTime);
    expect(tick).toHaveBeenCalledTimes(1);
  });

  it("stops firing ticks after stopLoop", () => {
    let mockTime = 1000;
    performance.now = vi.fn(() => mockTime);

    const tick = vi.fn();
    startLoop(tick);

    const cb = rafCallbacks[rafCallbacks.length - 1];
    stopLoop();

    // Even if the callback fires, it should bail out
    mockTime = 1200;
    cb(mockTime);

    expect(tick).toHaveBeenCalledTimes(0);
  });
});
