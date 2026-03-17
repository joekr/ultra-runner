# Ultra Runner Simulator — Product Requirements Document

> **Version:** 0.1 (Draft)
> **Date:** 2026-03-17
> **Status:** Design Phase

---

## Table of Contents

1. [Vision & Overview](#1-vision--overview)
2. [Core Game Loop](#2-core-game-loop)
3. [Runner Creation](#3-runner-creation)
4. [Progression Systems](#4-progression-systems)
5. [Training System](#5-training-system)
6. [Race System](#6-race-system)
7. [Equipment & Gear](#7-equipment--gear)
8. [Nutrition & Fueling](#8-nutrition--fueling)
9. [Economy & Sponsorships](#9-economy--sponsorships)
10. [Risk & Injury System](#10-risk--injury-system)
11. [Iconic Races & Race Culture](#11-iconic-races--race-culture)
12. [The Barkley Marathons (Endgame)](#12-the-barkley-marathons-endgame)
13. [Social & Community Systems](#13-social--community-systems)
14. [UX/UI Design](#14-uxui-design)
15. [Art Direction & Audio](#15-art-direction--audio)
16. [Idle/Active Balance](#16-idleactive-balance)
17. [Retention & Engagement](#17-retention--engagement)
18. [Monetization](#18-monetization)
19. [Platform & Tech Stack](#19-platform--tech-stack)
20. [Authenticity Details](#20-authenticity-details)

---

## 1. Vision & Overview

**Ultra Runner Simulator** is a progression-based clicker/sim hybrid where players create a runner and progress from casual park 5Ks to the most brutal ultra marathons on the planet. The pinnacle: finishing the Barkley Marathons — something fewer than 20 people have done in nearly 40 years.

### The Fantasy

You are living the journey from "I just started running" to "I finished the Barkley Marathons." That arc — which in real life takes 5-10+ years of dedication — is compressed into a deeply satisfying progression curve.

### Design Pillars

1. **The progression fantasy is everything.** Every screen reinforces how far the player has come and how far they could go. The visual glow-up from cotton-shirt 5K jogger to Barkley finisher should be visible and visceral.
2. **Meaningful decisions, not mindless clicking.** Training has an optimal effort "sweet spot." Races have real strategic depth. Gear choices matter. Overtraining has consequences.
3. **Authenticity over abstraction.** Real running wisdom woven into every system. Non-runners should learn real things. Runners should feel *seen*.
4. **Respect the player's time.** Idle progression maintains your base. Active play advances you. A session can be 2 minutes or 20 minutes and both feel productive.

### Tone

- **Warm and encouraging.** Running culture is supportive. Celebrate effort, not just results.
- **Quietly humorous.** "I paid $300 to run 100 miles through the desert and eat gas station food at 3am."
- **Meditative.** The training loop should feel calming, not stressful.

Sample UI text:
- After a DNF: *"Not every run ends at the finish line. But every run teaches you something. Rest up. The trail will be there tomorrow."*
- After a PR: *"You've never run this fast. Remember this feeling — you earned every second of it."*
- On the Barkley entry screen: *"The Barkley doesn't care about your stats. The Barkley cares about your stubbornness."*

---

## 2. Core Game Loop

### Minute-to-Minute (Active Play)

**Training Mode:**
- Player sees their weekly training calendar (7-day cycle)
- Each day has a training slot — assign a workout type
- Tapping during a workout fills an "effort meter" — more taps = more intensity = more stat gains, BUT also more fatigue and injury risk
- A **sweet spot system** exists: there is an optimal tap rate that maximizes gains. Too slow undertrains, too fast overtrains. This gives tapping actual decision weight.
- Between workouts, players manage recovery: sleep quality, nutrition choices, stretching/mobility

**Racing Mode:**
- Races are divided into **segments** (a marathon has ~8 segments; a 100-miler has 20+ with aid stations between them)
- Each segment presents decisions: pace selection, nutrition intake, gear adjustments
- Random events fire based on terrain, weather, and stats
- Players set strategy per segment and watch it simulate with intervention points
- Longer ultras have more segments and more decision points

### Session-to-Session (Macro Loop)

1. **Plan your training week** — pick workouts, balance intensity vs recovery
2. **Execute training** — tap through workouts, manage fatigue
3. **Enter a race** — when fitness is high enough, register for an event
4. **Race day** — execute race strategy, manage nutrition/pacing
5. **Post-race** — collect rewards, recover, unlock new race tiers
6. **Upgrade** — buy better gear, unlock new training methods, pursue sponsorships
7. **Repeat** — train for the next distance/challenge

---

## 3. Runner Creation

Fast but memorable. Do not front-load fifty sliders — let customization deepen over time as gear and cosmetics unlock.

### Initial Creation Flow (3 Screens)

**Screen 1 — "Who Are You?"**
- Name input
- Pronoun selection (he/him, she/her, they/them)
- Body type selector: 3-4 silhouettes (cosmetic only, no stat implications)

**Screen 2 — "What Do You Look Like?"**
- Skin tone palette (continuous gradient)
- Hair style (8-10 options, more unlockable later)
- Hair color, facial hair options
- Simple face feature tweaks (3-4 options each, not sliders)
- Default outfit: basic cotton tee, generic shorts, neutral trainers — intentionally basic. You should LOOK like a beginner. The visual glow-up is part of the progression fantasy.

**Screen 3 — "What's Your Background?"**
Choose one backstory for a minor starting perk:
- **"Couch to 5K"** — Pure beginner. Bonus: faster early-game stat gains
- **"Former Athlete"** — Played sports in school. Bonus: slightly higher starting stamina
- **"Hiking Enthusiast"** — Loves the outdoors. Bonus: small trail adaptation bonus
- **"Stress Runner"** — Runs to decompress. Bonus: slightly faster recovery

These are gentle nudges, not hard class locks. All builds converge by mid-game.

### Ongoing Customization
- Gear visually appears on your runner (buy new shoes, they show up)
- Race finisher shirts auto-added to wardrobe
- Cosmetic unlocks: sunglasses, headbands, GPS watches, race bibs, tattoos
- **Vanity loadout vs. race loadout** — set a "look" independent of equipped race gear

---

## 4. Progression Systems

### Runner Stats

Eight primary stats modeled after real running physiology:

| Stat | What It Governs | Training Method |
|------|----------------|-----------------|
| **Endurance** | How long you can run before fatigue spikes | Long runs, easy volume |
| **Speed** | Pace capability. Determines "easy" and "hard" efforts | Intervals, tempo runs |
| **VO2 Max** | Cardiovascular ceiling. Most important for shorter distances | Intervals, hard effort |
| **Lactate Threshold** | Sustainable hard effort. Separates 3:30 from 3:00 marathoner | Tempo runs, threshold work |
| **Climbing Power** | Uphill efficiency, power hiking skill | Hill repeats, vert training |
| **Mental Toughness** | Resistance to morale drops, DNF resistance, pain tolerance | Hard workouts, hard races, suffering |
| **Recovery Rate** | How fast fatigue clears. Aid station efficiency | Rest, sleep, cross-training |
| **Nutrition IQ** | Fueling efficiency, GI tolerance | Race experience, knowledge items |

**Secondary/Hidden Stats:**
- Trail Skill (technical terrain handling)
- Heat Adaptation (10-14 days of heat exposure to build)
- Altitude Adaptation (3-6 weeks to build, critical for Leadville/Hardrock)
- Night Running Skill (headlamp running, depth perception)
- Fat Oxidation (ability to burn fat at higher intensities — built through long easy running)
- Running Economy (efficiency, improves with years of running)

### Stat Scaling

Logarithmic curve mirroring real running — fast beginner gains, tiny elite gains:

- **1-30:** Beginner. Fast gains. 5K through half marathon readiness.
- **30-60:** Intermediate. Moderate gains. Marathon through 50K.
- **60-85:** Advanced. Slow, deliberate gains. 100K/100-mile readiness.
- **85-100:** Elite. Tiny incremental gains. Required for 200+ and Barkley.

### Runner Level (1-50)

Global level serves as the gating mechanism for race entry. XP from:
- Completing workouts (small)
- Finishing races (large, scaled by distance and placement)
- Personal bests
- Achievements

Unlocks: new race distances, training types, equipment tiers, sponsorship eligibility.

### Prestige System: "New Season"

After completing the Barkley, "retire" your runner and start a new season:
- Permanent passive bonuses (+5% base recovery, start with better gear)
- Cosmetic legacy items
- Access to legendary race variants (night editions, storm conditions, invitationals)
- Long-term replayability hook

---

## 5. Training System

### The 80/20 Rule

~80% of training should be easy, ~20% hard. The game penalizes players who red-line every session — mirroring real running where the #1 beginner mistake is running too hard on easy days.

### Workout Types

| Workout | Tap Mechanic | Primary Stat | Injury Risk |
|---------|-------------|-------------|-------------|
| Easy Run | Relaxed tapping, wide cadence zone | Base endurance | Low |
| Long Run | Sustained tapping, fatigue meter rises | Stamina, mental toughness | Moderate |
| Intervals | Swipe surge/recover pattern | Speed, VO2 max | High |
| Tempo Run | Hold-and-release at target zone | Lactate threshold | Moderate |
| Hill Repeats | Rapid tap uphill, coast down | Climbing power, strength | Moderate |
| Cross-Training | Mini-game variety (cycling, swimming) | Injury prevention, recovery | Very Low |
| Trail Run | Tap + obstacle swipes (rocks, roots) | Trail skill, agility | Moderate |
| Back-to-Back Longs | Two long runs consecutive days (unlockable) | Ultra-specific fatigue resistance | High |

### Active Training UI

The screen shows your runner on a scrolling trail/road. Environment changes based on workout type.

- **Tap to stride.** Cadence zone visualized as a pulsing ring — tapping in rhythm gives bonus efficiency. Mashing still works but less effective.
- **Hold-and-release** for tempo runs — power meter fills, release at the right zone
- **Swipe mechanics** for intervals — swipe up to surge, swipe down to recover

**On-Screen Layout:**
- **Top:** Current workout name, duration/distance remaining, intensity
- **Center:** Runner animation on scrolling environment
- **Bottom third:** Tap/interaction zone, cadence indicator
- **Left:** Current pace, heart rate, elevation
- **Right:** Real-time stat gains (floating "+0.3 Endurance" numbers)

### Scheduled Training (Idle/Background)

- Set a **weekly training plan** on a calendar grid
- When app is closed, scheduled workouts execute at 60-70% efficiency
- On return: "Training Summary" card with miles logged, stats gained, fatigue warnings
- **Training plan templates** unlock as you progress; "Coach" NPCs offer pre-built plans for specific race goals

### The 10% Rule

Classic guideline: don't increase weekly mileage by more than 10% week over week. Exceeding this threshold increases injury probability.

---

## 6. Race System

### Pre-Race

- **Race card:** Name, distance, elevation profile, terrain, weather forecast, entry fee, prize purse
- **Loadout check:** Mandatory and optional gear. For ultras, includes required gear (headlamp, emergency blanket). Missing required gear = cannot start.
- **Nutrition plan:** Drag-and-drop fuel items into aid station slots along the route. For 5K-half, simple/automatic. For ultras, genuine strategic depth.
- **Start line vignette:** Brief animated moment — crowd noise, nervous energy, runner stretching. 3-5 seconds, skippable.

### Active Race (Full-Screen Takeover)

**Layout:**
- **Top strip:** Race name, position (e.g., "47th / 312"), elapsed time, distance remaining
- **Main visual (60%):** Runner on the course with richly rendered environment. Parallax scrolling. Other runners visible. Day/night cycle for ultras.
- **Progress bar:** Total distance with position, key landmarks (aid stations, major climbs), and cut-off time marker that creeps forward
- **Stats panel:** Pace, heart rate, calories, elevation, hydration level, energy level as quick-glance gauges

**Race Mechanics:**

Each segment presents:

1. **Pace Decision:** Conservative / Steady / Aggressive
2. **Terrain Modifier:** Flat, hills, steep climb, technical descent, mud, etc.
3. **Event Roll:** Random events based on terrain, weather, stats
4. **Aid Station:** How long to stop — eat, drink, change shoes, rest (time vs. recovery trade-off)
5. **Morale Check:** Mental Toughness vs accumulated suffering

**Event Examples:**
- *"Your stomach is rebelling. (A) Slow down and sip ginger ale, (B) Push through, (C) Walk for a segment"*
- *"You've hit the wall at mile 20. Mental Toughness check..."*
- *"Rain has turned the trail to mud. Your road shoes are slipping. -15% speed"*
- *"A fellow runner is struggling. Help them? (+Mental Toughness, +time penalty)"*
- *"You feel a hot spot on your left foot"* — address now (lose 30 seconds) or ignore (risk blister)
- *Night section:* Screen dims, pace slows unless headlamp equipped

**Post-Race:**
- **Finish line moment** scaled to achievement: 5K = polite clapping; 100-miler = crowd going wild, emotional close-up, sunrise over mountains; Barkley = the legendary cigarette, tears
- Results: time, placement, splits, comparison to goal
- PR callouts are big and loud
- Rewards: money, XP, reputation, gear unlocks, sponsorship interest
- Recovery period: 1 day (5K) to 4+ weeks (200+)

### Race Tiers & Calendar

| Tier | Distance | Example Races | Unlock Level |
|------|----------|--------------|-------------|
| 1 | 5K | Park Run, Turkey Trot, Color Run | 1 |
| 2 | 10K | Bridge Run, Summer Sizzler | 3 |
| 3 | Half Marathon | Rock City Half, Trail Half | 7 |
| 4 | Marathon | Big City Marathon, Mountain Marathon | 12 |
| 5 | 50K | Cactus Rose, Bandera | 18 |
| 6 | 50 Mile | JFK 50, Ice Age | 23 |
| 7 | 100K | Javelina Jundred, Canyons | 28 |
| 8 | 100 Mile | Western States, UTMB, Leadville, Hardrock | 33 |
| 9 | 200+ Mile | Cocodona 250, Moab 240, Bigfoot 200 | 40 |
| 10 | Barkley | The Barkley Marathons | 45+ |

---

## 7. Equipment & Gear

### Shoes (Most Important Category)

| Tier | Type | Cost | Effect | Durability |
|------|------|------|--------|------------|
| 1 | Basic Trainers | $80 | No bonuses | 300 mi |
| 2 | Cushioned Road | $130 | +5% road speed | 400 mi |
| 3 | Trail Shoes | $140 | +10% trail grip, -5% road speed | 350 mi |
| 4 | Carbon Racer | $250 | +8% speed (road only), fragile | 150 mi |
| 5 | Premium Trail | $200 | +15% trail grip, +5% descent | 300 mi |
| 6 | Ultra-Specific | $180 | +10% comfort over 50mi, wide toe box | 500 mi |
| 7 | Custom Fit | $300 | +10% all terrain, +blister resistance | 400 mi |

**Durability is key.** Shoes wear out based on miles trained/raced. Worn-out shoes increase injury risk. Runners may go through 2-4 pairs in a single 100+ miler (gear drops). Feet swell during ultras — can go up a full size.

**Real gear knowledge baked in:**
- Road vs trail shoes have meaningfully different traction/protection
- Carbon-plated "super shoes" are 2-4% faster but fragile and expensive
- Zero-drop shoes (like Altra) have a cult following — different feel, requires adaptation
- Shoe choice affects traction, comfort, and injury risk based on terrain match

### Apparel

| Slot | Effect |
|------|--------|
| Shirt (tech tee, singlet, long sleeve) | Temperature regulation, chafe resistance |
| Shorts/Pants (split shorts, tights, rain pants) | Comfort, weather protection |
| Hat/Visor (trucker cap, sun hat, beanie) | Sun/rain protection, heat management |
| Socks (thin, cushioned, wool, toe socks) | Blister resistance, warmth |
| Gloves/Mittens | Cold weather protection |
| Gaiters | Debris protection on trails |

**Key mechanic: weather matching.** Wrong gear for conditions penalizes you. Tank top in freezing rain = bad. Long sleeve in desert heat = bad. Anti-chafe products (Body Glide, Squirrel's Nut Butter) are real consumable items.

### Hydration Systems

| Type | Capacity | When Needed |
|------|----------|-------------|
| Nothing | — | 5K-10K |
| Handheld bottle | 500ml | Half marathon, short trails |
| Belt with bottles | 1L | Marathon, hot weather |
| Hydration vest (small) | 1.5L | 50K-50 mile |
| Hydration vest (large) | 2L+ | 100K+ (slight speed penalty from weight) |

### Accessories

| Item | Effect |
|------|--------|
| GPS Watch (tiers 1-4) | Better pace data, split tracking, training metrics |
| Headlamp (tiers 1-3) | Required for night sections; quality affects speed and fall risk |
| Trekking poles | +20% climbing efficiency, -5% flat speed; required for some ultras |
| Foam roller | +10% passive recovery |
| Massage gun | +15% passive recovery |
| Compression boots | +20% passive recovery |

### Mandatory Gear System

Many ultra races require specific items (headlamp, emergency blanket, rain jacket, whistle). Gear check at race start — fail it and you can't start. This teaches real ultra culture.

### Loadout System

- **Paper doll view:** Runner in center with equipment slots (head, torso, legs, feet, hydration, nutrition pockets, accessories)
- **Loadout presets:** Save named configs ("Road Race Kit," "Trail Ultra Kit")
- **Weight indicator:** Total loadout weight. Heavier = slightly slower.
- **Durability warnings:** Shoes with <20% life get red warning icon

---

## 8. Nutrition & Fueling

### The Basics

- Glycogen stores: ~2,000 calories, enough for ~90-120 minutes of hard effort
- After depletion: **bonking** — dramatic performance collapse, confusion, emotional breakdown
- Goal: take in enough calories to supplement glycogen without upsetting the stomach
- **Bonking should be a major game mechanic** — sudden and catastrophic but preventable

### Fueling by Distance

| Distance | Fueling Needs |
|----------|--------------|
| 5K-10K | Nothing needed |
| Half Marathon | A gel or two, water at aid stations |
| Marathon | 30-60g carbs/hour, gels every 30-45 min |
| 50K-50mi | Transition to real food — gels cause nausea over time |
| 100K-100mi | 200-400 cal/hour, real food dominates: quesadillas, ramen, PB&J |
| 200+ | Eating contest you happen to be running during |

### Consumable Items

| Category | Examples | Effect |
|----------|----------|--------|
| Gels | Basic, caffeinated, natural | Quick energy, GI risk if overused |
| Chews | Gummy blocks, fruit chews | Moderate energy, lower GI risk |
| Real Food | PB&J, potatoes, broth, quesadilla | High restore, slower to eat |
| Electrolytes | Tabs, powder, salt capsules | Prevents cramping |
| Caffeine | Pills, caffeinated gels, Coke | +temp speed boost, -sleep quality in overnight ultras |
| Anti-chafe | Body Glide, tape | Prevents chafe events for X segments |
| Blister kit | Tape, needle, antiseptic | Treats blisters at aid stations |
| Pain relief | Ibuprofen | Reduces pain penalty but **masks injury warnings** (dangerous trade-off) |

### Nutrition Strategy Mechanic

Set a fueling plan: calories/hour, fluid/hour, electrolytes/hour. Too little = bonk. Too much = GI distress. The "right" amount depends on Nutrition IQ stat, pace, temperature, and altitude. Learning your runner's fueling sweet spot is a genuine skill.

### Authentic Detail: Coke

Flat Coca-Cola at mile 70 of a 100-miler is the magic elixir of ultra running. Every ultra runner knows this. It should be an in-game item with outsized effectiveness late in ultras.

---

## 9. Economy & Sponsorships

### Money Sources

| Source | Amount | Frequency |
|--------|--------|-----------|
| Race prize money | $50 (5K) to $25,000 (major ultras) | Per race, placement-dependent |
| Sponsorship stipends | $100-$5,000/week | Passive, tier-dependent |
| Appearance fees | $500-$10,000 | Invited based on reputation |
| Content creation | $50-$500 | Unlockable side activity |
| Coaching others | $200-$2,000/week | Late-game passive income |

### Money Sinks

| Sink | Cost | Notes |
|------|------|-------|
| Race entry fees | $25-$500 | Required. Ultras are expensive. |
| Shoes | $80-$300 | Wear out, frequent replacement |
| Gear | $50-$400 | Durable but upgradeable |
| Nutrition/fuel | $5-$50/race | Consumed on use |
| Physical therapy | $50-$200 | Required after injuries |
| Travel costs | $100-$2,000 | Destination races |
| Recovery tools | $50-$500 | Foam rollers, massage guns, etc. |

### Balance Philosophy

**Tight early game** (choosing between new shoes and race entry fees — every purchase matters) → **comfortable late game** (focus shifts to prestige goals and challenge completions).

### Sponsorship Tiers

**Tier 1 — Local Running Store** (Level 5+)
- $100-200/week stipend, 10% gear discount
- Requirement: Complete a local half marathon
- *Reality: This is mostly a community relationship*

**Tier 2 — Regional Brand Deal** (Level 15+)
- $500-1,000/week, free shoes per training cycle
- Must wear sponsor gear in races
- Requirement: Top 10 finish in a marathon
- *Reality: Small brands like Tailwind, Drymax socks supporting mid-tier athletes*

**Tier 3 — National Brand Ambassador** (Level 25+)
- $2,000-3,000/week, full gear package
- Requirement: Win an ultra, growing social presence
- *Reality: The "pro-but-still-has-a-day-job" tier. This is most sponsored ultra runners.*

**Tier 4 — Elite Pro Contract** (Level 35+)
- $5,000+/week, all travel covered, prototype equipment access
- Requirement: Podium at a major 100-miler
- *Reality: Only top ~50-100 ultra runners in the world. Even then, a fraction of mainstream sports pay.*

### Sponsor Satisfaction Mechanic

Each sponsor has a satisfaction meter:
- Goes up: race well, post content, wear their gear
- Goes down: DNF frequently, wear competitor gear, go inactive
- Creates real tension: race injured to keep the sponsor happy, or rest and risk the deal?
- Sponsor may require using their shoes even if another brand is better for a specific race

---

## 10. Risk & Injury System

### Injury Spectrum

| Severity | Examples | Effect | Recovery |
|----------|----------|--------|----------|
| Niggle | Sore knee, tight hamstring | -5% performance, warning sign | 1-2 rest days |
| Minor | Mild strain, shin splints | -15% performance | 3-7 days |
| Moderate | Stress reaction, IT band | Cannot race, limited training | 2-4 weeks |
| Severe | Stress fracture, torn muscle | No running | 4-12 weeks |
| Catastrophic | Major fall injury | Extended layoff, stat regression | 3-6 months |

### Common Running Injuries (Authenticity)

- **Plantar Fasciitis** — bottom of foot pain. Too much too soon, poor shoes. The "limp out of bed" injury.
- **IT Band Syndrome** — outside knee pain. Weak hips, too much downhill. Can be maddeningly chronic.
- **Shin Splints** — the beginner's injury. Can become stress fracture if ignored.
- **Stress Fractures** — tiny bone cracks. The catastrophic result of overtraining + under-recovery. Entire season lost.
- **Achilles Tendinopathy** — common when switching to low-drop shoes too fast.
- **Ankle Sprains** — trail-specific. Probability based on terrain difficulty and fatigue level.
- **Blisters** — #1 ultra issue. Prevention: toe socks, lubricant, proper shoe fit. Treatment at aid stations.

### Key Design Principle

**Injuries should feel like the player's fault.** "I pushed too hard," "I should have rested," "I knew those shoes were shot." Warning signs are always visible — fatigue bar turns yellow, pulsing icon, coach text overlay. Never random punishment. Always avoidable.

### Overtraining System

A hidden-but-inferrable meter with visible symptoms:
- Stats stop improving despite hard workouts
- Fatigue doesn't clear on rest days
- Performance drops in races
- Runner mood indicator turns negative
- Resting heart rate starts climbing

Fix: forced easy week or complete rest. Early recognition = quick recovery. Pushing through = deeper hole.

### DNF (Did Not Finish)

DNF is normalized, not a failure state:
- Voluntary drop at any aid station
- Involuntary from: morale hitting zero, missed cutoff, critical injury
- Still rewards some XP (reduced)
- DNFs can increase Mental Toughness
- **DNF Journal** tracks dropped races with reasons
- Some achievements specifically require DNFs
- "A DNF is better than a DNS (Did Not Start)" — but both have their place

---

## 11. Iconic Races & Race Culture

### Distance Vibes (Each Should Feel Different)

| Distance | Vibe |
|----------|------|
| **5K** | The party. Color runs, turkey trots, costumes. Joyful, inclusive. |
| **10K** | Slightly more serious. "I trained for this." |
| **Half Marathon** | The sweet spot. Carb loading, race plan, post-race beer. Many cry at the finish. |
| **Marathon** | Reverence. 4AM alarm, porta-potty lines, the wall at mile 20, crying at the finish, wearing the medal to brunch. |
| **50K** | The gateway ultra. Trail transition. "I'm an ultra runner now." |
| **50 Mile** | Running into the dark. Headlamps come on. Crew access. The lows are real, the highs are transcendent. |
| **100 Mile** | A different sport. 24-36 hours. Sunrise twice. Hallucinations. Aid station angels. Buckle culture. |
| **200+ Mile** | Multi-day system management. Sleep deprivation strategy. Crew managing you like a patient. |

### Must-Include Races (Real or Clearly Inspired)

**Road:**
- **Boston Marathon** — Must qualify (BQ). Heartbreak Hill. The road marathon final boss.
- **New York City Marathon** — 50,000 runners, 2 million spectators. The energy is otherworldly.
- **Berlin Marathon** — Fastest course in the world. Where world records happen.
- **Six Star Quest** — Complete all six World Marathon Majors (Boston, NYC, Chicago, London, Berlin, Tokyo)

**Trail/Ultra:**
- **Western States 100** — The original 100-miler. Sierra Nevada canyons, brutal heat, river crossings. Silver buckle for sub-24.
- **UTMB** — 106 miles around Mont Blanc. 35,000ft climbing. Finish in Chamonix to massive crowds. The glam ultra.
- **Hardrock 100** — Average elevation 11,000ft. Lightning, snow, stream crossings. "Kissing the rock" at the finish. Requires altitude adaptation.
- **Leadville 100** — "Race Across the Sky." Hope Pass at 12,600ft. Shotgun start.
- **Cocodona 250** — 250 miles, desert to mountains. The mega ultra step beyond 100.
- **Badwater 135** — Death Valley in July. 130F road surface. Below sea level to 8,360ft.
- **Marathon des Sables** — Self-supported 6-day stage race through the Sahara.

### Lottery & Qualification Systems

- **Western States:** ~10% acceptance lottery. Each year without entry = another "ticket"
- **Hardrock:** Requires qualifying races AND volunteer service
- **UTMB:** Requires ITRA qualifying points
- **Boston:** Qualifying time standards that tighten as sport grows
- **Game mechanic:** Realistic lottery where players may wait years. Volunteering at races earns entry advantages.

### Race Culture Details

- **Aid station buffets** at ultras — legendary spreads of food, manned by volunteer saints at 3AM
- **Crew and pacers** — pacers run with you for the last 40-50 miles; crew waits at access points with food, gear, encouragement
- **Mandatory gear checks** — race officials inspect required equipment before start
- **Belt buckles** — the traditional 100-mile finisher award (not medals)
- **Cut-off pressure** — runners sprinting/limping into cutoffs with minutes to spare is peak drama

---

## 12. The Barkley Marathons (Endgame)

The endgame boss. Dark Souls difficulty. This deserves completely unique treatment.

### What It Is
- ~100+ miles (exact distance unknown and varies) through Frozen Head State Park, Tennessee
- 5 loops of ~20-mile course with ~60,000+ feet total elevation
- 60-hour time limit
- **Fewer than 20 finishers in nearly 40 years**

### The Application (Mini-Game)
- No website. No official entry form.
- Write an "essay" explaining why you should be allowed to suffer
- Entry fee: $1.60 (inspired by the amount James Earl Ray had when he escaped the nearby prison — the race's origin story)
- A license plate from your home state is also required
- Laz (the RD) chooses entrants by opaque criteria
- You find out you're in via a "letter of condolence"
- **Game mechanic:** Application is its own quest chain. Build a resume of races. Meeting hidden criteria triggers the letter.

### Unique Mechanics
- **No course markings.** Navigate by finding hidden books. Tear out the page matching your race number as proof.
- **No aid stations.** Your loadout is everything. Pack wrong and you DNF.
- **Navigation skill** is the core stat — built only by doing specific trail races
- **Course changes yearly** — prevents familiarity from being too much of an advantage
- **Loops alternate direction** — counterclockwise, clockwise, etc.
- **Weather and darkness are extreme.** Visual tone shifts to oppressive, atmospheric.
- **The 60-hour cutoff** marker moves relentlessly on the progress bar.
- **If you stop tapping, your runner sits down and it's over.**

### The "Fun Run" vs Full Barkley
- 3 loops (~60 miles) = the "Fun Run" — a massive achievement
- 5 loops = the full Barkley — the game's ultimate achievement

### The Quitting Ritual
- When a runner quits/misses cutoff, "Taps" is played on a bugle
- This emotional moment should be conveyed in-game — mournful audio, somber screen

### Named Course Sections
- Rat Jaw (horrific briar climb)
- Testicle Spectacle
- Meth Lab Hill
- Stallion Mountain, Big Hell, Little Hell

### Design Philosophy
- DNF is the expected outcome. Each attempt teaches something.
- Players get a little further each time, learn navigation, figure out pacing.
- The eventual finish (if it ever comes) is the culmination of accumulated knowledge.
- **A Barkley finish = permanent badge, unique animation, runner's name engraved on an in-game monument.**

---

## 13. Social & Community Systems

### Running Clubs
- Join or create clubs. Group runs provide training bonuses.
- Social accountability, shared knowledge, group challenges.

### Rival Runners
- Generated NPC rivals who race against you and level up as you do
- Beating your rival is a recurring satisfaction loop

### Crew System
- Recruit NPC crew members for ultra races
- Crew quality and preparation directly impact race performance
- Good crew = faster aid station turnarounds, better nutrition management, morale boosts

### Pacers
- Recruit from your social network for the last 40-50 miles of 100-milers
- Pacer stats affect late-race performance
- Pacing someone is itself a badge of honor

### Volunteering
- Volunteer at races you can't enter
- Earns community reputation, XP, and race entry advantages (Hardrock requires volunteer hours)
- The culture of giving back is deeply embedded in ultra running

### In-Game Social Feed
- Strava-like activity feed with "kudos" from other runners
- Segment records on popular training routes
- "If it's not on [feed], it didn't happen"

### FKT (Fastest Known Times)
- Side quests: run the fastest known time on specific trail routes
- Self-supported, supported, or unsupported categories

---

## 14. UX/UI Design

### Information Architecture

**Primary Navigation (Bottom Tab Bar):**
1. **Home/Dashboard** — Runner state, upcoming race, quick-train, daily goals
2. **Training** — Workout scheduling, active training sessions
3. **Races** — Calendar, registration, active race, history
4. **Shop** — Equipment, nutrition, cosmetics by category
5. **Profile/Stats** — Runner card, lifetime stats, achievements, trophy case, progression map

### Dashboard (Landing Screen)

Answers three questions immediately:
1. How is my runner doing right now?
2. What should I do next?
3. How far have I come?

**Layout (top to bottom):**
- **Runner Status Card:** Portrait with equipped gear, circular gauges for Energy (green), Fatigue (orange/red), Motivation (blue), Health (heart). Aggregate fitness number.
- **Today's Plan:** "Today: 8-mile Easy Run" with big Start button. Race days get dramatic red/orange card.
- **Upcoming Race:** Countdown + readiness indicator ("Ready" / "Undertrained" / "Peak Fitness")
- **Recent Activity Feed:** Last 3-5 activities with stat gains
- **Progress Snapshot:** Mini-timeline dot from "5K" to "Barkley"
- **Sponsorship Ticker** (once unlocked)

### Progression Visualization

**The Journey Map:**
- Stylized trail/topographic map with race tier waypoints on a winding path
- 5K → 10K → Half → Marathon → 50K → 100K → 100mi → 200+ → Barkley
- Completed = gold glow. Current = pulsing. Future = faded/locked.
- Path gets visually more rugged as you progress. Paved roads → mountain wilderness → fog-shrouded Barkley peak.

**Trophy Case:**
- Wall/shelf of medals, belt buckles, finisher plaques
- Organized by distance tier
- Special display for pinnacle races (desert shimmer for Cocodona, fog/rain for Barkley)

**Runner Evolution Timeline:**
- Scrollable showing visual evolution:
  - Start: cotton tee, old sneakers, awkward form
  - Mid: proper kit, good shoes, confident stride
  - Late: hydration vest, poles, headlamp, weathered look of someone who's seen mile 80

**PR Board:**
- Leaderboard of personal records by distance
- New PR animation: old time slides down, new time takes place with glow

### Stats Deep Dive

Each stat has a numerical value AND a historical line graph. Watching the line go up = core sim pleasure.

**Lifetime Stats:**
- Total miles, total elevation, races entered/finished/DNF'd, PRs by distance, longest run, most elevation in a single race

---

## 15. Art Direction & Audio

### Visual Style: Clean Illustrated / Flat with Depth

Between Monument Valley's geometry and Alto's Adventure's atmospheric illustration. NOT pixel art (signals retro/arcade, wrong vibe). NOT hyperrealistic.

**Color Palette:**
- Earth tones base: terracotta, sage, stone, warm grays
- Accent by race tier: road = urban blues/grays, trail = forest greens/browns, desert = amber/burnt orange, mountain = cool slate/snow white

**Characters:**
- Simplified but expressive. Clean silhouettes, readable gear at small sizes.
- Runner's expression and posture change by energy/fatigue state:
  - Fresh: upright, smooth stride, slight smile
  - Depleted: hunched, shuffling, thousand-yard stare

**Environments:**
- Layered parallax scrolling (3-4 depth layers)
- Foreground: detailed trail/road. Mid-ground: trees, buildings, runners. Background: atmospheric mountains/sky.
- Day/night cycle affects all layers

**UI Style:**
- Rounded corners, soft shadows, generous whitespace
- Cards as primary container
- Clean sans-serif (Inter / Plus Jakarta Sans) with hand-drawn display font for headers and race names

### Audio

- Ambient soundscapes per environment (birds on trails, city noise on roads, wind on peaks)
- Footstep SFX synced to tap rhythm (critical for tap feel)
- Subtle lo-fi instrumental soundtrack for menus; builds intensity during races
- Finish line audio scales with race significance

---

## 16. Idle/Active Balance

### When Away (Idle)
- Training auto-continues at 40-60% efficiency
- Recovery happens in real time (fatigue drops)
- Sponsorship income accumulates
- Auto-completes easy/recovery runs but NOT hard workouts or races
- **Capped at ~8 hours** of accumulated gains. After that, runner "rests."
- On return: summary card of what happened

### When Active
- Full 100% training efficiency
- Race execution (always active, never idle)
- Strategic decisions: gear, training plans, race selection
- "Runner's high" random bonus multipliers during workouts

### The Tension
"My runner is maintaining fitness while I'm away, but I need to come back and do the hard work to actually improve."

---

## 17. Retention & Engagement

### Daily Systems
- **Daily Workout Bonus:** Complete one workout/day for bonus XP. Streak counter (7-day = bonus cash, 30-day = rare gear).
- **Daily Challenge:** Specific mini-goal ("Complete a tempo at 90%+ effort"). Rewards: premium currency or consumables.
- **Recovery Check-In:** 10-second action — set sleep quality, body scan. Feeds injury system.

### Weekly Systems
- **Race Calendar:** New races appear weekly, some limited-entry (urgency).
- **Training Block Review:** Letter grade (A-F) for your week. Good grades = bonus stats.
- **Weekly Challenges:** Harder goals (50 training miles, complete a long run over 15mi).

### Monthly/Seasonal
- **Race Seasons:** Spring/Summer/Fall/Winter. Each has a 3-5 race series with bonus rewards.
- **Seasonal Leaderboards:** Compare results to other players or NPCs.

### Collections
- **Race Medal/Buckle Collection** — trophy case display
- **Shoe Collection Wall** — retired shoes with mileage stats
- **Achievement System** — ~200 achievements, mix of common and extremely rare
- **Runner Journal** — Auto-generated narrative entries from race events

### Notifications (Push — Be Restrained)
- "Your runner has recovered! Ready for today's workout." (morning)
- "Race day tomorrow. Don't forget your loadout." (pre-race)
- "Your shoes have 12 miles of durability left." (gear)
- Weekly summary: "34 miles, Endurance +3.2. Keep it up."
- **DO NOT notify for:** shop sales, "come back and play," energy refills, any dark patterns

---

## 18. Monetization

### Philosophy
No pay-to-skip-training. No pay-to-win-races. No energy systems. The game's identity is about the journey. Buying your way to a Barkley finish defeats the entire point.

### Revenue Options
- **One-time purchase:** "Pro Runner" upgrade ($5-10) — doubled idle gains, cosmetics, cloud save
- **Cosmetic shop:** Shoe colorways, premium apparel, trophy case decorations, trail themes. Zero gameplay impact.
- **Coach plans:** Optimized training plans from named coach characters. Convenience, not power.
- **Season pass:** Monthly themed race series with exclusive cosmetic rewards ($3-5/season).
- **One-time ad removal** if interstitial ads exist (infrequent, ONLY between sessions, never mid-run)

---

## 19. Platform & Tech Stack

### Primary: Mobile (iOS + Android)
- Short repeatable sessions (3-5 min training), idle progression, tap/swipe native to touch
- Portrait orientation primary, one-handed operation
- Optionally landscape for race screens

### Secondary: Tablet
- Same build, responsive layout, more visual real estate

### Tertiary: Web (PWA)
- Stats dashboard, training plan management, race history
- NOT the active training/tapping (touch-native)

### Recommended Stack
```
React + TypeScript + Zustand + Pixi.js + Supabase
```
- Rapid iteration, rich UI, smooth animations, optional social features
- Ship web-first (PWA), wrap in Capacitor later for native if needed
- All game balance data in external JSON/YAML for easy tuning
- Offline-first architecture; cloud sync optional
- Alternative: Godot (if targeting mobile-native with richer visuals)

---

## 20. Authenticity Details

These small details separate "generic runner clicker" from "a game that *gets* it."

### Physical Realities
- **Toenail loss** — accumulates over ultra career. Cosmetic badge of honor.
- **The post-ultra shuffle** — going down stairs backward, holding the railing with both hands
- **Hallucinations** — trees become people, rocks become animals, trail markers talk to you. A runner at Western States once saw a full mariachi band at 3AM.
- **"Runner's nipple"** — bloody shirt from chafing (men especially). KT tape on nipples is real prevention.
- **Feet swell** during ultras — runners go up a full shoe size

### Cultural Touchstones
- **Coke at mile 70** — the most delicious thing you've ever tasted. Universal.
- **"If it's not on Strava, it didn't happen"**
- **Wearing the finisher medal to brunch** (and the grocery store)
- **The porta-potty line at 4AM** before a marathon
- **"Worst Parade Ever"** spectator signs
- **Pasta dinner the night before** (carb loading tradition)
- **The expo** — buying gear you don't need while nervously picking up your bib

### Running Mantras (In-Game Text)
- "Relentless forward progress"
- "Trust the training"
- "Run the mile you're in"
- "Pain is temporary, the buckle is forever"

### DNS / DNF / DFL Culture
- DNS: Did Not Start. Sometimes the smartest decision.
- DNF: Did Not Finish. Common in ultras. Not shameful.
- DFL: Dead F***ing Last. But you finished. Same buckle as first place. Some runners celebrate DFL more than any other finish.

### The Ultra Running Calendar
- Most runners do 2-4 ultras/year with one "A race" they're peaking for
- Training cycles: base building → build phase → peak/taper → race → recovery
- Overracing is a real problem — game should penalize racing every month

### Weather as Character
- Heat/cold/rain/wind/snow/lightning/mud transform races entirely
- The same race in a heat year vs cool year is completely different
- Randomized weather should fundamentally change difficulty and strategy

---

## Appendix: Key Decisions Still Needed

1. **Licensing** — Use real race names or inspired-by equivalents?
2. **Multiplayer** — Async leaderboards only, or real-time competitive races?
3. **Narrative** — Light NPC interactions, or deeper story mode with coach/rival characters?
4. **Session length target** — Optimize for 2-minute or 10-minute sessions?
5. **Art scope** — How many unique environments/animations are feasible for MVP?
6. **MVP scope** — Ship with 5K-Marathon first? Or full progression to Barkley?
