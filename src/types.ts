// types.ts — All shared TypeScript interfaces/types for Ultra Runner Simulator

export const CURRENT_SCHEMA_VERSION = 7;

// ── Top-Level Game State ──────────────────────────────────────────────

export interface CoachState {
  hired: boolean;
  tier: number;           // 1-3
  name: string;
  weeklyCost: number;
  xpMultiplier: number;   // 1.0 = full XP (same as perfect tapping)
  fatigueReduction: number; // 0.15 = 15% less fatigue
}

export interface GameState {
  version: number;
  createdAt: number;       // Unix ms
  lastSavedAt: number;     // Unix ms
  lastTickAt: number;      // Unix ms, for idle calculation

  runner: RunnerState;
  stats: StatsState;
  condition: ConditionState;
  injuries: Injury[];
  calendar: CalendarState;
  training: TrainingState;
  race: RaceState;
  inventory: InventoryState;
  history: HistoryState;
  flags: FlagState;
  settings: SettingsState;
  coach: CoachState | null;
}

// ── Runner ────────────────────────────────────────────────────────────

export interface RunnerState {
  name: string;
  backstory: "couch_to_5k" | "former_athlete" | "hiker" | "stress_runner";
  level: number;
  xp: number;
  xpToNextLevel: number;
}

// ── Stats ─────────────────────────────────────────────────────────────

export interface StatsState {
  endurance: StatEntry;
  speed: StatEntry;
  strength: StatEntry;
  mentalToughness: StatEntry;
  recovery: StatEntry;
  nutritionIQ: StatEntry;
}

export interface StatEntry {
  trainingXp: number;
  // Display value (1-100) is DERIVED via xpToStat(trainingXp)
  // Never stored — always computed on read
}

// ── Condition ─────────────────────────────────────────────────────────

export interface ConditionState {
  fatigue: number;    // 0-100
  morale: number;     // 0-100
  energy: number;     // 0-100
  health: number;     // 0-100
}

// ── Injuries ──────────────────────────────────────────────────────────

export interface Injury {
  id: string;
  type: string;       // "shin_splints" | "sore_knee" | "tight_hamstring" | ...
  severity: "niggle" | "minor";
  recoveryDays: number;
  daysRemaining: number;
  performancePenalty: number; // 0.05 = 5% slower
}

// ── Calendar ──────────────────────────────────────────────────────────

export interface CalendarState {
  gameDay: number;                  // Days since game start
  season: "spring" | "summer" | "fall" | "winter";
  weekDay: number;                  // 0=Mon, 6=Sun
  trainingPlan: WeeklyPlan;
  scheduledRaces: ScheduledRace[];
}

export type WeeklyPlan = [
  DayPlan, DayPlan, DayPlan, DayPlan, DayPlan, DayPlan, DayPlan,
];

export interface DayPlan {
  workout: "easy_run" | "long_run" | "intervals" | "tempo_run" | "hill_repeats" | "rest";
}

export interface ScheduledRace {
  raceId: string;
  gameDay: number;
}

// ── Training ──────────────────────────────────────────────────────────

export interface TrainingState {
  currentWorkout: ActiveWorkout | null;
  weeklyMileage: number;
  previousWeekMileage: number;
  totalMiles: number;
  streak: number;
  consecutiveRestDays: number; // tracks rest days in a row, resets on training
  recoveryToolsUsedOnDay: Record<string, number>; // toolId -> gameDay last used
}

export interface ActiveWorkout {
  workoutType: string;
  startedAt: number;     // Unix ms
  duration: number;      // Target ms
  elapsed: number;       // ms so far
  taps: number;
  effortMeter: number;   // 0-1
  sweetSpotHits: number;
  sweetSpotMisses: number;
  statGainsAccumulated: Partial<Record<keyof StatsState, number>>;
}

// ── Race ──────────────────────────────────────────────────────────────

export interface RaceState {
  active: ActiveRace | null;
}

export interface RaceDebuff {
  id: string;
  name: string;
  effect: string;           // human-readable
  segmentsRemaining: number; // -1 = rest of race
  fatiguePenalty: number;    // extra fatigue per segment
  speedPenalty: number;      // multiplier on segment time (e.g., 1.1 = 10% slower)
  moraleDrain: number;       // extra morale loss per segment
}

export interface ActiveRace {
  raceId: string;
  currentSegment: number;
  totalSegments: number;
  elapsedTime: number;       // Race-seconds
  position: number;
  totalRunners: number;
  energy: number;            // 0-100
  fatigue: number;           // 0-100
  morale: number;            // 0-100
  pacePerSegment: string[];
  segmentResults: SegmentResult[];
  rngSeed: number;
  raceDebuffs: RaceDebuff[];
}

export interface SegmentResult {
  segment: number;
  time: number;              // Seconds
  events: string[];
  statChanges: Record<string, number>;
}

// ── Inventory ─────────────────────────────────────────────────────────

export interface InventoryState {
  money: number;
  shoes: OwnedGear[];
  apparel: OwnedGear[];
  accessories: OwnedGear[];
  equippedShoe: string | null;   // Gear instance ID
  equippedApparel: string[];     // Gear instance IDs
  equippedAccessories: string[]; // Gear instance IDs
  consumables: Record<string, number>; // templateId -> quantity owned
}

export interface OwnedGear {
  id: string;
  templateId: string;
  durability: number;     // Miles remaining
  maxDurability: number;
}

// ── History ───────────────────────────────────────────────────────────

export interface HistoryState {
  completedRaces: CompletedRace[];
  personalBests: Record<string, number | null>;
  achievements: string[];
  totalRacesFinished: number;
  totalRacesDNF: number;
}

export interface CompletedRace {
  raceId: string;
  gameDay: number;
  finishTime: number;        // Seconds
  position: number;
  totalRunners: number;
  result: "finished" | "dnf";
  xpEarned: number;
  moneyEarned: number;
  personalBest: boolean;
}

// ── Flags ─────────────────────────────────────────────────────────────

export interface FlagState {
  tutorialComplete: boolean;
  firstRaceComplete: boolean;
  firstDNF: boolean;
  firstUltraComplete: boolean;
  firstMarathonComplete: boolean;
  sponsoredRunTier: number; // 0=locked, 1=marathon, 2=50k, 3=50mi, 4=100mi
  unlockedDistances: string[];
}

// ── Settings ──────────────────────────────────────────────────────────

export interface SettingsState {
  soundEnabled: boolean;
  tapFeedback: boolean;
}

// ── Routing ───────────────────────────────────────────────────────────

export type Screen =
  | "dashboard"
  | "training"
  | "active_workout"
  | "races"
  | "active_race"
  | "shop"
  | "stats"
  | "settings"
  | "runner_creation"
  | "coach";

// ── Idle System ───────────────────────────────────────────────────────

export interface IdleWorkoutEntry {
  day: number;
  type: string;
  efficiency: number;
}

export interface IdleRestSubstitution {
  day: number;
  type: "rest_substituted";
  originalPlan: string;
}

export interface IdleResult {
  realHoursAway: number;
  gameDaysAdvanced: number;
  workoutsCompleted: Array<IdleWorkoutEntry | IdleRestSubstitution>;
  statGains: Partial<Record<keyof StatsState, number>>;
  fatigueChange: number;
  moneyEarned: number;
  idleCapped: boolean;
}
