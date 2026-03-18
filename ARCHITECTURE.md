# Ultra Runner Simulator — Software Architecture

> **Version:** 0.1 (Draft)
> **Date:** 2026-03-17
> **Constraint:** Single-player, static site on GitHub Pages. Vanilla JS/HTML/CSS. No framework, no build step required.

---

## Table of Contents

1. [Module/Component Breakdown](#1-modulecomponent-breakdown)
2. [Game Loop Design](#2-game-loop-design)
3. [State Shape](#3-state-shape)
4. [Race Simulation Engine](#4-race-simulation-engine)
5. [Training System Architecture](#5-training-system-architecture)
6. [Idle Calculation on Load](#6-idle-calculation-on-load)
7. [Data Files](#7-data-files)
8. [File/Folder Structure](#8-filefolder-structure)
9. [UI Architecture](#9-ui-architecture)
10. [Testing Strategy](#10-testing-strategy)

---

## 1. Module/Component Breakdown

The codebase is organized into pure-logic modules (no DOM dependency) and UI modules (DOM-aware). This separation is the single most important architectural decision — it makes the game logic testable, portable, and easy to reason about.

### Core Engine (zero DOM dependencies)

| Module | Responsibility |
|--------|---------------|
| `engine/GameLoop.js` | Master tick. Calls update functions, manages delta time. |
| `engine/Clock.js` | Game-time tracking. Converts real seconds to in-game days/hours. Maps wall-clock to game calendar. |
| `engine/SaveManager.js` | Serialize state to JSON, write/read localStorage, export/import save files. |
| `engine/IdleCalculator.js` | On-load fast-forward: compute what happened while the player was away. |
| `engine/EventBus.js` | Pub/sub message bus. Decouples game systems from UI. |

### Game Systems (pure logic, no DOM)

| Module | Responsibility |
|--------|---------------|
| `systems/TrainingSystem.js` | Workout execution: input processing, cadence scoring, stat gain formulas, fatigue accumulation. |
| `systems/RaceEngine.js` | Segment-based race simulation: state machine, event resolution, pace/nutrition/morale calculations. |
| `systems/StatCalculator.js` | All stat math: logarithmic scaling, gain formulas, decay, caps, derived stats. |
| `systems/EconomySystem.js` | Money in/out, sponsorship ticks, purchase validation, gear durability tracking. |
| `systems/InjurySystem.js` | Injury risk rolls, severity escalation, recovery timers, overtraining detection. |
| `systems/NutritionSystem.js` | Race fueling: glycogen model, bonk threshold, GI distress, calorie balance. |
| `systems/ProgressionSystem.js` | XP/level calculations, unlock checks, prestige logic. |
| `systems/CalendarSystem.js` | Weekly training plan, race scheduling, season/weather rotation. |
| `systems/LootTableSystem.js` | Weighted random selection for race events, rewards, weather. |
| `systems/RivalSystem.js` | NPC rival generation, scaling, race placement simulation. |

### Data Layer

| Module | Responsibility |
|--------|---------------|
| `data/DataManager.js` | Loads and caches all JSON data files at startup. Provides lookup by ID. |
| `data/Balance.js` | Central tuning constants (XP curves, stat caps, fatigue rates, etc.). Imported by systems. |

### UI Layer (DOM-aware)

| Module | Responsibility |
|--------|---------------|
| `ui/ViewManager.js` | Screen routing. Shows/hides top-level views. Manages navigation state. |
| `ui/components/*.js` | Individual UI components (stat bars, cards, buttons, modals). Each owns a DOM element. |
| `ui/screens/*.js` | Full-screen views: Dashboard, Training, Race, Shop, Profile. Compose components. |
| `ui/Renderer.js` | Lightweight canvas renderer for the training/race runner animation (parallax scrolling, runner sprite). |

### Relationship Diagram

```
  [EventBus] <----> [UI Layer]
      ^                  |
      |            reads state
      v                  v
  [GameLoop] -----> [Game Systems] -----> [State]
      |                  ^
      v                  |
  [Clock]          [Data Layer]
      |
      v
  [SaveManager] <---> [localStorage]
```

The EventBus is the bridge. Game systems never touch the DOM. They mutate state and emit events. The UI subscribes to events and reads state to re-render. The UI emits user-action events that game systems consume.

---

## 2. Game Loop Design

### Architecture: Dual-loop with event bridge

The game has two distinct timing needs that coexist:

1. **A `requestAnimationFrame` loop** for visual updates (training animation, race animation, UI polish). Runs at display refresh rate. Does NOT drive game logic.
2. **A fixed-timestep logic tick** at 10 Hz (100ms intervals) for game state updates. This is deterministic and reproducible — critical for idle catch-up calculations.

The training tap mechanic needs immediate visual feedback (handled by rAF), but the actual stat calculation runs on the logic tick.

### Pseudocode

```js
// engine/GameLoop.js

const LOGIC_HZ = 10;
const LOGIC_DT = 1000 / LOGIC_HZ; // 100ms

let lastTime = 0;
let accumulator = 0;
let running = false;

function start() {
  running = true;
  lastTime = performance.now();
  requestAnimationFrame(frame);
}

function frame(now) {
  if (!running) return;

  const elapsed = Math.min(now - lastTime, 500); // clamp spiral-of-death
  lastTime = now;
  accumulator += elapsed;

  // Fixed-timestep logic updates
  while (accumulator >= LOGIC_DT) {
    logicTick(LOGIC_DT);
    accumulator -= LOGIC_DT;
  }

  // Variable-timestep render (interpolated)
  const alpha = accumulator / LOGIC_DT;
  renderTick(alpha);

  requestAnimationFrame(frame);
}

function logicTick(dt) {
  Clock.advance(dt);
  TrainingSystem.update(dt, state);
  RaceEngine.update(dt, state);
  InjurySystem.update(dt, state);
  EconomySystem.update(dt, state);
  CalendarSystem.update(dt, state);
  ProgressionSystem.update(dt, state);
  SaveManager.maybeAutoSave(state); // throttled, every 30s
}

function renderTick(alpha) {
  Renderer.draw(state, alpha);     // canvas animation
  UIManager.refresh(state);        // DOM updates (debounced internally)
}
```

### How active play and passive simulation coexist

| Mode | Logic Tick | Render Tick | Input |
|------|-----------|-------------|-------|
| **Dashboard/menus** | Calendar advances, idle gains accrue, recovery ticks | UI components refresh | Click navigation |
| **Active training** | Cadence scoring, fatigue, stat gains at 10 Hz | Runner animation at 60fps, floating numbers, effort meter | Taps/clicks fed to input buffer |
| **Active race** | Segment timer, event resolution, pace/nutrition model | Course animation, parallax, stat gauges | Pace/nutrition decisions per segment |
| **Idle (tab hidden)** | Paused — computed on return via IdleCalculator | None | None |

When the tab is hidden (`document.visibilitychange`), the loop pauses. On return, `IdleCalculator` handles the gap (see section 6).

---

## 3. State Shape

The entire game state is a single serializable object. No class instances, no circular references, no functions. Pure data. This is the save file.

```js
{
  "version": 3,                    // schema version for migrations
  "createdAt": 1710700000000,      // unix ms, first save
  "lastSavedAt": 1710700000000,    // unix ms, last save
  "lastTickAt": 1710700000000,     // unix ms, last logic tick (for idle calc)
  "settings": {
    "soundEnabled": true,
    "musicVolume": 0.5,
    "sfxVolume": 0.7,
    "tapFeedback": true,           // haptic/visual feedback on tap
    "autoSaveInterval": 30000      // ms
  },

  "runner": {
    "name": "Alex",
    "pronouns": "they/them",       // "he/him" | "she/her" | "they/them"
    "bodyType": 1,                 // 0-3, cosmetic index
    "appearance": {
      "skinTone": "#C68642",
      "hairStyle": 2,
      "hairColor": "#3B2F2F",
      "facialHair": 0,
      "faceType": 1
    },
    "backstory": "couch_to_5k",    // "couch_to_5k" | "former_athlete" | "hiker" | "stress_runner"
    "level": 14,
    "xp": 34200,
    "xpToNextLevel": 45000,
    "prestigeCount": 0,
    "prestigeBonuses": []          // ["recovery_5pct", "starter_gear_t2"]
  },

  "stats": {
    "primary": {
      "endurance":        { "value": 42.7, "trainingXp": 12340 },
      "speed":            { "value": 31.2, "trainingXp": 8900 },
      "vo2max":           { "value": 28.5, "trainingXp": 7200 },
      "lactateThreshold": { "value": 25.1, "trainingXp": 5600 },
      "climbingPower":    { "value": 18.3, "trainingXp": 3400 },
      "mentalToughness":  { "value": 35.8, "trainingXp": 9100 },
      "recoveryRate":     { "value": 30.0, "trainingXp": 6800 },
      "nutritionIQ":      { "value": 22.4, "trainingXp": 4100 }
    },
    "secondary": {
      "trailSkill":       12.0,
      "heatAdaptation":   5.0,      // 0-100, decays if not maintained
      "altitudeAdaptation": 0.0,
      "nightRunning":     3.0,
      "fatOxidation":     15.0,
      "runningEconomy":   20.0      // slow-building, improves with total miles
    }
  },

  "condition": {
    "fatigue":       35,            // 0-100, 0 = fresh, 100 = collapsed
    "morale":        72,            // 0-100
    "energy":        80,            // 0-100, glycogen proxy outside races
    "health":        90,            // 0-100, injury aggregate
    "overtraining":  12,            // 0-100, hidden-ish meter
    "restingHR":     62             // bpm, visual indicator of overtraining
  },

  "injuries": [
    {
      "id": "inj_001",
      "type": "shin_splints",
      "severity": "minor",         // "niggle" | "minor" | "moderate" | "severe" | "catastrophic"
      "bodyPart": "left_shin",
      "startedAt": 1710600000000,
      "recoveryDays": 5,
      "daysRemaining": 3,
      "performancePenalty": 0.15
    }
  ],

  "calendar": {
    "gameDay": 87,                  // days since game start
    "season": "summer",            // "spring" | "summer" | "fall" | "winter"
    "weekDay": 3,                  // 0=Mon, 6=Sun
    "trainingPlan": [
      { "day": 0, "workout": "easy_run" },
      { "day": 1, "workout": "intervals" },
      { "day": 2, "workout": "easy_run" },
      { "day": 3, "workout": "tempo_run" },
      { "day": 4, "workout": "rest" },
      { "day": 5, "workout": "long_run" },
      { "day": 6, "workout": "cross_training" }
    ],
    "scheduledRaces": [
      { "raceId": "rock_city_half", "gameDay": 95 }
    ]
  },

  "training": {
    "currentWorkout": null,         // null when not in a workout
    // When active:
    // {
    //   "workoutType": "intervals",
    //   "startedAt": 1710700000000,
    //   "duration": 30000,         // target ms
    //   "elapsed": 12400,
    //   "taps": 47,
    //   "cadenceHistory": [3.2, 3.1, 2.8, 3.4],  // taps/sec per window
    //   "effortMeter": 0.72,       // 0-1
    //   "sweetSpotHits": 14,       // taps within cadence zone
    //   "sweetSpotMisses": 8
    // }
    "weeklyMileage": 28.5,
    "previousWeekMileage": 26.0,
    "totalMiles": 412.3,
    "totalElevation": 24500,       // feet
    "streak": 12                   // consecutive days with activity
  },

  "race": {
    "active": null,                // null when not racing
    // When in a race:
    // {
    //   "raceId": "big_city_marathon",
    //   "startedAt": 1710700000000,
    //   "currentSegment": 4,
    //   "totalSegments": 8,
    //   "elapsedTime": 7200,       // race-seconds
    //   "position": 147,
    //   "totalRunners": 312,
    //   "glycogen": 1200,          // calories remaining
    //   "hydration": 85,           // 0-100
    //   "morale": 60,
    //   "fatigue": 55,
    //   "pacePerSegment": ["steady", "steady", "aggressive", "steady"],
    //   "segmentResults": [
    //     { "segment": 0, "time": 1620, "events": ["crowd_energy"], "statChanges": {} }
    //   ],
    //   "nutritionPlan": {
    //     "caloriesPerHour": 250,
    //     "fluidPerHour": 500,
    //     "electrolytesPerHour": 1
    //   },
    //   "loadout": { ... }        // snapshot of equipped gear at race start
    // }
  },

  "inventory": {
    "money": 2340,
    "equipment": {
      "shoes": [
        {
          "id": "shoe_001",
          "templateId": "cushioned_road",
          "durability": 280,        // miles remaining
          "maxDurability": 400,
          "equipped": true
        }
      ],
      "apparel": [
        { "id": "app_001", "templateId": "tech_tee", "equipped": true },
        { "id": "app_002", "templateId": "split_shorts", "equipped": true }
      ],
      "hydration": [
        { "id": "hyd_001", "templateId": "handheld_bottle", "equipped": true }
      ],
      "accessories": [
        { "id": "acc_001", "templateId": "gps_watch_t1", "equipped": true },
        { "id": "acc_002", "templateId": "foam_roller", "equipped": false }
      ]
    },
    "consumables": {
      "basic_gel": 8,
      "caffeine_gel": 3,
      "electrolyte_tabs": 12,
      "anti_chafe": 2,
      "blister_kit": 1,
      "pbj": 4
    },
    "cosmetics": {
      "unlockedHairStyles": [0, 1, 2, 3],
      "finisherShirts": ["park_run_5k", "bridge_run_10k"],
      "medals": ["park_run_5k"],
      "vanityLoadout": {
        "shirt": "finisher_park_run_5k",
        "shoes": null
      }
    }
  },

  "sponsorship": {
    "active": {
      "tier": 1,
      "sponsorId": "local_run_shop",
      "weeklyStipend": 150,
      "satisfaction": 72,          // 0-100
      "perks": ["gear_discount_10"],
      "requirements": ["wear_sponsor_gear"],
      "startedAt": 1710500000000
    },
    "history": []
  },

  "history": {
    "completedRaces": [
      {
        "raceId": "park_run_5k",
        "gameDay": 21,
        "finishTime": 1620,        // seconds
        "position": 45,
        "totalRunners": 120,
        "result": "finished",      // "finished" | "dnf" | "dns"
        "xpEarned": 500,
        "moneyEarned": 50,
        "personalBest": true,
        "conditions": { "weather": "clear", "temperature": 65 }
      }
    ],
    "personalBests": {
      "5k": 1620,
      "10k": null,
      "half_marathon": null,
      "marathon": null
    },
    "dnfJournal": [],
    "achievements": ["first_5k", "first_race", "week_streak_7"],
    "totalRacesFinished": 3,
    "totalRacesDNF": 0,
    "totalDaysPlayed": 87
  },

  "flags": {
    "tutorialComplete": true,
    "firstRaceComplete": true,
    "firstDNF": false,
    "barkleyLetterReceived": false,
    "barkleyAttempts": 0,
    "barkleyBestLoops": 0,
    "barkleyFinished": false,
    "unlockedDistances": ["5k", "10k", "half_marathon"],
    "unlockedWorkouts": ["easy_run", "long_run", "intervals", "tempo_run", "hill_repeats", "cross_training"],
    "seenEvents": ["tutorial_welcome", "first_race_intro"]
  }
}
```

### Key design decisions

- **`trainingXp` per stat**: The visible stat value is derived from trainingXp via the logarithmic curve. This means the curve is always consistent — we store the raw accumulated XP and compute the display value. This also makes idle catch-up trivial (add XP, recompute).
- **Equipment uses `templateId` + instance `id`**: Templates live in `gear.json`. Instances track mutable state (durability, equipped). You can own multiple pairs of the same shoe model.
- **Consumables are just counts**: No instance tracking needed. They are fungible.
- **`lastTickAt` for idle**: The gap between `lastTickAt` and `Date.now()` on load tells IdleCalculator exactly how much time to simulate.

---

## 4. Race Simulation Engine

### Architecture: Segment state machine with event queue

A race is a linear sequence of segments. Each segment is a discrete phase with inputs, random events, and outputs. The race engine is a state machine that advances one segment at a time, with the player making decisions between segments.

### State machine

```
[PRE_RACE] -> [SEGMENT_SETUP] -> [SEGMENT_RUNNING] -> [SEGMENT_RESOLVE]
                    ^                                        |
                    |                                        v
                    +--- [AID_STATION] <----+           [EVENT_CHECK]
                                            |                |
                                            +----------------+
                                                             |
                                                             v
                                                      [RACE_COMPLETE]
                                                        or [DNF]
```

### States

| State | What happens | Player action |
|-------|-------------|---------------|
| `PRE_RACE` | Validate loadout, snapshot gear, initialize race state, generate weather, seed RNG | Confirm start |
| `SEGMENT_SETUP` | Show upcoming terrain, distance, elevation. Present pace choice. | Choose pace (conservative/steady/aggressive) |
| `SEGMENT_RUNNING` | Timer runs. Stats are checked against terrain. Fatigue/glycogen/hydration tick. | Watch (auto-resolves over a few seconds with animation) |
| `EVENT_CHECK` | Roll for random events based on segment context. 0-2 events per segment. | Respond to event choices (A/B/C) |
| `SEGMENT_RESOLVE` | Compute segment time, update position, apply stat changes, check cutoffs. | View segment result |
| `AID_STATION` | Between segments (not every segment has one). Eat/drink/rest/change gear. Time vs recovery tradeoff. | Allocate time at aid station |
| `RACE_COMPLETE` | Tally results, compute rewards, update history. | View results |
| `DNF` | Record reason, partial rewards, recovery period. | View DNF summary |

### Event system

Events are drawn from `events.json` filtered by context:

```js
function rollEvents(segment, raceState, runnerState) {
  const candidates = Events.filter(e =>
    e.minDistance <= raceState.raceDistance &&
    e.terrainTypes.includes(segment.terrain) &&
    (e.weatherTrigger === null || e.weatherTrigger === raceState.weather) &&
    (e.minSegment <= raceState.currentSegment) &&
    (!e.requiresNight || segment.isNight) &&
    (!e.oncePerRace || !raceState.firedEvents.includes(e.id))
  );

  const events = [];
  for (const candidate of candidates) {
    // Base probability modified by relevant stats
    let prob = candidate.baseProbability;

    // Higher stats reduce negative event probability
    if (candidate.statCheck) {
      const statValue = runnerState.stats.primary[candidate.statCheck].value;
      prob *= (1 - statValue / 150); // stat 0 = full prob, stat 100 = 33% prob
    }

    // Fatigue increases event probability
    prob *= (1 + raceState.fatigue / 200);

    if (Math.random() < prob) {
      events.push(candidate);
      if (events.length >= 2) break; // max 2 events per segment
    }
  }
  return events;
}
```

### Segment time calculation

```js
function computeSegmentTime(segment, pace, raceState, stats, gear) {
  // Base pace from speed stat (minutes per mile)
  let basePace = 15 - (stats.speed.value * 0.1);  // stat 0 = 15:00/mi, stat 100 = 5:00/mi

  // Pace modifier
  const paceModifiers = { conservative: 1.15, steady: 1.0, aggressive: 0.88 };
  basePace *= paceModifiers[pace];

  // Terrain modifier
  const terrainTable = {
    flat_road:     1.0,
    rolling_hills: 1.08,
    steep_climb:   1.4 - (stats.climbingPower.value * 0.003),
    technical_descent: 1.2 - (stats.trailSkill * 0.004),
    mud:           1.25,
    sand:          1.35
  };
  basePace *= terrainTable[segment.terrain] || 1.0;

  // Gear bonuses
  for (const bonus of gear.activeBonuses) {
    if (bonus.type === 'speed' && bonus.terrain === segment.terrain) {
      basePace *= (1 - bonus.value);
    }
  }

  // Fatigue curve: exponential slowdown past 60% fatigue
  if (raceState.fatigue > 60) {
    basePace *= 1 + ((raceState.fatigue - 60) / 40) * 0.5;
  }

  // Bonk check: if glycogen < 200, dramatic slowdown
  if (raceState.glycogen < 200) {
    basePace *= 1.6; // survival shuffle
  }

  return basePace * segment.distanceMiles * 60; // seconds
}
```

### Deterministic RNG

The race engine uses a seeded PRNG (simple mulberry32) initialized from `raceId + gameDay`. This means replaying the same race on the same day with the same decisions produces the same result. This is important for save integrity and debugging.

```js
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
```

---

## 5. Training System Architecture

### Input pipeline

The tap mechanic needs to feel instant while the stat calculations run at a controlled rate. The solution is an input buffer that collects taps at full speed, and a scoring system that evaluates them on the logic tick.

```
[User taps] -> [InputBuffer] -> (on logic tick) -> [CadenceScorer] -> [StatGainCalculator] -> [State]
     |                                                                        |
     v                                                                        v
[Immediate visual feedback]                                          [EventBus: "stat_gained"]
  - ripple animation                                                          |
  - footstep sound                                                            v
  - runner stride                                                     [UI: floating +number]
```

### Input buffer

```js
// systems/TrainingInput.js

const tapBuffer = [];

function onTap(timestamp) {
  tapBuffer.push(timestamp);
  EventBus.emit('tap_visual');  // immediate visual feedback, no logic
}

function consumeTaps(windowMs) {
  const now = performance.now();
  const cutoff = now - windowMs;
  // Remove stale taps
  while (tapBuffer.length > 0 && tapBuffer[0] < cutoff) {
    tapBuffer.shift();
  }
  return tapBuffer.length;
}
```

### Cadence scoring (runs on logic tick, 10 Hz)

Each workout type has a target cadence zone (taps per second). The sweet spot is a range, not a single value.

```js
const CADENCE_ZONES = {
  easy_run:      { min: 1.5, sweet: [2.0, 2.8], max: 4.0 },
  long_run:      { min: 1.5, sweet: [2.0, 2.5], max: 3.5 },
  intervals:     { min: 2.5, sweet: [3.5, 4.5], max: 6.0 },
  tempo_run:     { min: 2.0, sweet: [2.8, 3.5], max: 4.5 },
  hill_repeats:  { min: 2.5, sweet: [3.2, 4.2], max: 5.5 },
  cross_training:{ min: 1.0, sweet: [1.5, 2.5], max: 3.5 },
  trail_run:     { min: 1.5, sweet: [2.2, 3.0], max: 4.0 }
};

function scoreCadence(tapsInWindow, windowSec, workoutType) {
  const cadence = tapsInWindow / windowSec;
  const zone = CADENCE_ZONES[workoutType];

  if (cadence < zone.min) {
    return { quality: 'undertrained', multiplier: 0.3, injuryRisk: 0.0 };
  }
  if (cadence >= zone.sweet[0] && cadence <= zone.sweet[1]) {
    return { quality: 'sweet_spot', multiplier: 1.0, injuryRisk: 0.02 };
  }
  if (cadence > zone.sweet[1] && cadence <= zone.max) {
    return { quality: 'hard', multiplier: 0.7, injuryRisk: 0.08 };
  }
  if (cadence > zone.max) {
    return { quality: 'overtrained', multiplier: 0.4, injuryRisk: 0.15 };
  }
  // Between min and sweet[0]
  return { quality: 'easy', multiplier: 0.6, injuryRisk: 0.01 };
}
```

### Stat gain formula

```js
function computeStatGain(workoutType, cadenceResult, currentStatXp, workoutDuration, fatigue) {
  const workout = WORKOUT_DATA[workoutType];

  // Base XP per tick (100ms)
  let xpGain = workout.baseXpPerTick;

  // Cadence quality multiplier
  xpGain *= cadenceResult.multiplier;

  // Fatigue penalty: gains drop as fatigue rises
  xpGain *= Math.max(0.2, 1 - (fatigue / 150));

  // Diminishing returns: higher stat XP means smaller relative gains
  // This is automatic because statValue = log(trainingXp), so linear XP
  // additions produce logarithmic stat growth.

  return xpGain;
}

// Convert accumulated XP to display stat (1-100)
function xpToStat(xp) {
  // Tuned so: 0 XP = 1, ~500 XP = 30, ~5000 XP = 60, ~50000 XP = 85, ~500000 XP = 100
  return Math.min(100, 1 + 14.2 * Math.log10(1 + xp));
}
```

### Fatigue accumulation

```js
function accumulateFatigue(workoutType, cadenceResult, currentFatigue, recoveryRate) {
  const workout = WORKOUT_DATA[workoutType];
  let fatigueDelta = workout.baseFatiguePerTick;

  // Harder effort = more fatigue
  if (cadenceResult.quality === 'hard') fatigueDelta *= 1.5;
  if (cadenceResult.quality === 'overtrained') fatigueDelta *= 2.5;

  // Recovery rate stat reduces fatigue accumulation slightly
  fatigueDelta *= Math.max(0.5, 1 - recoveryRate / 200);

  return Math.min(100, currentFatigue + fatigueDelta);
}
```

### Visual feedback pipeline (runs on rAF)

Each tap triggers immediate visual/audio feedback independent of the logic tick:

1. **Ripple effect** on the tap zone (CSS animation, reuse a pool of elements)
2. **Footstep sound** (AudioContext, preloaded buffer, play immediately)
3. **Runner stride** advance (canvas: move runner sprite forward one step)
4. **Cadence ring pulse** (the ring expands/contracts to show tap rhythm)

On the logic tick, when stat gains are calculated:
5. **Floating "+0.3 Endurance"** numbers (DOM elements, animated up and faded)
6. **Effort meter fill** (CSS width transition, smooth)
7. **Cadence zone indicator color** (green = sweet spot, yellow = easy/hard, red = over)

---

## 6. Idle Calculation on Load

### The problem

When the player returns after N hours, we need to simulate what happened. But we cannot run N hours of real-time logic ticks — that would take too long and block the UI.

### The solution: analytical fast-forward

Instead of simulating every tick, we compute the aggregate result mathematically. This works because idle training is simplified (no player input, fixed cadence quality of "easy").

### Algorithm

```js
// engine/IdleCalculator.js

const MAX_IDLE_HOURS = 8;
const IDLE_EFFICIENCY = 0.5;          // 50% of active training gains (configurable 40-60%)
const GAME_HOURS_PER_REAL_HOUR = 4;   // time compression ratio

function computeIdleGains(state, nowMs) {
  const elapsedMs = nowMs - state.lastTickAt;
  const elapsedHours = Math.min(elapsedMs / 3600000, MAX_IDLE_HOURS);

  if (elapsedHours < 0.01) return null; // less than 36 seconds, skip

  const gameHoursElapsed = elapsedHours * GAME_HOURS_PER_REAL_HOUR;
  const gameDaysElapsed = Math.floor(gameHoursElapsed / 24);
  const results = {
    realHoursAway: elapsedHours,
    gameDaysAdvanced: gameDaysElapsed,
    workoutsCompleted: [],
    statGains: {},
    fatigueChange: 0,
    moneyEarned: 0,
    idleCapped: elapsedMs / 3600000 > MAX_IDLE_HOURS
  };

  // Walk through each game day that passed
  let fatigue = state.condition.fatigue;

  for (let d = 0; d < gameDaysElapsed; d++) {
    const dayOfWeek = (state.calendar.weekDay + d) % 7;
    const planned = state.calendar.trainingPlan[dayOfWeek];

    // Idle only auto-completes easy workouts and rest
    const idleWorkouts = ['easy_run', 'cross_training', 'rest'];
    if (idleWorkouts.includes(planned.workout)) {
      if (planned.workout === 'rest') {
        // Recovery: reduce fatigue
        const recoveryAmount = 15 + (state.stats.primary.recoveryRate.value * 0.2);
        fatigue = Math.max(0, fatigue - recoveryAmount);
      } else {
        // Easy workout at idle efficiency
        const workout = WORKOUT_DATA[planned.workout];
        const xpGain = workout.baseXpPerDay * IDLE_EFFICIENCY;

        // Distribute XP to the workout's target stats
        for (const [statKey, ratio] of Object.entries(workout.statDistribution)) {
          results.statGains[statKey] = (results.statGains[statKey] || 0) + xpGain * ratio;
        }

        fatigue = Math.min(100, fatigue + workout.dailyFatigueCost * 0.7);
        results.workoutsCompleted.push({
          day: d,
          type: planned.workout,
          efficiency: IDLE_EFFICIENCY
        });
      }
    } else {
      // Hard workout skipped — runner rests instead
      fatigue = Math.max(0, fatigue - 8);
      results.workoutsCompleted.push({
        day: d,
        type: 'rest_substituted',
        originalPlan: planned.workout
      });
    }
  }

  // Sponsorship income
  if (state.sponsorship.active) {
    const weeksAway = elapsedHours / 168;
    results.moneyEarned = Math.floor(state.sponsorship.active.weeklyStipend * weeksAway);
  }

  // Natural recovery for any remaining partial day
  const partialDayHours = gameHoursElapsed - (gameDaysElapsed * 24);
  fatigue = Math.max(0, fatigue - (partialDayHours * 0.5));

  results.fatigueChange = fatigue - state.condition.fatigue;

  return results;
}
```

### Applying idle results

```js
function applyIdleResults(state, results) {
  // Apply stat XP gains
  for (const [statKey, xpGain] of Object.entries(results.statGains)) {
    state.stats.primary[statKey].trainingXp += xpGain;
    state.stats.primary[statKey].value = xpToStat(state.stats.primary[statKey].trainingXp);
  }

  // Apply fatigue change
  state.condition.fatigue = Math.max(0, Math.min(100,
    state.condition.fatigue + results.fatigueChange
  ));

  // Apply money
  state.inventory.money += results.moneyEarned;

  // Advance calendar
  state.calendar.gameDay += results.gameDaysAdvanced;
  state.calendar.weekDay = (state.calendar.weekDay + results.gameDaysAdvanced) % 7;
  state.calendar.season = computeSeason(state.calendar.gameDay);

  // Advance injury recovery
  for (const injury of state.injuries) {
    injury.daysRemaining = Math.max(0, injury.daysRemaining - results.gameDaysAdvanced);
  }
  state.injuries = state.injuries.filter(i => i.daysRemaining > 0);

  // Update training mileage
  for (const w of results.workoutsCompleted) {
    if (w.type !== 'rest' && w.type !== 'rest_substituted') {
      state.training.weeklyMileage += WORKOUT_DATA[w.type].avgMiles * IDLE_EFFICIENCY;
      state.training.totalMiles += WORKOUT_DATA[w.type].avgMiles * IDLE_EFFICIENCY;
    }
  }

  // Update timestamp
  state.lastTickAt = Date.now();
}
```

### UI on return

Show a "Welcome Back" modal with the summary:
- "You were away for 6 hours (3 game days)"
- "Your runner completed 2 easy runs and 1 rest day"
- Stat gains listed with bar animations
- Money earned
- Any injury recovery progress
- "Your runner is rested and ready to train" or "Your runner is still fatigued"

---

## 7. Data Files

All balance data lives in JSON files. The game loads these at startup. They are never mutated at runtime — they are reference data.

### `data/races.json`

```json
[
  {
    "id": "park_run_5k",
    "name": "Park Run 5K",
    "distance": 5,
    "distanceUnit": "km",
    "tier": 1,
    "unlockLevel": 1,
    "entryFee": 25,
    "terrain": "flat_road",
    "elevation": 50,
    "segments": 3,
    "segmentData": [
      { "terrain": "flat_road", "distanceMi": 1.0, "elevation": 20, "hasAidStation": false },
      { "terrain": "flat_road", "distanceMi": 1.0, "elevation": 15, "hasAidStation": false },
      { "terrain": "flat_road", "distanceMi": 1.1, "elevation": 15, "hasAidStation": false }
    ],
    "requiredGear": [],
    "optionalGear": [],
    "prizeMoney": { "1st": 100, "2nd": 50, "3rd": 25, "finisher": 0 },
    "xpReward": 500,
    "reputationReward": 10,
    "recoveryDays": 1,
    "vibe": "party",
    "description": "A friendly community run through the park. Costumes encouraged.",
    "cutoffMinutes": null,
    "hasNightSection": false,
    "hasCrew": false,
    "hasPacer": false,
    "season": ["spring", "summer", "fall"],
    "weatherWeights": { "clear": 0.5, "cloudy": 0.3, "rain": 0.15, "wind": 0.05 },
    "qualificationRequired": null,
    "lotteryEntry": false,
    "isIconic": false
  },
  {
    "id": "western_states_100",
    "name": "Western States 100",
    "distance": 100,
    "distanceUnit": "mi",
    "tier": 8,
    "unlockLevel": 33,
    "entryFee": 450,
    "terrain": "mixed_trail",
    "elevation": 40000,
    "segments": 22,
    "segmentData": [
      { "terrain": "steep_climb", "distanceMi": 4.5, "elevation": 2500, "hasAidStation": true, "name": "Escarpment" },
      { "terrain": "technical_descent", "distanceMi": 5.0, "elevation": -3000, "hasAidStation": false },
      "..."
    ],
    "requiredGear": ["headlamp", "emergency_blanket", "rain_jacket"],
    "optionalGear": ["trekking_poles", "extra_batteries"],
    "prizeMoney": { "1st": 10000, "2nd": 5000, "3rd": 2500, "finisher": 0 },
    "xpReward": 15000,
    "reputationReward": 500,
    "recoveryDays": 21,
    "vibe": "reverence",
    "description": "The original 100-miler. 100 miles through the Sierra Nevada, from Squaw Valley to Auburn.",
    "cutoffMinutes": 1800,
    "hasNightSection": true,
    "hasCrew": true,
    "hasPacer": true,
    "season": ["summer"],
    "weatherWeights": { "clear": 0.3, "hot": 0.4, "very_hot": 0.2, "thunderstorm": 0.1 },
    "qualificationRequired": { "type": "qualifying_race", "distance": 100, "unit": "km" },
    "lotteryEntry": true,
    "lotteryOdds": 0.10,
    "isIconic": true,
    "specialReward": "silver_buckle_sub24"
  }
]
```

### `data/gear.json`

```json
{
  "shoes": [
    {
      "id": "basic_trainers",
      "name": "Basic Trainers",
      "tier": 1,
      "unlockLevel": 1,
      "cost": 80,
      "durability": 300,
      "weight": 10,
      "bonuses": [],
      "terrain": "road",
      "description": "Your first pair. They get the job done."
    },
    {
      "id": "carbon_racer",
      "name": "Carbon Racer",
      "tier": 4,
      "unlockLevel": 12,
      "cost": 250,
      "durability": 150,
      "weight": 7,
      "bonuses": [
        { "type": "speed", "terrain": "flat_road", "value": 0.08 },
        { "type": "speed", "terrain": "rolling_hills", "value": 0.04 }
      ],
      "terrain": "road",
      "description": "Carbon-plated super shoe. Fast on roads, fragile everywhere."
    }
  ],
  "apparel": [
    {
      "id": "tech_tee",
      "name": "Tech Tee",
      "slot": "shirt",
      "tier": 1,
      "unlockLevel": 1,
      "cost": 40,
      "bonuses": [{ "type": "chafe_resistance", "value": 0.1 }],
      "weatherRating": { "heat": 0.8, "cold": 0.3, "rain": 0.4 },
      "description": "Moisture-wicking. A huge upgrade from cotton."
    }
  ],
  "hydration": [
    {
      "id": "handheld_bottle",
      "name": "Handheld Bottle",
      "tier": 1,
      "unlockLevel": 1,
      "cost": 25,
      "capacity": 500,
      "speedPenalty": 0.0,
      "description": "500ml soft flask. Light and simple."
    },
    {
      "id": "hydration_vest_large",
      "name": "Hydration Vest (Large)",
      "tier": 3,
      "unlockLevel": 20,
      "cost": 180,
      "capacity": 2000,
      "speedPenalty": 0.02,
      "nutritionSlots": 8,
      "description": "2L capacity. Room for gels, food, layers. The ultra workhorse."
    }
  ],
  "accessories": [
    {
      "id": "gps_watch_t1",
      "name": "Basic GPS Watch",
      "tier": 1,
      "unlockLevel": 1,
      "cost": 100,
      "bonuses": [{ "type": "pace_accuracy", "value": 0.6 }],
      "description": "Shows pace and distance. A game changer."
    },
    {
      "id": "headlamp_t2",
      "name": "Trail Headlamp",
      "tier": 2,
      "unlockLevel": 15,
      "cost": 80,
      "bonuses": [
        { "type": "night_speed", "value": 0.85 },
        { "type": "fall_resistance", "value": 0.15 }
      ],
      "batteryHours": 12,
      "description": "400 lumens. Enough to run trails at night without faceplanting."
    },
    {
      "id": "trekking_poles",
      "name": "Trekking Poles",
      "tier": 2,
      "unlockLevel": 18,
      "cost": 120,
      "bonuses": [
        { "type": "climbing_efficiency", "value": 0.20 },
        { "type": "speed", "terrain": "flat_road", "value": -0.05 }
      ],
      "description": "Carbon poles. Essential for mountain ultras."
    },
    {
      "id": "foam_roller",
      "name": "Foam Roller",
      "tier": 1,
      "unlockLevel": 3,
      "cost": 30,
      "bonuses": [{ "type": "passive_recovery", "value": 0.10 }],
      "description": "Hurts so good."
    }
  ]
}
```

### `data/consumables.json`

```json
[
  {
    "id": "basic_gel",
    "name": "Energy Gel",
    "category": "gel",
    "cost": 2,
    "unlockLevel": 1,
    "calories": 100,
    "caffeineBoost": 0,
    "giRisk": 0.05,
    "eatTime": 5,
    "description": "100 calories of quick energy. Don't forget to chase it with water."
  },
  {
    "id": "caffeine_gel",
    "name": "Caffeinated Gel",
    "category": "gel",
    "cost": 3,
    "unlockLevel": 8,
    "calories": 100,
    "caffeineBoost": 0.08,
    "giRisk": 0.08,
    "eatTime": 5,
    "description": "Same gel, plus a caffeine kick. Use strategically."
  },
  {
    "id": "pbj",
    "name": "PB&J Sandwich",
    "category": "real_food",
    "cost": 1,
    "unlockLevel": 12,
    "calories": 350,
    "caffeineBoost": 0,
    "giRisk": 0.02,
    "eatTime": 45,
    "description": "The ultra classic. High calories, easy on the stomach, takes a while to eat."
  },
  {
    "id": "flat_coke",
    "name": "Flat Coca-Cola",
    "category": "real_food",
    "cost": 1,
    "unlockLevel": 18,
    "calories": 140,
    "caffeineBoost": 0.10,
    "giRisk": 0.01,
    "eatTime": 15,
    "bonusAfterMile": 50,
    "bonusEffect": { "type": "morale_boost", "value": 15 },
    "description": "The magic elixir. Flat Coke at mile 70 is a religious experience."
  },
  {
    "id": "electrolyte_tabs",
    "name": "Electrolyte Tablets",
    "category": "electrolyte",
    "cost": 1,
    "unlockLevel": 5,
    "calories": 10,
    "electrolyteBenefit": 0.15,
    "giRisk": 0.01,
    "eatTime": 2,
    "description": "Drop in water. Prevents the cramps."
  },
  {
    "id": "anti_chafe",
    "name": "Anti-Chafe Balm",
    "category": "medical",
    "cost": 5,
    "unlockLevel": 3,
    "chafeProtectionSegments": 8,
    "description": "Apply liberally. Everywhere. Trust us."
  },
  {
    "id": "blister_kit",
    "name": "Blister Kit",
    "category": "medical",
    "cost": 8,
    "unlockLevel": 10,
    "blisterTreatmentTime": 120,
    "blisterHealPercent": 0.8,
    "description": "Tape, needle, antiseptic. Aid station surgery."
  },
  {
    "id": "ibuprofen",
    "name": "Ibuprofen",
    "category": "medical",
    "cost": 2,
    "unlockLevel": 5,
    "painReduction": 0.5,
    "injuryMaskingRisk": 0.3,
    "durationSegments": 4,
    "description": "Reduces pain. Also reduces your ability to notice when something is actually wrong."
  }
]
```

### `data/events.json`

```json
[
  {
    "id": "stomach_rebellion",
    "name": "Stomach Trouble",
    "description": "Your stomach is rebelling.",
    "baseProbability": 0.15,
    "statCheck": "nutritionIQ",
    "terrainTypes": ["flat_road", "rolling_hills", "steep_climb"],
    "weatherTrigger": null,
    "minDistance": 42,
    "minSegment": 3,
    "requiresNight": false,
    "oncePerRace": false,
    "choices": [
      {
        "label": "Slow down and sip ginger ale",
        "effects": { "timePenalty": 180, "giRecovery": 0.6 },
        "description": "You walk for a bit, sipping slowly. The nausea fades."
      },
      {
        "label": "Push through",
        "effects": { "timePenalty": 0, "giWorsen": 0.4, "moralePenalty": 10 },
        "statCheck": { "stat": "mentalToughness", "threshold": 50 },
        "successDescription": "You grit your teeth and keep moving. It passes.",
        "failDescription": "Bad call. You're doubled over on the trail."
      },
      {
        "label": "Walk for a segment",
        "effects": { "timePenalty": 600, "giRecovery": 0.9, "fatigueRecovery": 5 },
        "description": "Smart choice. You walk, eat some crackers, and the world rights itself."
      }
    ]
  },
  {
    "id": "the_wall",
    "name": "The Wall",
    "description": "You've hit the wall.",
    "baseProbability": 0.8,
    "statCheck": "mentalToughness",
    "terrainTypes": ["flat_road", "rolling_hills"],
    "weatherTrigger": null,
    "minDistance": 32,
    "minSegment": 5,
    "requiresNight": false,
    "oncePerRace": true,
    "triggerCondition": { "glycogenBelow": 500 },
    "choices": [
      {
        "label": "Dig deep",
        "effects": { "moralePenalty": 15, "mentalToughnessXp": 50 },
        "statCheck": { "stat": "mentalToughness", "threshold": 40 },
        "successDescription": "The wall crumbles. You find another gear.",
        "failDescription": "The wall wins this round. Everything slows to a shuffle."
      },
      {
        "label": "Eat everything at the next aid station",
        "effects": { "timePenalty": 300, "glycogenRestore": 400, "moraleRestore": 10 },
        "description": "Coke, broth, potatoes. You eat like it's Thanksgiving."
      }
    ]
  },
  {
    "id": "muddy_trail",
    "name": "Trail Turned to Mud",
    "description": "Rain has turned the trail to mud.",
    "baseProbability": 0.6,
    "statCheck": null,
    "terrainTypes": ["technical_descent", "steep_climb"],
    "weatherTrigger": "rain",
    "minDistance": 0,
    "minSegment": 0,
    "requiresNight": false,
    "oncePerRace": false,
    "autoResolve": true,
    "effects": {
      "speedPenalty": 0.15,
      "gearCheck": { "slot": "shoes", "terrain": "trail", "mitigates": 0.10 }
    },
    "description": "Your shoes are caked. Every step is a negotiation with gravity."
  },
  {
    "id": "hot_spot",
    "name": "Hot Spot on Your Foot",
    "description": "You feel a hot spot forming on your left foot.",
    "baseProbability": 0.12,
    "statCheck": null,
    "terrainTypes": ["flat_road", "rolling_hills", "steep_climb", "technical_descent"],
    "weatherTrigger": null,
    "minDistance": 20,
    "minSegment": 2,
    "requiresNight": false,
    "oncePerRace": true,
    "choices": [
      {
        "label": "Stop and tape it now",
        "effects": { "timePenalty": 30, "blisterPrevented": true },
        "description": "Thirty seconds well spent. Crisis averted."
      },
      {
        "label": "Ignore it and keep running",
        "effects": { "blisterRisk": 0.7, "blisterPenalty": { "speedPenalty": 0.08, "moralePenalty": 10 } },
        "description": "You tell yourself it's fine. It might not be fine."
      }
    ]
  },
  {
    "id": "night_section",
    "name": "Darkness Falls",
    "description": "The sun has set. The trail disappears into shadow.",
    "baseProbability": 1.0,
    "statCheck": null,
    "terrainTypes": ["steep_climb", "technical_descent", "rolling_hills"],
    "weatherTrigger": null,
    "minDistance": 50,
    "minSegment": 0,
    "requiresNight": true,
    "oncePerRace": false,
    "autoResolve": true,
    "effects": {
      "speedPenalty": 0.20,
      "gearCheck": { "slot": "headlamp", "mitigates": 0.15 },
      "statCheck": { "stat": "nightRunning", "mitigatesPerPoint": 0.002 }
    },
    "description": "Your world shrinks to the cone of your headlamp."
  },
  {
    "id": "fellow_runner_struggling",
    "name": "A Runner Needs Help",
    "description": "A fellow runner is sitting on a rock, looking lost.",
    "baseProbability": 0.08,
    "statCheck": null,
    "terrainTypes": ["steep_climb", "technical_descent", "rolling_hills"],
    "weatherTrigger": null,
    "minDistance": 50,
    "minSegment": 5,
    "requiresNight": false,
    "oncePerRace": true,
    "choices": [
      {
        "label": "Stop and help",
        "effects": { "timePenalty": 300, "mentalToughnessXp": 100, "moraleRestore": 15, "reputationBonus": 25 },
        "description": "You sit with them, share some food, help them find their resolve. The ultra community takes care of its own."
      },
      {
        "label": "Encourage them as you pass",
        "effects": { "timePenalty": 15, "mentalToughnessXp": 20, "moraleRestore": 5 },
        "description": "'You've got this!' you shout. They nod. It's something."
      }
    ]
  }
]
```

### `data/workouts.json`

```json
[
  {
    "id": "easy_run",
    "name": "Easy Run",
    "description": "Conversational pace. The bread and butter of training.",
    "duration": 30000,
    "avgMiles": 4,
    "baseFatiguePerTick": 0.02,
    "dailyFatigueCost": 8,
    "baseXpPerTick": 1.0,
    "baseXpPerDay": 100,
    "injuryRiskBase": 0.005,
    "statDistribution": {
      "endurance": 0.6,
      "speed": 0.1,
      "recoveryRate": 0.2,
      "runningEconomy": 0.1
    },
    "idleEligible": true,
    "unlockLevel": 1,
    "intensityCategory": "easy"
  },
  {
    "id": "long_run",
    "name": "Long Run",
    "description": "The weekly big one. Build your endurance ceiling.",
    "duration": 60000,
    "avgMiles": 10,
    "baseFatiguePerTick": 0.04,
    "dailyFatigueCost": 25,
    "baseXpPerTick": 1.5,
    "baseXpPerDay": 200,
    "injuryRiskBase": 0.015,
    "statDistribution": {
      "endurance": 0.5,
      "mentalToughness": 0.2,
      "fatOxidation": 0.15,
      "runningEconomy": 0.15
    },
    "idleEligible": false,
    "unlockLevel": 1,
    "intensityCategory": "moderate"
  },
  {
    "id": "intervals",
    "name": "Intervals",
    "description": "Hard effort, recovery, repeat. Builds speed and VO2 max.",
    "duration": 25000,
    "avgMiles": 5,
    "baseFatiguePerTick": 0.06,
    "dailyFatigueCost": 22,
    "baseXpPerTick": 2.0,
    "baseXpPerDay": 180,
    "injuryRiskBase": 0.025,
    "statDistribution": {
      "speed": 0.4,
      "vo2max": 0.4,
      "lactateThreshold": 0.1,
      "mentalToughness": 0.1
    },
    "idleEligible": false,
    "unlockLevel": 3,
    "intensityCategory": "hard"
  },
  {
    "id": "tempo_run",
    "name": "Tempo Run",
    "description": "Comfortably hard. The pace you dread but need.",
    "duration": 35000,
    "avgMiles": 6,
    "baseFatiguePerTick": 0.05,
    "dailyFatigueCost": 20,
    "baseXpPerTick": 1.8,
    "baseXpPerDay": 170,
    "injuryRiskBase": 0.018,
    "statDistribution": {
      "lactateThreshold": 0.5,
      "speed": 0.2,
      "endurance": 0.2,
      "mentalToughness": 0.1
    },
    "idleEligible": false,
    "unlockLevel": 5,
    "intensityCategory": "hard"
  },
  {
    "id": "hill_repeats",
    "name": "Hill Repeats",
    "description": "Up. Down. Up. Down. Your legs will thank you later. Much later.",
    "duration": 30000,
    "avgMiles": 4,
    "baseFatiguePerTick": 0.055,
    "dailyFatigueCost": 20,
    "baseXpPerTick": 1.8,
    "baseXpPerDay": 160,
    "injuryRiskBase": 0.02,
    "statDistribution": {
      "climbingPower": 0.5,
      "speed": 0.15,
      "mentalToughness": 0.15,
      "endurance": 0.2
    },
    "idleEligible": false,
    "unlockLevel": 7,
    "intensityCategory": "hard"
  },
  {
    "id": "cross_training",
    "name": "Cross-Training",
    "description": "Cycling, swimming, yoga. Active recovery that builds resilience.",
    "duration": 25000,
    "avgMiles": 0,
    "baseFatiguePerTick": 0.01,
    "dailyFatigueCost": 5,
    "baseXpPerTick": 0.8,
    "baseXpPerDay": 80,
    "injuryRiskBase": 0.002,
    "statDistribution": {
      "recoveryRate": 0.5,
      "endurance": 0.2,
      "climbingPower": 0.1,
      "runningEconomy": 0.2
    },
    "idleEligible": true,
    "unlockLevel": 2,
    "intensityCategory": "easy"
  },
  {
    "id": "trail_run",
    "name": "Trail Run",
    "description": "Roots, rocks, and uneven ground. Builds the skills road running can't.",
    "duration": 40000,
    "avgMiles": 5,
    "baseFatiguePerTick": 0.04,
    "dailyFatigueCost": 18,
    "baseXpPerTick": 1.5,
    "baseXpPerDay": 150,
    "injuryRiskBase": 0.02,
    "statDistribution": {
      "trailSkill": 0.4,
      "endurance": 0.2,
      "climbingPower": 0.2,
      "mentalToughness": 0.2
    },
    "idleEligible": false,
    "unlockLevel": 5,
    "intensityCategory": "moderate"
  },
  {
    "id": "rest",
    "name": "Rest Day",
    "description": "Rest is training. Your body rebuilds stronger.",
    "duration": 0,
    "avgMiles": 0,
    "baseFatiguePerTick": 0,
    "dailyFatigueCost": -15,
    "baseXpPerTick": 0,
    "baseXpPerDay": 0,
    "injuryRiskBase": 0,
    "statDistribution": {},
    "idleEligible": true,
    "unlockLevel": 1,
    "intensityCategory": "rest"
  }
]
```

### `data/injuries.json`

```json
[
  {
    "id": "shin_splints",
    "name": "Shin Splints",
    "bodyPart": "lower_leg",
    "severity": "minor",
    "performancePenalty": 0.15,
    "recoveryDays": [3, 7],
    "escalatesTo": "stress_fracture_tibia",
    "escalationProbability": 0.15,
    "riskFactors": {
      "highMileageIncrease": 0.4,
      "wornShoes": 0.3,
      "beginnerLevel": 0.3
    },
    "description": "The classic beginner injury. That tight, achy feeling along your shins.",
    "flavorText": "You feel a dull throb with every footstrike. This is your body asking you to slow down."
  },
  {
    "id": "it_band_syndrome",
    "name": "IT Band Syndrome",
    "bodyPart": "knee",
    "severity": "moderate",
    "performancePenalty": 0.30,
    "recoveryDays": [14, 28],
    "escalatesTo": null,
    "escalationProbability": 0,
    "riskFactors": {
      "excessiveDownhill": 0.4,
      "highMileage": 0.3,
      "overtraining": 0.3
    },
    "description": "Outside knee pain that starts mild and becomes a screaming veto on running.",
    "flavorText": "It started as a whisper at mile 4. By mile 6 it was a shout. By mile 8 you were walking."
  },
  {
    "id": "plantar_fasciitis",
    "name": "Plantar Fasciitis",
    "bodyPart": "foot",
    "severity": "moderate",
    "performancePenalty": 0.25,
    "recoveryDays": [14, 42],
    "escalatesTo": null,
    "escalationProbability": 0,
    "riskFactors": {
      "highMileage": 0.3,
      "wornShoes": 0.4,
      "hardSurfaces": 0.3
    },
    "description": "The 'limp out of bed' injury. Stabbing pain in the bottom of your foot.",
    "flavorText": "Every morning you take your first step and wince. It loosens up after a few minutes. It always comes back."
  },
  {
    "id": "stress_fracture_tibia",
    "name": "Stress Fracture (Tibia)",
    "bodyPart": "lower_leg",
    "severity": "severe",
    "performancePenalty": 1.0,
    "recoveryDays": [42, 84],
    "escalatesTo": null,
    "escalationProbability": 0,
    "riskFactors": {
      "ignoredNiggle": 0.5,
      "overtraining": 0.3,
      "wornShoes": 0.2
    },
    "description": "A tiny crack in the bone. Season over. The price of ignoring the warning signs.",
    "flavorText": "The MRI confirms it. Six to twelve weeks. No running. You stare at your shoes by the door."
  },
  {
    "id": "ankle_sprain",
    "name": "Ankle Sprain",
    "bodyPart": "ankle",
    "severity": "minor",
    "performancePenalty": 0.20,
    "recoveryDays": [5, 14],
    "escalatesTo": null,
    "escalationProbability": 0,
    "riskFactors": {
      "technicalTerrain": 0.5,
      "fatigue": 0.3,
      "nightRunning": 0.2
    },
    "description": "Your ankle rolls on a rock. Trail running's most common acute injury.",
    "flavorText": "One wrong step on a root. You hear the pop before you feel it."
  },
  {
    "id": "blisters",
    "name": "Blisters",
    "bodyPart": "foot",
    "severity": "niggle",
    "performancePenalty": 0.08,
    "recoveryDays": [1, 3],
    "escalatesTo": null,
    "escalationProbability": 0,
    "riskFactors": {
      "wetConditions": 0.3,
      "longDistance": 0.3,
      "poorSockChoice": 0.2,
      "noAntiChafe": 0.2
    },
    "description": "The ultrarunner's nemesis. Fluid-filled badges of suffering.",
    "flavorText": "You should have applied the lube. You knew you should have applied the lube."
  }
]
```

### `data/balance.json`

```json
{
  "time": {
    "gameHoursPerRealHour": 4,
    "logicTickMs": 100,
    "autoSaveIntervalMs": 30000,
    "maxIdleHours": 8,
    "idleEfficiency": 0.5,
    "seasonLengthDays": 90
  },
  "stats": {
    "xpToStatFormula": "1 + 14.2 * log10(1 + xp)",
    "maxStatValue": 100,
    "decayRatePerDay": 0.001,
    "backstoryBonuses": {
      "couch_to_5k":    { "xpMultiplierBelow30": 1.2 },
      "former_athlete": { "startingEndurance": 5, "startingSpeed": 3 },
      "hiker":          { "startingTrailSkill": 5, "startingClimbingPower": 3 },
      "stress_runner":  { "startingRecoveryRate": 5 }
    }
  },
  "training": {
    "maxFatigue": 100,
    "fatigueRecoveryPerRestDay": 15,
    "fatigueRecoveryPerHour": 0.5,
    "overtrainingThreshold": 70,
    "tenPercentRulePenalty": 0.3,
    "sweetSpotBonusMultiplier": 1.0,
    "overtrainedPenaltyMultiplier": 0.4
  },
  "race": {
    "glycogenMax": 2000,
    "glycogenBurnPerSegmentBase": 200,
    "bonkThreshold": 200,
    "bonkSpeedPenalty": 0.6,
    "moraleFloorForDNF": 0,
    "aidStationBaseTime": 120,
    "maxEventsPerSegment": 2
  },
  "economy": {
    "startingMoney": 200,
    "shoeReplacementWarningPercent": 20,
    "sponsorSatisfactionDecayPerWeek": 3,
    "sponsorDNFPenalty": 15
  },
  "injury": {
    "baseCheckFrequency": "per_workout",
    "fatiguedInjuryMultiplier": 2.0,
    "wornShoesInjuryMultiplier": 1.5,
    "niggleEscalationChance": 0.15,
    "overtrainingInjuryMultiplier": 2.5
  },
  "progression": {
    "xpPerLevel": [0, 500, 1200, 2500, 4500, 7000, 10000, 14000, 19000, 25000, 32000,
                   40000, 50000, 62000, 76000, 92000, 110000, 130000, 155000, 185000,
                   220000, 260000, 305000, 355000, 410000, 475000, 550000, 635000, 730000,
                   835000, 950000, 1080000, 1230000, 1400000, 1590000, 1800000, 2050000,
                   2350000, 2700000, 3100000, 3550000, 4100000, 4750000, 5500000, 6400000,
                   7500000, 8800000, 10300000, 12100000, 14200000],
    "levelUnlocks": {
      "3":  ["10k_races"],
      "5":  ["sponsorship_t1", "tempo_run", "trail_run"],
      "7":  ["half_marathon_races"],
      "12": ["marathon_races", "carbon_racers"],
      "15": ["sponsorship_t2", "back_to_back_longs"],
      "18": ["50k_races", "trekking_poles"],
      "23": ["50mi_races"],
      "25": ["sponsorship_t3"],
      "28": ["100k_races"],
      "33": ["100mi_races"],
      "35": ["sponsorship_t4"],
      "40": ["200mi_races"],
      "45": ["barkley_application"]
    }
  }
}
```

### `data/sponsors.json`

```json
[
  {
    "id": "local_run_shop",
    "name": "Fleet Feet Local",
    "tier": 1,
    "weeklyStipend": 150,
    "perks": [{ "type": "gear_discount", "value": 0.10, "category": "all" }],
    "requirements": {
      "minLevel": 5,
      "qualifyingRace": { "distance": "half_marathon", "result": "finished" }
    },
    "satisfactionDecayPerWeek": 2,
    "satisfactionGainPerRace": 10,
    "satisfactionDNFPenalty": 15,
    "dropThreshold": 20,
    "description": "Your local running store. They know your name and your gait."
  }
]
```

### `data/achievements.json`

```json
[
  {
    "id": "first_5k",
    "name": "First Steps",
    "description": "Complete your first 5K.",
    "category": "milestone",
    "xpReward": 200,
    "condition": { "type": "race_finished", "distance": "5k", "count": 1 },
    "icon": "medal_bronze"
  },
  {
    "id": "week_streak_7",
    "name": "Consistency",
    "description": "Train every day for 7 consecutive days.",
    "category": "training",
    "xpReward": 300,
    "condition": { "type": "training_streak", "days": 7 },
    "icon": "calendar_check"
  },
  {
    "id": "first_dnf",
    "name": "Learning Experience",
    "description": "Your first DNF. It won't be your last.",
    "category": "milestone",
    "xpReward": 150,
    "condition": { "type": "dnf_count", "count": 1 },
    "icon": "broken_medal"
  },
  {
    "id": "barkley_finish",
    "name": "The Impossible",
    "description": "Finish all 5 loops of the Barkley Marathons.",
    "category": "legendary",
    "xpReward": 50000,
    "condition": { "type": "barkley_finished" },
    "icon": "barkley_monument"
  }
]
```

---

## 8. File/Folder Structure

```
ultra-runner/
├── index.html                  # Single entry point
├── style.css                   # Global styles, CSS custom properties, layout
├── favicon.ico
│
├── js/
│   ├── main.js                 # Bootstrap: load data, init state, start loop
│   │
│   ├── engine/
│   │   ├── GameLoop.js         # rAF + fixed timestep
│   │   ├── Clock.js            # Game time tracking
│   │   ├── SaveManager.js      # localStorage read/write, export/import
│   │   ├── IdleCalculator.js   # Offline catch-up
│   │   └── EventBus.js         # Pub/sub
│   │
│   ├── systems/
│   │   ├── TrainingSystem.js   # Workout execution, cadence scoring
│   │   ├── TrainingInput.js    # Tap buffer, input collection
│   │   ├── RaceEngine.js       # Segment state machine
│   │   ├── StatCalculator.js   # XP-to-stat curves, gain formulas
│   │   ├── EconomySystem.js    # Money, purchases, sponsorship
│   │   ├── InjurySystem.js     # Risk rolls, recovery, overtraining
│   │   ├── NutritionSystem.js  # Glycogen model, fueling, bonk
│   │   ├── ProgressionSystem.js # XP, levels, unlocks
│   │   ├── CalendarSystem.js   # Weekly plan, season rotation
│   │   ├── RivalSystem.js      # NPC generation, scaling
│   │   └── RNG.js              # Seeded PRNG (mulberry32)
│   │
│   ├── data/
│   │   ├── DataManager.js      # Load and cache JSON files
│   │   └── Balance.js          # Re-exports tuning constants from balance.json
│   │
│   ├── ui/
│   │   ├── ViewManager.js      # Screen routing, navigation
│   │   ├── Renderer.js         # Canvas: runner animation, parallax
│   │   ├── screens/
│   │   │   ├── DashboardScreen.js
│   │   │   ├── TrainingScreen.js
│   │   │   ├── RaceScreen.js
│   │   │   ├── ShopScreen.js
│   │   │   ├── ProfileScreen.js
│   │   │   └── CreationScreen.js
│   │   ├── components/
│   │   │   ├── StatBar.js
│   │   │   ├── GaugeCluster.js
│   │   │   ├── TrainingCalendar.js
│   │   │   ├── RaceCard.js
│   │   │   ├── GearSlot.js
│   │   │   ├── InventoryGrid.js
│   │   │   ├── FloatingNumber.js
│   │   │   ├── Modal.js
│   │   │   ├── ProgressMap.js
│   │   │   ├── TrophyCase.js
│   │   │   └── NavBar.js
│   │   └── animations/
│   │       ├── TapFeedback.js  # Ripple, footstep visual
│   │       └── Transitions.js  # Screen transitions
│   │
│   └── util/
│       ├── format.js           # Time formatting, number display
│       └── dom.js              # DOM helpers (createElement, class toggle)
│
├── data/
│   ├── races.json
│   ├── gear.json
│   ├── consumables.json
│   ├── events.json
│   ├── workouts.json
│   ├── injuries.json
│   ├── balance.json
│   ├── sponsors.json
│   ├── achievements.json
│   └── rivals.json
│
├── assets/
│   ├── sprites/                # Runner frames, gear overlays
│   ├── backgrounds/            # Parallax layers per environment
│   ├── icons/                  # UI icons (stats, gear slots, nav)
│   ├── audio/
│   │   ├── sfx/               # Footsteps, taps, finish line, taps (bugle)
│   │   └── music/             # Ambient loops per environment
│   └── fonts/
│
├── tests/
│   ├── stat-calculator.test.js
│   ├── race-engine.test.js
│   ├── training-system.test.js
│   ├── idle-calculator.test.js
│   ├── injury-system.test.js
│   ├── nutrition-system.test.js
│   ├── economy-system.test.js
│   └── rng.test.js
│
└── tools/
    ├── balance-tuner.html      # Standalone page to visualize/tweak curves
    └── race-preview.html       # Standalone page to preview race segments
```

### Module loading

No bundler needed for v1. Use ES modules natively:

```html
<!-- index.html -->
<script type="module" src="js/main.js"></script>
```

All JS files use `export` / `import`. This works in all modern browsers and on GitHub Pages. If/when a bundler becomes desirable (for minification, tree-shaking), adding one is straightforward because the code is already modular.

---

## 9. UI Architecture

### Approach: Vanilla DOM with a thin component pattern

No framework. No virtual DOM. Instead, a lightweight component convention that keeps DOM updates targeted and efficient.

### The Component Pattern

Every UI component is a plain object with a standard interface:

```js
// ui/components/StatBar.js

export function createStatBar(statKey, container) {
  // Create DOM once
  const el = document.createElement('div');
  el.className = 'stat-bar';
  el.innerHTML = `
    <span class="stat-bar__label"></span>
    <div class="stat-bar__track">
      <div class="stat-bar__fill"></div>
    </div>
    <span class="stat-bar__value"></span>
  `;
  container.appendChild(el);

  const label = el.querySelector('.stat-bar__label');
  const fill = el.querySelector('.stat-bar__fill');
  const value = el.querySelector('.stat-bar__value');

  // Cache last rendered values to skip unnecessary DOM writes
  let lastValue = -1;

  return {
    el,
    update(state) {
      const stat = state.stats.primary[statKey];
      if (stat.value === lastValue) return; // no-op if unchanged
      lastValue = stat.value;

      label.textContent = statKey;
      fill.style.width = stat.value + '%';
      value.textContent = stat.value.toFixed(1);
    },
    destroy() {
      el.remove();
    }
  };
}
```

### Key principles

1. **Create DOM once, update with targeted writes.** Never `innerHTML` on update. Set `.textContent`, `.style.width`, `.classList.toggle()` on the specific elements that changed.

2. **Dirty-checking with cached values.** Each component caches what it last rendered. On `update(state)`, it compares and short-circuits if nothing changed. This is cheap and prevents layout thrashing.

3. **EventBus-driven selective refresh.** The UI does not poll state every frame. Instead:

```js
// ui/screens/DashboardScreen.js

EventBus.on('stat_changed', (statKey) => {
  statBars[statKey].update(state);
});

EventBus.on('condition_changed', () => {
  gaugeCluster.update(state);
});

EventBus.on('money_changed', () => {
  moneyDisplay.update(state);
});
```

This means only the components affected by a change re-render. A tap during training does not cause the shop inventory to recalculate.

4. **Screen-level lifecycle.** Each screen has `enter(state)`, `update(state)`, `exit()`:

```js
// ui/screens/TrainingScreen.js

export function createTrainingScreen(container) {
  let active = false;
  const el = document.createElement('div');
  el.className = 'screen screen--training';
  el.style.display = 'none';

  // Build child components
  const effortMeter = createEffortMeter(el);
  const cadenceRing = createCadenceRing(el);
  const canvas = createTrainingCanvas(el);

  return {
    el,
    enter(state) {
      active = true;
      el.style.display = '';
      container.appendChild(el);
      effortMeter.update(state);
      cadenceRing.update(state);
      canvas.start(state);
    },
    update(state) {
      if (!active) return;
      effortMeter.update(state);
      cadenceRing.update(state);
      canvas.draw(state);
    },
    exit() {
      active = false;
      el.style.display = 'none';
      canvas.stop();
    }
  };
}
```

5. **Template literals only for initial DOM creation.** They are used once in the constructor to build the HTML skeleton, not on every update. This avoids the innerHTML-on-every-frame anti-pattern.

### ViewManager (screen router)

```js
// ui/ViewManager.js

const screens = {};
let currentScreen = null;

export function registerScreen(name, screen) {
  screens[name] = screen;
}

export function navigateTo(name) {
  if (currentScreen) {
    screens[currentScreen].exit();
  }
  currentScreen = name;
  screens[name].enter(state);
  updateNavBar(name);
}
```

Navigation is driven by the bottom nav bar (5 tabs matching the PRD: Dashboard, Training, Races, Shop, Profile). No URL routing needed for v1 — this is a single-page app with screen swapping via display toggling.

### CSS architecture

```css
/* style.css — top-level structure */

:root {
  /* Earth tone palette */
  --color-bg:        #F5F0EB;
  --color-surface:   #FFFFFF;
  --color-text:      #2D2A26;
  --color-text-muted:#7A756F;
  --color-primary:   #C17847;     /* terracotta */
  --color-success:   #6B8F5E;     /* sage */
  --color-warning:   #D4A843;     /* amber */
  --color-danger:    #C45B4A;     /* burnt */
  --color-info:      #5B7FA5;     /* slate blue */

  /* Spacing scale */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;

  /* Type scale */
  --font-body: 'Inter', system-ui, sans-serif;
  --font-display: 'Plus Jakarta Sans', var(--font-body);
}

/* Card container — primary UI building block */
.card {
  background: var(--color-surface);
  border-radius: 12px;
  padding: var(--space-md);
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

/* Screen layout */
.screen {
  padding: var(--space-md);
  padding-bottom: 80px; /* nav bar clearance */
  max-width: 480px;
  margin: 0 auto;
}
```

BEM naming. CSS custom properties for theming. No preprocessor needed. The `max-width: 480px` centers the game like a mobile app on desktop.

---

## 10. Testing Strategy

### What to test

The architecture cleanly separates pure logic (systems/) from DOM (ui/). All game systems are pure functions operating on plain objects. This makes them trivially testable without a browser.

### Test runner

Use a lightweight runner that works without a bundler. Two options:

**Option A:** Node.js with native ES module support. Run tests with `node --test tests/*.test.js`. Zero dependencies.

**Option B:** A minimal test file that runs in the browser. Load `tests/runner.html` which imports all test modules and reports results to console/DOM.

For v1, Option A is cleaner.

### Priority test targets

| Priority | Module | Why |
|----------|--------|-----|
| 1 | `StatCalculator` | XP-to-stat curve must be correct. Bad curve = broken game feel. |
| 2 | `RaceEngine` | Segment resolution, event application, time calculations. Most complex logic. |
| 3 | `IdleCalculator` | Offline gains must be deterministic and capped. Bugs here = exploits or lost progress. |
| 4 | `NutritionSystem` | Glycogen model, bonk threshold. Precise thresholds matter. |
| 5 | `InjurySystem` | Risk calculations, escalation logic. Must be fair and predictable. |
| 6 | `TrainingSystem` | Cadence scoring, sweet spot detection. Core feel of the game. |
| 7 | `EconomySystem` | Purchase validation, sponsorship math. Prevents negative money, broken economy. |
| 8 | `RNG` | Seeded PRNG must be deterministic. Same seed = same sequence, always. |

### Example test structure

```js
// tests/stat-calculator.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { xpToStat, computeStatGain } from '../js/systems/StatCalculator.js';

describe('xpToStat', () => {
  it('returns 1 for 0 XP', () => {
    assert.equal(xpToStat(0), 1);
  });

  it('returns approximately 30 for 500 XP', () => {
    const result = xpToStat(500);
    assert.ok(result > 28 && result < 32, `expected ~30, got ${result}`);
  });

  it('never exceeds 100', () => {
    assert.equal(xpToStat(999999999), 100);
  });

  it('is monotonically increasing', () => {
    let prev = 0;
    for (let xp = 0; xp < 100000; xp += 100) {
      const val = xpToStat(xp);
      assert.ok(val >= prev, `not monotonic at xp=${xp}`);
      prev = val;
    }
  });

  it('shows diminishing returns (logarithmic)', () => {
    const gain_0_to_1000 = xpToStat(1000) - xpToStat(0);
    const gain_10000_to_11000 = xpToStat(11000) - xpToStat(10000);
    assert.ok(gain_0_to_1000 > gain_10000_to_11000 * 2,
      'early gains should be much larger than late gains');
  });
});

describe('computeStatGain', () => {
  it('returns higher gains for sweet spot cadence', () => {
    const sweetSpot = computeStatGain('easy_run',
      { quality: 'sweet_spot', multiplier: 1.0 }, 0, 30000, 20);
    const hard = computeStatGain('easy_run',
      { quality: 'hard', multiplier: 0.7 }, 0, 30000, 20);
    assert.ok(sweetSpot > hard);
  });

  it('reduces gains at high fatigue', () => {
    const fresh = computeStatGain('easy_run',
      { quality: 'sweet_spot', multiplier: 1.0 }, 0, 30000, 10);
    const tired = computeStatGain('easy_run',
      { quality: 'sweet_spot', multiplier: 1.0 }, 0, 30000, 80);
    assert.ok(fresh > tired);
  });
});
```

### What NOT to test

- DOM rendering (fragile, low value at this stage)
- Visual animation (canvas drawing)
- Audio playback
- localStorage (mock it at the SaveManager boundary if needed)

The testing strategy is: exhaustively test the math, trust the browser for the pixels.

### Balance testing tool

The `tools/balance-tuner.html` file is a standalone page (not part of the game) that visualizes:
- The XP-to-stat curve with sliders to tweak parameters
- Fatigue accumulation over a simulated training week
- Race segment time calculations with different stat inputs
- Injury probability at various fatigue/overtraining levels

This is not automated testing — it is a design tool for manual tuning. It imports the same system modules the game uses, so the curves you see are the curves the game uses.

---

## Appendix: Key Technical Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Module system | ES modules (native `import`/`export`) | No build step. Works on GitHub Pages. Modern browsers all support it. |
| Game loop | rAF + fixed 10Hz logic tick | Visual smoothness without coupling game logic to frame rate. Deterministic simulation. |
| State management | Single plain object, event-driven updates | Simple, serializable, debuggable. No framework state library needed. |
| DOM updates | Cached-value dirty checking + EventBus-driven selective refresh | Fast enough without a virtual DOM. Minimal DOM writes. |
| Persistence | localStorage with JSON serialization | Zero backend. Instant save/load. Export/import for backup. |
| RNG | Seeded mulberry32 | Deterministic races. Reproducible for debugging. |
| Canvas | Single `<canvas>` for runner/environment animation | Smooth parallax and sprite animation. DOM for everything else. |
| Testing | Node.js native test runner on pure-logic modules | Zero dependencies. Fast. Tests the math that matters. |
| Data | External JSON files loaded at startup | Easy to tune without touching code. Clear separation of data and logic. |
| CSS | Vanilla CSS with custom properties, BEM naming | No preprocessor needed. Theming via variables. |
