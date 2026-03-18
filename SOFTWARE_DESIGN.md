# Ultra Runner Simulator — Software Design Document (MVP)

> **Version:** 0.1
> **Date:** 2026-03-17
> **Stack:** Preact + TypeScript + Vite
> **Hosting:** GitHub Pages (static site, no backend)
> **Scope:** MVP — Runner creation through Marathon (Tiers 1-4)

---

## Table of Contents

1. [MVP Scope Definition](#1-mvp-scope-definition)
2. [Tech Stack & Tooling](#2-tech-stack--tooling)
3. [Project Structure](#3-project-structure)
4. [Architecture Overview](#4-architecture-overview)
5. [Game Loop](#5-game-loop)
6. [State Shape & Persistence](#6-state-shape--persistence)
7. [Engine Modules](#7-engine-modules)
8. [UI Screens & Components](#8-ui-screens--components)
9. [Data Files & Schemas](#9-data-files--schemas)
10. [Idle/Offline System](#10-idleoffline-system)
11. [Save System](#11-save-system)
12. [Build & Deploy](#12-build--deploy)
13. [Testing Strategy](#13-testing-strategy)
14. [Post-MVP Roadmap](#14-post-mvp-roadmap)

---

## 1. MVP Scope Definition

### What Ships in v1

| System | MVP Scope |
|--------|-----------|
| **Runner Creation** | Name, backstory perk (4 options), skip visual customization for now |
| **Stats** | 6 primary stats: Endurance, Speed, Strength, Mental Toughness, Recovery, Nutrition IQ |
| **Training** | 4 workout types: Easy Run, Long Run, Intervals, Rest |
| **Training Mechanic** | Tap/click with cadence sweet spot, effort meter, fatigue accumulation |
| **Races** | Tiers 1-4: 5K, 10K, Half Marathon, Marathon. Segment-based with events. |
| **Gear** | 3 shoe tiers (Basic Trainers, Cushioned Road, Trail Shoes), minimal apparel (shirt, shorts, socks) |
| **Economy** | Race entry fees, prize money, shoe purchases. Simple income/expense. |
| **Injury** | Niggle and Minor severity only. Fatigue-based risk. |
| **Idle** | Offline progression at 50% efficiency, 8-hour cap. Auto-easy-runs only. |
| **Saves** | localStorage auto-save + JSON export/import |
| **UI Screens** | Dashboard, Training, Active Workout, Race Select, Active Race, Shop, Stats, Settings |

### What Does NOT Ship in v1

- Visual runner customization / paper doll
- Race tiers 5-10 (50K through Barkley)
- Nutrition/fueling/bonking system (races use simplified energy)
- Hydration systems, accessories, consumables
- Sponsorships
- NPC rivals, crew, pacers
- Hidden/secondary stats (trail skill, heat adaptation, etc.)
- Overtraining system (fatigue only, no overtraining meter)
- Trophy case, shoe wall, runner journal
- Audio/sound effects
- Canvas runner animation (CSS-based placeholder)
- Weather system
- Prestige/New Season

### MVP Success Criteria

The core loop must be fun: **train → improve stats → enter race → make decisions → finish (or DNF) → buy better gear → repeat**. If this loop isn't satisfying with 4 workout types and 4 race tiers, no amount of content will save it.

---

## 2. Tech Stack & Tooling

### Core Stack

| Tool | Version | Purpose |
|------|---------|---------|
| **Preact** | ^10.x | UI framework (3KB gzipped, React-compatible API) |
| **@preact/signals** | ^1.x | Fine-grained reactive state management |
| **TypeScript** | ^5.x | Type safety for game logic, data structures, state |
| **Vite** | ^6.x | Build tool, dev server, HMR, static output |

### Why This Stack

- **Preact over React:** 3KB vs 40KB. Same component model, same JSX. This game doesn't need concurrent mode, server components, or the React ecosystem's heavier libraries.
- **Preact Signals over Redux/Zustand:** Signals give fine-grained reactivity — only components reading a specific signal re-render when it changes. No selector boilerplate. Perfect for a game with many independent UI elements (stat bars, fatigue gauge, money counter) that update at different rates.
- **TypeScript is non-negotiable:** The game has complex interacting formulas (8 stats × 7 workout types × 10 race tiers × 5 injury severities × 4 gear tiers). Types prevent entire categories of bugs.
- **Vite over Webpack/Rollup:** Zero config, instant HMR, native TypeScript/JSX support, optimized static output. Industry standard for this type of project.

### Dev Dependencies

| Tool | Purpose |
|------|---------|
| **vitest** | Unit testing (Vite-native, fast) |
| **prettier** | Code formatting |
| **eslint** | Linting (with @typescript-eslint) |

### What We're NOT Using

- No CSS framework (Tailwind, etc.) — game UI is custom enough that utility classes add noise
- No animation library — CSS transitions + a single `<canvas>` later
- No router library — simple signal-based screen switching (8 screens, no deep linking needed)
- No Pixi.js for MVP — CSS-based training/race visualization; canvas added in v2

---

## 3. Project Structure

```
ultra-runner/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Pages deploy
├── public/
│   └── favicon.ico
├── src/
│   ├── main.tsx                    # Entry point, mount app
│   ├── app.tsx                     # Root component, screen routing
│   ├── types.ts                    # All shared TypeScript interfaces/types
│   │
│   ├── state/
│   │   ├── gameState.ts            # Signal-based state, initialization
│   │   ├── actions.ts              # State mutation functions (buy gear, start workout, etc.)
│   │   └── migrations.ts           # Save schema version migrations
│   │
│   ├── engine/
│   │   ├── clock.ts                # Game time tracking, real-to-game time conversion
│   │   ├── gameLoop.ts             # Fixed-timestep logic loop
│   │   ├── saveManager.ts          # localStorage read/write, export/import
│   │   ├── idleCalculator.ts       # Offline progression computation
│   │   └── prng.ts                 # Seeded random number generator (mulberry32)
│   │
│   ├── systems/
│   │   ├── training.ts             # Workout execution, cadence scoring, stat gains
│   │   ├── race.ts                 # Segment state machine, event resolution
│   │   ├── stats.ts                # Stat formulas, XP-to-value curve, scaling
│   │   ├── injury.ts               # Injury risk, severity, recovery
│   │   ├── economy.ts              # Money in/out, purchase validation
│   │   └── progression.ts          # XP/level calc, distance unlock checks
│   │
│   ├── data/
│   │   ├── races.json              # Race definitions
│   │   ├── gear.json               # Equipment templates
│   │   ├── workouts.json           # Workout type definitions
│   │   ├── events.json             # Race event definitions
│   │   ├── balance.json            # Tuning constants
│   │   └── achievements.json       # Achievement definitions
│   │
│   ├── screens/
│   │   ├── Dashboard.tsx           # Main hub
│   │   ├── Training.tsx            # Weekly calendar, workout selection
│   │   ├── ActiveWorkout.tsx       # Tap mechanic, active training
│   │   ├── RaceSelect.tsx          # Race calendar, registration
│   │   ├── ActiveRace.tsx          # Segment-based race execution
│   │   ├── Shop.tsx                # Gear purchasing
│   │   ├── StatsView.tsx           # Detailed runner stats
│   │   └── Settings.tsx            # Save export/import, options
│   │
│   ├── components/
│   │   ├── StatBar.tsx             # Horizontal stat display with value
│   │   ├── GaugeCircle.tsx         # Circular gauge (fatigue, energy, etc.)
│   │   ├── ProgressBar.tsx         # Generic progress bar
│   │   ├── TrainingCalendar.tsx    # 7-day week grid
│   │   ├── RaceCard.tsx            # Race info card
│   │   ├── GearCard.tsx            # Equipment item card
│   │   ├── EventModal.tsx          # Race event choice modal
│   │   ├── AidStationPanel.tsx     # Aid station decision panel
│   │   ├── ResultsScreen.tsx       # Post-race results
│   │   ├── IdleSummary.tsx         # "While you were away" modal
│   │   ├── NavBar.tsx              # Bottom tab navigation
│   │   └── Button.tsx              # Shared button component
│   │
│   ├── styles/
│   │   ├── global.css              # Reset, variables, typography
│   │   ├── screens.css             # Per-screen styles
│   │   └── components.css          # Component styles
│   │
│   └── utils/
│       ├── format.ts               # Time formatting, number display
│       └── helpers.ts              # Misc utilities
│
└── tests/
    ├── stats.test.ts               # Stat formula tests
    ├── training.test.ts            # Cadence scoring, stat gain tests
    ├── race.test.ts                # Race simulation tests
    ├── injury.test.ts              # Injury probability tests
    ├── idle.test.ts                # Offline calculation tests
    ├── economy.test.ts             # Purchase/money tests
    └── migrations.test.ts          # Save migration tests
```

### Key Principles

- **`engine/` and `systems/` have zero Preact/DOM imports.** Pure TypeScript. All game logic is framework-agnostic and independently testable.
- **`screens/` are full-page views.** Each screen is a Preact component that composes `components/`.
- **`data/` is static JSON imported at build time.** Vite handles JSON imports natively. All balance tuning lives here.
- **`state/` is the single source of truth.** Signals wrap the game state. Actions are the only way to mutate state.

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   App (Preact)                   │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │Dashboard │  │ Training │  │  Race    │ ...   │
│  │  Screen  │  │  Screen  │  │  Screen  │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
│       │              │              │             │
│       └──────────────┴──────────────┘             │
│                      │                            │
│                reads signals                      │
│                calls actions                      │
│                      │                            │
├──────────────────────┼────────────────────────────┤
│              State Layer (Signals)                │
│                                                   │
│  ┌─────────────────────────────┐                 │
│  │   gameState signal          │                 │
│  │   (single GameState object) │                 │
│  └──────────┬──────────────────┘                 │
│             │                                     │
│       actions.ts mutates                          │
│       via signal.value = ...                      │
│             │                                     │
├─────────────┼─────────────────────────────────────┤
│         Engine & Systems (pure TS)                │
│                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │ training │ │   race   │ │  stats   │         │
│  │  system  │ │  system  │ │  system  │  ...    │
│  └──────────┘ └──────────┘ └──────────┘         │
│                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │gameLoop  │ │  clock   │ │  idle    │         │
│  │          │ │          │ │ calculator│         │
│  └──────────┘ └──────────┘ └──────────┘         │
│                                                   │
├───────────────────────────────────────────────────┤
│              Data Layer (static JSON)             │
│  races.json  gear.json  workouts.json  etc.      │
│                                                   │
├───────────────────────────────────────────────────┤
│              Persistence                          │
│  localStorage (auto-save)                         │
│  File export/import (manual backup)               │
└───────────────────────────────────────────────────┘
```

### Data Flow

1. **User taps/clicks** → Screen component calls an action
2. **Action** calls engine/system functions with current state → receives new state
3. **Action** writes new state to the signal
4. **Signal update** triggers re-render of subscribed components
5. **Auto-save** periodically serializes signal value to localStorage

### Separation of Concerns

| Layer | Knows About | Does NOT Know About |
|-------|------------|---------------------|
| Screens/Components | Signals, actions, types | Engine internals, localStorage |
| State/Actions | Engine systems, signals | DOM, Preact components |
| Engine/Systems | Types, data JSON, math | Signals, DOM, Preact, localStorage |
| Data JSON | Nothing | Everything |

---

## 5. Game Loop

### Dual-Loop Design

Two timing systems coexist:

1. **`requestAnimationFrame` loop** — drives visual updates (CSS transitions, future canvas). Variable timestep at display refresh rate. Does NOT drive game logic.
2. **Fixed-timestep logic tick at 10Hz** (100ms) — drives all game state updates. Deterministic and reproducible.

### Implementation

```typescript
// engine/gameLoop.ts

const LOGIC_HZ = 10;
const LOGIC_DT = 1000 / LOGIC_HZ; // 100ms per tick

let lastTime = 0;
let accumulator = 0;
let running = false;

export function startLoop(onLogicTick: (dt: number) => void) {
  running = true;
  lastTime = performance.now();

  function frame(now: number) {
    if (!running) return;

    const elapsed = Math.min(now - lastTime, 500); // clamp to prevent spiral
    lastTime = now;
    accumulator += elapsed;

    while (accumulator >= LOGIC_DT) {
      onLogicTick(LOGIC_DT);
      accumulator -= LOGIC_DT;
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

export function stopLoop() {
  running = false;
}
```

### When Logic Ticks Run

| App State | Logic Tick Active? | What Updates |
|-----------|-------------------|-------------|
| Dashboard/menus | Yes (low activity) | Clock advances, recovery ticks, auto-save check |
| Active training | Yes | Cadence scoring, stat gains, fatigue, injury checks |
| Active race | Yes | Segment timer, event resolution, nutrition/fatigue |
| Tab hidden | **Paused** | Nothing — IdleCalculator handles the gap on return |
| Settings/shop | Yes (low activity) | Clock, recovery |

### Visibility Change Handling

```typescript
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopLoop();
    saveManager.save(gameState.value); // save immediately
  } else {
    const idleResult = idleCalculator.compute(gameState.value, Date.now());
    if (idleResult) {
      applyIdleGains(idleResult); // update state
      showIdleSummary(idleResult); // show "while you were away" modal
    }
    startLoop(onLogicTick);
  }
});
```

---

## 6. State Shape & Persistence

### TypeScript Types

```typescript
// types.ts

export interface GameState {
  version: number;                 // Schema version for migrations
  createdAt: number;               // Unix ms
  lastSavedAt: number;             // Unix ms
  lastTickAt: number;              // Unix ms, for idle calculation

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
}

export interface RunnerState {
  name: string;
  backstory: "couch_to_5k" | "former_athlete" | "hiker" | "stress_runner";
  level: number;
  xp: number;
  xpToNextLevel: number;
}

export interface StatsState {
  endurance:       StatEntry;
  speed:           StatEntry;
  strength:        StatEntry;
  mentalToughness: StatEntry;
  recovery:        StatEntry;
  nutritionIQ:     StatEntry;
}

export interface StatEntry {
  trainingXp: number;              // Raw accumulated XP
  // Display value (1-100) is DERIVED via xpToStat(trainingXp)
  // Never stored — always computed on read
}

export interface ConditionState {
  fatigue: number;                 // 0-100
  morale: number;                  // 0-100
  energy: number;                  // 0-100
  health: number;                  // 0-100
}

export interface Injury {
  id: string;
  type: string;                    // "shin_splints" | "sore_knee" | "tight_hamstring" | ...
  severity: "niggle" | "minor";   // MVP: only these two
  recoveryDays: number;
  daysRemaining: number;
  performancePenalty: number;      // 0.05 = 5% slower
}

export interface CalendarState {
  gameDay: number;                 // Days since game start
  season: "spring" | "summer" | "fall" | "winter";
  weekDay: number;                 // 0=Mon, 6=Sun
  trainingPlan: WeeklyPlan;
  scheduledRaces: ScheduledRace[];
}

export type WeeklyPlan = [
  DayPlan, DayPlan, DayPlan, DayPlan, DayPlan, DayPlan, DayPlan
];

export interface DayPlan {
  workout: "easy_run" | "long_run" | "intervals" | "rest";
}

export interface ScheduledRace {
  raceId: string;
  gameDay: number;
}

export interface TrainingState {
  currentWorkout: ActiveWorkout | null;
  weeklyMileage: number;
  previousWeekMileage: number;
  totalMiles: number;
  streak: number;                  // Consecutive days with activity
}

export interface ActiveWorkout {
  workoutType: string;
  startedAt: number;               // Unix ms
  duration: number;                // Target ms
  elapsed: number;                 // ms so far
  taps: number;
  effortMeter: number;             // 0-1
  sweetSpotHits: number;
  sweetSpotMisses: number;
  statGainsAccumulated: Partial<Record<keyof StatsState, number>>;
}

export interface RaceState {
  active: ActiveRace | null;
}

export interface ActiveRace {
  raceId: string;
  currentSegment: number;
  totalSegments: number;
  elapsedTime: number;             // Race-seconds
  position: number;
  totalRunners: number;
  energy: number;                  // 0-100 (simplified glycogen for MVP)
  fatigue: number;                 // 0-100
  morale: number;                  // 0-100
  pacePerSegment: string[];        // Choices made so far
  segmentResults: SegmentResult[];
  rngSeed: number;                 // For deterministic events
}

export interface SegmentResult {
  segment: number;
  time: number;                    // Seconds
  events: string[];
  statChanges: Record<string, number>;
}

export interface InventoryState {
  money: number;
  shoes: OwnedGear[];
  apparel: OwnedGear[];
  equippedShoe: string | null;     // Gear instance ID
  equippedApparel: string[];       // Gear instance IDs
}

export interface OwnedGear {
  id: string;                      // Unique instance ID
  templateId: string;              // References gear.json
  durability: number;              // Miles remaining
  maxDurability: number;
}

export interface HistoryState {
  completedRaces: CompletedRace[];
  personalBests: Record<string, number | null>; // distance key → seconds
  achievements: string[];
  totalRacesFinished: number;
  totalRacesDNF: number;
}

export interface CompletedRace {
  raceId: string;
  gameDay: number;
  finishTime: number;              // Seconds
  position: number;
  totalRunners: number;
  result: "finished" | "dnf";
  xpEarned: number;
  moneyEarned: number;
  personalBest: boolean;
}

export interface FlagState {
  tutorialComplete: boolean;
  firstRaceComplete: boolean;
  firstDNF: boolean;
  unlockedDistances: string[];     // ["5k", "10k", ...]
}

export interface SettingsState {
  soundEnabled: boolean;
  tapFeedback: boolean;
}
```

### Key Design Decisions

- **`trainingXp` stored, display value derived.** The stat value (1-100) is computed via `xpToStat(trainingXp)` every time it's read. This means the logarithmic curve is always consistent, idle catch-up just adds XP, and we never have rounding drift.
- **Equipment uses `templateId` + instance `id`.** Templates are in `gear.json`. Instances track mutable state (durability). You can own multiple pairs of the same shoe.
- **`lastTickAt` drives idle calculation.** The gap between `lastTickAt` and `Date.now()` on load tells IdleCalculator exactly how much time to simulate.
- **Schema `version` field.** Every save has it. Every state shape change increments it and adds a migration function.

### Persistence

- **localStorage** with key `"ultra-runner-save"`
- Full state serialized as JSON (~10-50KB for MVP, well under the 5-10MB limit)
- Auto-save every 30 seconds + on `beforeunload` + on significant state changes
- Schema version checked on load; migrations applied if needed

---

## 7. Engine Modules

### `engine/clock.ts` — Game Time

Converts real elapsed time to in-game days. Controls time compression ratio.

```typescript
const GAME_HOURS_PER_REAL_HOUR = 4; // 1 real hour = 4 game hours
// So 6 real hours = 1 game day (24 game hours)
// A real-world week of play ≈ 28 game days ≈ 1 game month
```

### `engine/prng.ts` — Seeded Random

Mulberry32 implementation. All randomness in race events, injury rolls, etc. uses this instead of `Math.random()`. Seed stored in state for reproducibility.

```typescript
export function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

### `systems/stats.ts` — Stat Formulas

The core XP-to-stat conversion and all derived calculations.

```typescript
// Convert accumulated XP to display stat (1-100)
// Tuned: 0 XP → 1, ~500 XP → 30, ~5000 XP → 60, ~50000 XP → 85, ~500000 XP → 100
export function xpToStat(xp: number): number {
  return Math.min(100, 1 + 14.2 * Math.log10(1 + xp));
}

// Aggregate "fitness level" shown on dashboard
export function fitnessLevel(stats: StatsState): number {
  const values = Object.values(stats).map((s) => xpToStat(s.trainingXp));
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}
```

### `systems/training.ts` — Workout Execution

Cadence scoring, stat gain calculation, fatigue accumulation. Called on every logic tick during active training.

**Cadence Zones (MVP — 4 workout types):**

| Workout | Sweet Spot (taps/sec) | Under | Over |
|---------|----------------------|-------|------|
| Easy Run | 2.0 - 2.8 | <1.5 | >4.0 |
| Long Run | 2.0 - 2.5 | <1.5 | >3.5 |
| Intervals | 3.5 - 4.5 | <2.5 | >6.0 |
| Rest | N/A (no tapping) | — | — |

**Stat Distribution per Workout:**

| Workout | Primary Stat (60%) | Secondary Stat (30%) | Tertiary (10%) |
|---------|-------------------|---------------------|---------------|
| Easy Run | Endurance | Recovery | Speed |
| Long Run | Endurance | Mental Toughness | Strength |
| Intervals | Speed | Endurance | Mental Toughness |

### `systems/race.ts` — Race Simulation

Segment-based state machine:

```
PRE_RACE → SEGMENT_SETUP → SEGMENT_RUNNING → EVENT_CHECK → SEGMENT_RESOLVE
                ↑                                                    │
                └──── AID_STATION ←──────────────────────────────────┘
                                                                     │
                                                              RACE_COMPLETE
                                                                or DNF
```

**States:**

| State | What Happens | Player Action |
|-------|-------------|---------------|
| `PRE_RACE` | Validate loadout, initialize race state, seed RNG | Confirm start |
| `SEGMENT_SETUP` | Show terrain, elevation, present pace choice | Choose pace |
| `SEGMENT_RUNNING` | Auto-resolves over a few seconds. Stats checked vs terrain. | Watch |
| `EVENT_CHECK` | Roll for 0-2 random events from `events.json` | Choose A/B/C |
| `SEGMENT_RESOLVE` | Compute segment time, update position, check cutoffs | View result |
| `AID_STATION` | Eat/drink/rest. Time vs recovery trade-off. | Allocate time |
| `RACE_COMPLETE` | Tally results, compute rewards | View results |
| `DNF` | Record reason, partial rewards | View summary |

**Segment Time Formula:**

```typescript
function computeSegmentTime(
  segment: Segment,
  pace: "conservative" | "steady" | "aggressive",
  raceState: ActiveRace,
  stats: StatsState
): number {
  // Base pace from speed stat (minutes per mile)
  const speedVal = xpToStat(stats.speed.trainingXp);
  let basePace = 15 - speedVal * 0.1; // stat 0 → 15:00/mi, stat 100 → 5:00/mi

  // Pace modifier
  const paceMods = { conservative: 1.15, steady: 1.0, aggressive: 0.88 };
  basePace *= paceMods[pace];

  // Terrain modifier
  const terrainMods: Record<string, number> = {
    flat_road: 1.0,
    rolling_hills: 1.08,
    steep_climb: 1.35,
    technical_descent: 1.15,
  };
  basePace *= terrainMods[segment.terrain] ?? 1.0;

  // Fatigue: exponential slowdown past 60%
  if (raceState.fatigue > 60) {
    basePace *= 1 + ((raceState.fatigue - 60) / 40) * 0.5;
  }

  // Energy depletion: dramatic slowdown below 20%
  if (raceState.energy < 20) {
    basePace *= 1.5; // survival shuffle
  }

  return basePace * segment.distanceMiles * 60; // seconds
}
```

### `systems/injury.ts` — Injury System

MVP: only Niggle and Minor severity.

```typescript
// Checked after each workout and each race segment
function rollInjury(
  fatigue: number,
  shoeDurabilityPct: number,
  weeklyMileageIncrease: number, // % increase over last week
  rng: () => number
): Injury | null {
  let risk = 0.01; // 1% base

  // Fatigue multiplier
  if (fatigue > 70) risk += (fatigue - 70) * 0.003;
  if (fatigue > 85) risk += (fatigue - 85) * 0.008;

  // Worn shoes
  if (shoeDurabilityPct < 0.2) risk += 0.03;

  // 10% rule violation
  if (weeklyMileageIncrease > 10) risk += (weeklyMileageIncrease - 10) * 0.002;

  if (rng() < risk) {
    // Determine severity: 70% niggle, 30% minor
    const severity = rng() < 0.7 ? "niggle" : "minor";
    return generateInjury(severity, rng);
  }
  return null;
}
```

### `systems/economy.ts` — Money

Simple for MVP: entry fees, prize money, gear purchases.

```typescript
// Prize money by tier and placement percentile
function racePrize(tier: number, positionPct: number): number {
  const basePrize = [50, 100, 200, 500][tier - 1]; // tiers 1-4
  if (positionPct <= 0.1) return basePrize * 3;     // top 10%
  if (positionPct <= 0.25) return basePrize * 2;    // top 25%
  if (positionPct <= 0.5) return basePrize;          // top 50%
  return Math.floor(basePrize * 0.25);               // participation
}
```

### `systems/progression.ts` — Leveling & Unlocks

```typescript
const DISTANCE_UNLOCKS: Record<number, string[]> = {
  1: ["5k"],
  3: ["10k"],
  7: ["half_marathon"],
  12: ["marathon"],
};

function checkUnlocks(level: number, currentFlags: FlagState): string[] {
  const newUnlocks: string[] = [];
  for (const [lvl, distances] of Object.entries(DISTANCE_UNLOCKS)) {
    if (level >= Number(lvl)) {
      for (const d of distances) {
        if (!currentFlags.unlockedDistances.includes(d)) {
          newUnlocks.push(d);
        }
      }
    }
  }
  return newUnlocks;
}
```

---

## 8. UI Screens & Components

### Screen Map

```
┌─────────────────────────────────────────┐
│            Bottom NavBar                │
│  [Dashboard] [Training] [Races] [Shop] [Stats] │
└─────────────────────────────────────────┘

Dashboard ──→ ActiveWorkout (via "Start Training" button)
Training  ──→ ActiveWorkout (via day selection)
Races     ──→ ActiveRace (via "Start Race" button)
Shop      ──→ (inline purchase flow)
Stats     ──→ Settings (via gear icon)
```

### Screen Descriptions

**Dashboard**
- Runner name + level
- Condition gauges: Fatigue, Energy, Health, Morale (circular gauges)
- Fitness level number (aggregate stat)
- Today's planned workout with "Start Training" CTA
- Next scheduled race with countdown
- Last 3 completed activities
- Money display

**Training**
- 7-day calendar grid showing planned workouts
- Tap a day to change its workout type (dropdown/picker)
- Current week mileage vs last week (10% rule indicator)
- "Start Today's Workout" button
- Streak counter

**ActiveWorkout**
- Full-screen takeover (no nav bar)
- Workout name + type at top
- Large tap zone (bottom 40% of screen)
- Effort meter (vertical bar, fills with taps)
- Cadence indicator (ring that pulses — green=sweet spot, yellow=off, red=danger)
- Elapsed time / target time
- Floating stat gain numbers
- Fatigue bar (warning colors at thresholds)
- End Workout button

**RaceSelect**
- List of available races (filtered by unlocked distances)
- Each race as a card: name, distance, terrain, entry fee, prize range
- Registration button (deducts entry fee)
- Upcoming registered races section

**ActiveRace**
- Full-screen takeover
- Race name + distance at top
- Segment progress bar (dots for segments, current highlighted)
- Position display ("47th / 312")
- Segment info: terrain type, distance
- Pace selector (3 buttons: Conservative / Steady / Aggressive)
- Energy + Fatigue + Morale gauges
- Event modal (when events trigger — choice A/B/C)
- Aid station panel (when between segments at aid)
- "Drop Out" button (voluntary DNF)

**Shop**
- Category tabs: Shoes, Apparel
- Item cards with: name, stats, cost, buy button
- Owned items section with durability bars
- Equip/unequip toggle

**StatsView**
- All 6 stats with bars showing value (1-100)
- Lifetime stats: total miles, races finished, DNFs, PRs
- Personal bests by distance
- Achievement list
- Level + XP bar

**Settings**
- Export Save (download JSON)
- Import Save (file picker)
- New Game (with confirmation)
- Sound toggle
- About/credits

### Routing

Simple signal-based, no URL routing needed:

```typescript
// state/gameState.ts
import { signal } from "@preact/signals";

export type Screen =
  | "dashboard"
  | "training"
  | "active_workout"
  | "races"
  | "active_race"
  | "shop"
  | "stats"
  | "settings"
  | "runner_creation";

export const currentScreen = signal<Screen>("dashboard");
```

```tsx
// app.tsx
function App() {
  const screen = currentScreen.value;
  return (
    <div class="app">
      {screen === "dashboard" && <Dashboard />}
      {screen === "training" && <Training />}
      {screen === "active_workout" && <ActiveWorkout />}
      {screen === "races" && <RaceSelect />}
      {screen === "active_race" && <ActiveRace />}
      {screen === "shop" && <Shop />}
      {screen === "stats" && <StatsView />}
      {screen === "settings" && <Settings />}
      {screen === "runner_creation" && <RunnerCreation />}

      {/* NavBar hidden during full-screen takeovers */}
      {!["active_workout", "active_race", "runner_creation"].includes(screen) && (
        <NavBar />
      )}
    </div>
  );
}
```

---

## 9. Data Files & Schemas

### `data/races.json`

```json
[
  {
    "id": "park_run_5k",
    "name": "Park Run 5K",
    "distance": 3.1,
    "unit": "miles",
    "tier": 1,
    "terrain": "flat_road",
    "segments": 3,
    "entryFee": 25,
    "basePrize": 50,
    "fieldSize": [80, 150],
    "cutoffMinutes": null,
    "description": "Your local Saturday morning 5K. Friendly faces, fresh air."
  },
  {
    "id": "turkey_trot_5k",
    "name": "Turkey Trot 5K",
    "distance": 3.1,
    "unit": "miles",
    "tier": 1,
    "terrain": "flat_road",
    "segments": 3,
    "entryFee": 30,
    "basePrize": 50,
    "fieldSize": [200, 500],
    "cutoffMinutes": null,
    "description": "Thanksgiving tradition. Run now, eat later."
  },
  {
    "id": "bridge_run_10k",
    "name": "Bridge Run 10K",
    "distance": 6.2,
    "unit": "miles",
    "tier": 2,
    "terrain": "rolling_hills",
    "segments": 4,
    "entryFee": 40,
    "basePrize": 100,
    "fieldSize": [150, 400],
    "cutoffMinutes": 90,
    "description": "Cross the bridge, earn the view."
  },
  {
    "id": "rock_city_half",
    "name": "Rock City Half Marathon",
    "distance": 13.1,
    "unit": "miles",
    "tier": 3,
    "terrain": "rolling_hills",
    "segments": 6,
    "entryFee": 85,
    "basePrize": 200,
    "fieldSize": [500, 2000],
    "cutoffMinutes": 210,
    "description": "Your first real test. 13.1 miles of grit."
  },
  {
    "id": "big_city_marathon",
    "name": "Big City Marathon",
    "distance": 26.2,
    "unit": "miles",
    "tier": 4,
    "terrain": "flat_road",
    "segments": 8,
    "entryFee": 150,
    "basePrize": 500,
    "fieldSize": [2000, 10000],
    "cutoffMinutes": 420,
    "description": "26.2 miles. The distance that breaks and makes people."
  }
]
```

MVP ships with ~3-4 races per tier (12-16 total). Additional races are trivial to add later — just new JSON entries.

### `data/gear.json`

```json
{
  "shoes": [
    {
      "id": "basic_trainers",
      "name": "Basic Trainers",
      "tier": 1,
      "cost": 80,
      "durability": 300,
      "effects": {},
      "description": "They'll get you to the finish line. Probably."
    },
    {
      "id": "cushioned_road",
      "name": "Cushioned Road Shoe",
      "tier": 2,
      "cost": 130,
      "durability": 400,
      "effects": { "speedBonus": 0.05, "terrain": "flat_road" },
      "description": "Plush cushioning for the road. Your knees will thank you."
    },
    {
      "id": "trail_shoes",
      "name": "Trail Running Shoes",
      "tier": 3,
      "cost": 140,
      "durability": 350,
      "effects": {
        "speedBonus": 0.10,
        "terrain": "rolling_hills",
        "roadPenalty": 0.05
      },
      "description": "Aggressive lugs for dirt and rocks. Awkward on pavement."
    }
  ],
  "apparel": [
    {
      "id": "cotton_tee",
      "name": "Cotton T-Shirt",
      "tier": 0,
      "cost": 0,
      "durability": 9999,
      "effects": { "chafePenalty": 0.05 },
      "description": "The shirt you already own. Cotton kills, but it's free."
    },
    {
      "id": "tech_tee",
      "name": "Tech Tee",
      "tier": 1,
      "cost": 45,
      "durability": 9999,
      "effects": {},
      "description": "Moisture-wicking. The first upgrade every runner makes."
    },
    {
      "id": "split_shorts",
      "name": "Split Shorts",
      "tier": 1,
      "cost": 40,
      "durability": 9999,
      "effects": {},
      "description": "Built-in liner. No underwear required. Welcome to running."
    },
    {
      "id": "running_socks",
      "name": "Running Socks",
      "tier": 1,
      "cost": 15,
      "durability": 9999,
      "effects": { "blistReduction": 0.3 },
      "description": "Thin, moisture-wicking, and worth every penny."
    }
  ]
}
```

### `data/workouts.json`

```json
[
  {
    "id": "easy_run",
    "name": "Easy Run",
    "description": "Conversational pace. The foundation of all training.",
    "durationMs": 25000,
    "baseMiles": 4,
    "cadenceZone": { "min": 1.5, "sweet": [2.0, 2.8], "max": 4.0 },
    "baseXpPerTick": 1.0,
    "baseFatiguePerTick": 0.15,
    "statDistribution": {
      "endurance": 0.6,
      "recovery": 0.3,
      "speed": 0.1
    },
    "idleEligible": true,
    "baseXpPerDay": 80
  },
  {
    "id": "long_run",
    "name": "Long Run",
    "description": "The signature workout. Build your engine.",
    "durationMs": 45000,
    "baseMiles": 10,
    "cadenceZone": { "min": 1.5, "sweet": [2.0, 2.5], "max": 3.5 },
    "baseXpPerTick": 1.5,
    "baseFatiguePerTick": 0.3,
    "statDistribution": {
      "endurance": 0.6,
      "mentalToughness": 0.3,
      "strength": 0.1
    },
    "idleEligible": false,
    "baseXpPerDay": 150
  },
  {
    "id": "intervals",
    "name": "Intervals",
    "description": "Hard efforts with recovery. Speed is built here.",
    "durationMs": 20000,
    "baseMiles": 5,
    "cadenceZone": { "min": 2.5, "sweet": [3.5, 4.5], "max": 6.0 },
    "baseXpPerTick": 2.0,
    "baseFatiguePerTick": 0.5,
    "statDistribution": {
      "speed": 0.6,
      "endurance": 0.3,
      "mentalToughness": 0.1
    },
    "idleEligible": false,
    "baseXpPerDay": 120
  },
  {
    "id": "rest",
    "name": "Rest Day",
    "description": "The body adapts during rest, not during training.",
    "durationMs": 0,
    "baseMiles": 0,
    "cadenceZone": null,
    "baseXpPerTick": 0,
    "baseFatiguePerTick": 0,
    "statDistribution": {},
    "idleEligible": true,
    "baseXpPerDay": 0,
    "recoveryAmount": 15
  }
]
```

### `data/events.json`

```json
[
  {
    "id": "crowd_energy",
    "name": "Crowd Energy",
    "description": "The spectators are cheering loud. You feel a surge of energy.",
    "type": "positive",
    "baseProbability": 0.3,
    "terrainTypes": ["flat_road"],
    "minTier": 1,
    "effect": { "morale": 10 },
    "choices": null
  },
  {
    "id": "stomach_trouble",
    "name": "Stomach Trouble",
    "description": "Your stomach is not happy. Something you ate isn't sitting right.",
    "type": "negative",
    "baseProbability": 0.15,
    "terrainTypes": ["flat_road", "rolling_hills"],
    "minTier": 2,
    "statCheck": "nutritionIQ",
    "effect": null,
    "choices": [
      {
        "label": "Slow down and sip water",
        "effect": { "energy": -5, "timepenaltySeconds": 60 },
        "outcome": "The nausea passes after a few minutes."
      },
      {
        "label": "Push through it",
        "effect": { "energy": -15, "morale": -10 },
        "outcome": "Bad call. It gets worse before it gets better."
      },
      {
        "label": "Walk for a bit",
        "effect": { "timepenaltySeconds": 120, "morale": 5 },
        "outcome": "Walking helps settle things. You lose time but feel better."
      }
    ]
  },
  {
    "id": "hot_spot",
    "name": "Hot Spot",
    "description": "You feel a hot spot forming on your left foot.",
    "type": "negative",
    "baseProbability": 0.1,
    "terrainTypes": ["flat_road", "rolling_hills", "steep_climb"],
    "minTier": 2,
    "statCheck": null,
    "gearCheck": "running_socks",
    "effect": null,
    "choices": [
      {
        "label": "Stop and adjust (30 seconds)",
        "effect": { "timepenaltySeconds": 30 },
        "outcome": "Quick adjustment. Crisis averted."
      },
      {
        "label": "Ignore it",
        "effect": { "blisterRisk": 0.6 },
        "outcome": "You'll deal with it later. Maybe."
      }
    ]
  },
  {
    "id": "the_wall",
    "name": "The Wall",
    "description": "Mile 20. Everything in your body says stop.",
    "type": "negative",
    "baseProbability": 0.8,
    "terrainTypes": ["flat_road", "rolling_hills"],
    "minTier": 4,
    "minSegment": 6,
    "oncePerRace": true,
    "statCheck": "mentalToughness",
    "effect": null,
    "choices": [
      {
        "label": "Dig deep",
        "effect": { "morale": -15, "energy": -10, "mentalToughnessXp": 50 },
        "outcome": "You find something inside you didn't know was there."
      },
      {
        "label": "Walk and regroup",
        "effect": { "timepenaltySeconds": 180, "morale": 5 },
        "outcome": "Walking lets you gather yourself. Many marathoners walk the wall."
      }
    ]
  },
  {
    "id": "runners_high",
    "name": "Runner's High",
    "description": "Everything clicks. Your breathing is easy, your legs feel light.",
    "type": "positive",
    "baseProbability": 0.1,
    "terrainTypes": ["flat_road", "rolling_hills"],
    "minTier": 1,
    "effect": { "morale": 15, "fatigue": -5 },
    "choices": null
  },
  {
    "id": "wrong_turn",
    "name": "Wrong Turn",
    "description": "You missed a course marker and ran an extra 0.1 miles.",
    "type": "negative",
    "baseProbability": 0.05,
    "terrainTypes": ["rolling_hills"],
    "minTier": 2,
    "effect": { "timepenaltySeconds": 45, "morale": -5 },
    "choices": null
  }
]
```

### `data/balance.json`

```json
{
  "timeCompression": {
    "gameHoursPerRealHour": 4
  },
  "stats": {
    "xpToStatFormula": "min(100, 1 + 14.2 * log10(1 + xp))",
    "offlineEfficiency": 0.5,
    "fatigueGainReduction": 0.005
  },
  "injury": {
    "baseRisk": 0.01,
    "fatigueThreshold": 70,
    "fatigueSevereThreshold": 85,
    "wornShoeThreshold": 0.2,
    "mileageIncreaseThreshold": 10,
    "niggleProbability": 0.7,
    "niggleRecoveryDays": [1, 2],
    "minorRecoveryDays": [3, 7],
    "nigglePenalty": 0.05,
    "minorPenalty": 0.15
  },
  "economy": {
    "prizeMultipliers": {
      "top10pct": 3,
      "top25pct": 2,
      "top50pct": 1,
      "other": 0.25
    }
  },
  "idle": {
    "maxHours": 8,
    "efficiency": 0.5,
    "restRecoveryBase": 15,
    "restRecoveryPerRecoveryStat": 0.2,
    "substitutedRestRecovery": 8
  },
  "race": {
    "basePaceFormula": "15 - (speedStat * 0.1)",
    "paceModifiers": {
      "conservative": 1.15,
      "steady": 1.0,
      "aggressive": 0.88
    },
    "fatigueSlowdownThreshold": 60,
    "energyBonkThreshold": 20,
    "bonkPaceMultiplier": 1.5,
    "energyDrainPerSegment": {
      "conservative": 8,
      "steady": 12,
      "aggressive": 18
    },
    "moraleDropPerSegment": 3,
    "dnfMoraleThreshold": 10
  },
  "progression": {
    "xpPerWorkout": 100,
    "xpPerRaceBase": [200, 400, 800, 1500],
    "xpPerPR": 500,
    "levelThresholds": [0, 500, 1200, 2500, 4500, 7500, 12000, 18000, 26000, 36000, 48000, 65000]
  },
  "training": {
    "workoutDurations": {
      "easy_run": 25000,
      "long_run": 45000,
      "intervals": 20000
    },
    "recoveryPerRestDay": 15
  }
}
```

---

## 10. Idle/Offline System

### Algorithm

When the player returns, compute what happened since `lastTickAt`:

1. Calculate elapsed real hours (capped at 8)
2. Convert to game days via time compression
3. Walk through each game day:
   - If planned workout is `easy_run` or `rest`: auto-complete at 50% efficiency
   - If planned workout is `long_run`, `intervals`, or other hard: substitute rest
4. Accumulate stat XP gains, fatigue changes, recovery
5. Show summary modal

### Summary Modal Content

```
While you were away (6h 23m):
━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Completed 2 easy runs (at 50% efficiency)
  Rested 1 day (skipped planned intervals)

  Endurance  +1.2
  Recovery   +0.6
  Fatigue    -12

  Your runner is feeling fresh.
```

---

## 11. Save System

### Three Layers

1. **Auto-save to localStorage** — every 30 seconds + on `beforeunload` + on significant state changes (workout complete, race finish, purchase). Player never thinks about it.

2. **Manual export** — Settings screen "Download Save" button → downloads `ultra-runner-save-YYYY-MM-DD.json`.

3. **Manual import** — Settings screen "Load Save" button → file picker → parse, validate version, migrate if needed, load.

### Migration System

```typescript
// state/migrations.ts

type Migration = (state: any) => any;

const migrations: Record<number, Migration> = {
  // version 1 → 2: added settings.tapFeedback
  2: (state) => ({
    ...state,
    version: 2,
    settings: { ...state.settings, tapFeedback: true },
  }),
  // version 2 → 3: renamed stat keys
  3: (state) => ({
    ...state,
    version: 3,
    // ... transform
  }),
};

export function migrate(state: any): GameState {
  let current = state;
  while (current.version < CURRENT_VERSION) {
    const next = current.version + 1;
    if (!migrations[next]) throw new Error(`No migration for v${next}`);
    current = migrations[next](current);
  }
  return current as GameState;
}
```

### Data Loss Warning

Settings screen displays: *"Your progress is saved in this browser. If you clear browser data, your save will be lost. Use Download Save to create a backup."*

---

## 12. Build & Deploy

### Vite Config

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

export default defineConfig({
  plugins: [preact()],
  base: "/ultra-runner/", // GitHub Pages serves from repo name
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
```

### GitHub Actions Deploy

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist
      - uses: actions/deploy-pages@v4
```

### NPM Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Push to `main` → builds → deploys to GitHub Pages. No manual steps.

---

## 13. Testing Strategy

### What to Test

**Priority 1 — Game math (must be correct):**
- `stats.ts`: `xpToStat` at known input values, `fitnessLevel` aggregation
- `training.ts`: Cadence scoring for all zones, stat gain formulas, fatigue accumulation
- `race.ts`: Segment time calculation, pace modifiers, fatigue curves, energy depletion
- `injury.ts`: Risk probability at various fatigue/shoe/mileage levels

**Priority 2 — Systems integration:**
- `idleCalculator.ts`: Multi-day simulation produces expected XP/fatigue deltas
- `economy.ts`: Prize calculations, purchase validation, insufficient funds
- `progression.ts`: Level thresholds, distance unlocks

**Priority 3 — Data integrity:**
- `migrations.ts`: Each migration transforms old schema to new correctly
- Data JSON files parse without errors

### What NOT to Test

- UI rendering (Preact components) — visual, not worth the overhead for MVP
- localStorage read/write — trust the browser
- CSS animations

### Test Runner

Vitest (Vite-native, same config, fast):

```typescript
// tests/stats.test.ts
import { describe, it, expect } from "vitest";
import { xpToStat } from "../src/systems/stats";

describe("xpToStat", () => {
  it("returns 1 for 0 XP", () => {
    expect(xpToStat(0)).toBeCloseTo(1, 0);
  });

  it("returns ~30 for 500 XP", () => {
    const val = xpToStat(500);
    expect(val).toBeGreaterThan(28);
    expect(val).toBeLessThan(32);
  });

  it("returns ~60 for 5000 XP", () => {
    const val = xpToStat(5000);
    expect(val).toBeGreaterThan(57);
    expect(val).toBeLessThan(63);
  });

  it("caps at 100", () => {
    expect(xpToStat(99999999)).toBe(100);
  });
});
```

---

## 14. Post-MVP Roadmap

### v2 — The Ultra Update

| Feature | Notes |
|---------|-------|
| Race tiers 5-7 (50K, 50mi, 100K) | New races in `races.json`, longer segment counts |
| Nutrition/fueling system | Glycogen model, bonking, GI distress, consumable items |
| Expanded gear | Hydration vests, accessories, headlamps, consumables shop |
| 2 more workout types | Tempo Run, Hill Repeats |
| Sponsorship system (Tier 1-2) | Local shop + regional brand |
| NPC rivals | Generated competitors that scale with you |
| Canvas runner animation | Replace CSS placeholder with actual sprite animation |
| Audio/SFX | Footstep sounds, tap feedback, ambient environment |

### v3 — The Endgame Update

| Feature | Notes |
|---------|-------|
| Race tiers 8-10 (100mi, 200+, Barkley) | Crew/pacer system, sleep deprivation, hallucinations |
| Barkley special mechanics | Application quest, navigation, loops, Taps bugle |
| Prestige / New Season | Retire runner, permanent bonuses, replay |
| Full injury spectrum | Moderate through Catastrophic |
| Overtraining system | Hidden meter with visible symptoms |
| Weather system | Randomized, affects race difficulty and gear choices |
| Hidden stats | Trail skill, heat/altitude adaptation, night running |
| Visual customization | Paper doll, gear appears on runner |
| Trophy case + shoe wall | Collection displays |
| Runner journal | Auto-generated narrative entries |
| Sponsorship tiers 3-4 | National brand, elite pro contract |

### v4+ — Polish & Community

| Feature | Notes |
|---------|-------|
| Achievements (full 200) | Mix of common and extremely rare |
| FKT side quests | Fastest known times on routes |
| Volunteering mechanic | Earn reputation, unlock race entries |
| Running club (local NPC) | Group training bonuses |
| Multiple save slots | Support multiple runners |
| Mobile optimization | Touch target sizing, gesture refinement |
| Accessibility | Screen reader support, reduced motion, color contrast |
