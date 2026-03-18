// engine/saveManager.ts — localStorage auto-save, export/import

import type { GameState } from "../types";
import { migrate, validateState } from "../state/migrations";

export const SAVE_KEY = "ultra-runner-save";

// ── Core persistence ──────────────────────────────────────────────────

export function save(state: GameState): void {
  const toSave: GameState = {
    ...state,
    lastSavedAt: Date.now(),
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(toSave));
  } catch {
    // localStorage full or unavailable — silently fail for now
    console.warn("Failed to save game state to localStorage");
  }
}

export function load(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!validateState(parsed)) {
      console.warn("Save data failed validation");
      return null;
    }

    return migrate(parsed);
  } catch {
    console.warn("Failed to load game state from localStorage");
    return null;
  }
}

export function hasSave(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}

export function deleteSave(): void {
  localStorage.removeItem(SAVE_KEY);
}

// ── Auto-save ─────────────────────────────────────────────────────────

let autoSaveInterval: ReturnType<typeof setInterval> | null = null;
let beforeUnloadHandler: (() => void) | null = null;

export function setupAutoSave(
  getState: () => GameState | null,
  intervalMs: number = 30_000,
): void {
  teardownAutoSave();

  autoSaveInterval = setInterval(() => {
    const state = getState();
    if (state) save(state);
  }, intervalMs);

  beforeUnloadHandler = () => {
    const state = getState();
    if (state) save(state);
  };

  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", beforeUnloadHandler);
  }
}

export function teardownAutoSave(): void {
  if (autoSaveInterval !== null) {
    clearInterval(autoSaveInterval);
    autoSaveInterval = null;
  }

  if (beforeUnloadHandler !== null && typeof window !== "undefined") {
    window.removeEventListener("beforeunload", beforeUnloadHandler);
    beforeUnloadHandler = null;
  }
}

// ── Export / Import ───────────────────────────────────────────────────

export function exportSave(state: GameState): void {
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const filename = `ultra-runner-save-${date}.json`;

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

export async function importSave(file: File): Promise<GameState> {
  const text = await file.text();
  const parsed = JSON.parse(text);

  if (!validateState(parsed)) {
    throw new Error("Invalid save file: failed validation");
  }

  return migrate(parsed);
}
