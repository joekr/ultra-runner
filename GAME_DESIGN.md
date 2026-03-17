# Ultra Runner Simulator - Game Design Document

## Overview

Ultra Runner Simulator is a progression-based clicker/sim hybrid where players create a runner and progress from casual park 5Ks all the way to the most brutal ultra marathons on the planet. The game blends idle mechanics with active decision-making, creating a loop where training builds your runner's stats over time, but race execution, gear selection, nutrition strategy, and risk management determine whether you finish on the podium or DNF in a ditch.

The fantasy: you are living the journey from "I just started running" to "I finished the Barkley Marathons." That arc -- which in real life takes years of dedication -- is compressed into a deeply satisfying progression curve.

---

## 1. Core Game Loop

### Minute-to-Minute (Active Play)

The active gameplay revolves around two modes: **Training** and **Racing**.

**Training Mode:**
- The player sees their weekly training calendar (7-day cycle).
- Each day has a training slot. You assign a workout type: Easy Run, Tempo Run, Long Run, Intervals, Hill Repeats, Cross-Training, or Rest.
- Clicking/tapping during a workout fills a "effort meter." More clicks = more intensity = more stat gains, BUT also more fatigue and injury risk. This is the core clicker mechanic.
- A sweet spot system exists: there is an optimal click rate that maximizes gains. Going too slow undertrains, going too fast overtrain. This gives the clicking actual decision weight rather than being mindless.
- Each workout has a mini progress bar. When complete, stats tick up and fatigue accumulates.
- Between workouts, players manage recovery: sleep quality (a slider/toggle), nutrition choices, stretching/mobility (short idle timer that rewards patience).

**Racing Mode:**
- Races play out in a semi-active format. The race is divided into segments (e.g., a marathon has ~8 segments of ~5K each; a 100-miler has 20+ segments with aid stations between them).
- Each segment presents decisions: pace selection (conservative/moderate/aggressive), nutrition intake, gear adjustments.
- Random events fire during segments: weather changes, stomach issues, blisters, mental fog, "the wall," wildlife encounters, wrong turns.
- The player does NOT click through every step of a race. Instead, they set strategy per segment and watch it simulate with intervention points. Longer ultras have more segments and more decision points, making them feel appropriately epic.

### Session-to-Session (Macro Loop)

1. **Plan your training week** - pick workouts, balance intensity vs recovery
2. **Execute training** - click through workouts, manage fatigue
3. **Enter a race** - when fitness is high enough, register for an event
4. **Race day** - execute race strategy, manage nutrition/pacing
5. **Post-race** - collect rewards (money, XP, reputation), recover, unlock new race tiers
6. **Upgrade** - buy better gear, unlock new training methods, pursue sponsorships
7. **Repeat** - train for the next distance/challenge

The macro loop takes roughly 15-30 minutes per "cycle" (one training block + race), with cycles getting longer and more complex as races get longer.

---

## 2. Progression Systems

### Runner Stats

Six primary stats, all starting low and building over time:

| Stat | What It Governs | Training Method |
|------|----------------|-----------------|
| **Endurance** | How long you can run before fatigue spikes. Core stat for ultras. | Long runs, easy volume |
| **Speed** | Pace floor. Determines how fast your "easy" and "hard" efforts are. | Intervals, tempo runs |
| **Strength** | Climbing ability, late-race resilience, injury resistance. | Hill repeats, cross-training |
| **Mental Toughness** | Resistance to morale drops, ability to push through "the wall," DNF resistance. | Completing hard workouts, finishing tough races, suffering |
| **Recovery** | How fast fatigue clears between workouts and during races. Determines aid station efficiency. | Rest days, sleep, nutrition quality, cross-training |
| **Nutrition IQ** | Efficiency of calorie/hydration intake during races. Higher = less GI distress, better fueling. | Experience (races completed), unlockable knowledge items |

### Stat Scaling

Stats use a soft-cap logarithmic curve. Early gains are fast and feel great. Later gains require more focused training. This mirrors real running where a beginner improves rapidly but elite gains are marginal.

- Stats range from 1-100.
- 1-30: Beginner. Fast gains. This covers 5K through half marathon readiness.
- 30-60: Intermediate. Moderate gains. Marathon through 50K territory.
- 60-85: Advanced. Slow, deliberate gains. 100K/100-mile readiness.
- 85-100: Elite. Tiny incremental gains. Required for 200+ and Barkley.

### Experience & Runner Level

A global "Runner Level" (1-50) serves as the gating mechanism for race entry. You gain XP from:
- Completing workouts (small amounts)
- Finishing races (large amounts, scaled by distance and placement)
- Achieving personal bests
- Completing challenges/achievements

Runner Level unlocks:
- New race distances
- New training types (e.g., "back-to-back long runs" unlocks at level 15)
- Equipment tiers
- Sponsorship eligibility

### Prestige System: "New Season"

Once a player completes the Barkley Marathons (or reaches a certain milestone), they can "retire" their runner and start a new season. This gives:
- Permanent passive bonuses (e.g., +5% base recovery, start with better gear)
- Cosmetic legacy items
- Access to "legendary" race variants (night editions, storm conditions, invitational-only events)
- A prestige counter that unlocks deeper content

This is the long-term replayability hook.

---

## 3. Economy Design

### Money Sources

| Source | Amount | Frequency |
|--------|--------|-----------|
| Race prize money | $50 (5K) to $25,000 (major ultras) | Per race, placement-dependent |
| Sponsorship stipends | $100-$5,000/week | Passive income, tier-dependent |
| Appearance fees | $500-$10,000 | Invited to races based on reputation |
| Content creation | $50-$500 | Unlockable side activity (Strava posts, YouTube, etc.) |
| Coaching others | $200-$2,000/week | Late-game unlock, passive income |

### Money Sinks

| Sink | Cost Range | Notes |
|------|-----------|-------|
| Race entry fees | $25-$500 | Required to enter. Ultras are expensive. |
| Shoes | $80-$300 | Wear out, need frequent replacement |
| Gear (vests, apparel) | $50-$400 | Durable but upgradeable |
| Nutrition/fuel | $5-$50 per race | Consumables, consumed on use |
| Gym membership | $30-$100/month | Required for cross-training |
| Physical therapy | $50-$200 | Required after injuries |
| Travel costs | $100-$2,000 | For destination races |
| Recovery tools | $50-$500 | Foam rollers, massage guns, compression boots |

### Sponsorship System

Sponsorships are the primary passive income and a major progression milestone. They work in tiers:

**Tier 1 - Local Shop Sponsorship** (Runner Level 5+)
- Small weekly stipend ($100-200/week)
- 10% discount at one store category
- Requirement: Complete a local half marathon

**Tier 2 - Regional Brand Deal** (Runner Level 15+)
- Moderate stipend ($500-1,000/week)
- Free shoes from sponsor (one pair per training cycle)
- Must wear sponsor gear in races
- Requirement: Top 10 finish in a marathon

**Tier 3 - National Brand Ambassador** (Runner Level 25+)
- Strong stipend ($2,000-3,000/week)
- Full gear package each season
- Appearance fee bonuses
- Requirement: Win an ultra, maintain top finishes

**Tier 4 - Elite Pro Contract** (Runner Level 35+)
- Major stipend ($5,000+/week)
- All gear provided, access to prototype equipment
- Travel covered for destination races
- Requirement: Podium at a major 100-miler

**Sponsor Relationship:**
- Each sponsor has a "satisfaction" meter.
- It goes up when you race well, post content, wear their gear.
- It drops if you DNF frequently, wear competitor gear, or go inactive.
- If satisfaction drops too low, you lose the sponsorship. This creates tension -- do you race injured to keep your sponsor happy, or rest and risk losing the deal?

### Balance Philosophy

The economy should feel tight in the early game (you are choosing between new shoes and race entry fees) and comfortable in the late game (you can focus on strategy, not penny-pinching). The scarcity in the early game makes every purchase meaningful. The abundance in the late game shifts focus to prestige goals and challenge completions rather than resource management.

---

## 4. Race System

### Race Mechanics

Races are the payoff for all the training. They should NOT be a simple stat check. Here is how they work:

**Pre-Race:**
- Select your race from the calendar (races have fixed dates in the game's calendar system).
- Choose your gear loadout (shoes, apparel, vest, nutrition plan).
- Set your goal (finish, time goal, placement goal). Goals affect XP and reward bonuses.
- Check weather forecast (affects gear and strategy decisions).

**During Race - Segment System:**

The race is divided into segments. Each segment:
1. **Pace Decision:** Conservative / Steady / Aggressive. Aggressive is faster but costs more stamina and raises injury/bonk risk.
2. **Terrain Modifier:** Flat, rolling hills, steep climb, technical descent, road, trail, mud, sand, etc. Stats interact with terrain (Strength matters on climbs, Speed on flats).
3. **Event Roll:** Random events based on terrain, weather, and your stats. Higher stats = better event outcomes.
4. **Aid Station (between segments):** Choose how long to stop. Eat, drink, change shoes, treat blisters. Time spent = slower finish but better recovery for later segments.
5. **Morale Check:** Mental Toughness vs accumulated suffering. If morale drops to zero, you face a "quit or push" decision. Pushing risks injury but builds Mental Toughness.

**Event Examples:**
- "Your stomach is rebelling. Do you: (A) Slow down and sip ginger ale, (B) Push through, (C) Stop and walk for a segment?"
- "You've hit the wall at mile 20. Mental Toughness check..."
- "Rain has turned the trail to mud. Your road shoes are slipping. -15% speed this segment."
- "A fellow runner is struggling. Help them? (+Mental Toughness, +time penalty)"
- "You missed a trail marker. Lose 0.3 miles and 4 minutes."

**Post-Race:**
- Results screen: your time, placement, splits per segment.
- Rewards: money, XP, reputation points, potential sponsorship interest.
- Recovery period: you cannot race again for a cooldown period scaled to race distance (1 day for 5K, 1-2 weeks for 100-miler, 4+ weeks for 200+).

### Race Calendar & Progression

The game features a curated list of real-inspired races:

| Tier | Distance | Example Races |
|------|----------|--------------|
| 1 | 5K | Park Run, Turkey Trot, Color Run |
| 2 | 10K | Bridge Run, Summer Sizzler |
| 3 | Half Marathon | Rock City Half, Trail Half |
| 4 | Marathon | Big City Marathon, Mountain Marathon |
| 5 | 50K | Cactus Rose, Bandera |
| 6 | 50 Mile | JFK 50, Ice Age |
| 7 | 100K | Javelina Jundred, Canyons |
| 8 | 100 Mile | Western States, UTMB, Leadville, Hardrock |
| 9 | 200+ Mile | Cocodona 250, Moab 240, Bigfoot 200 |
| 10 | Barkley | The Barkley Marathons (special entry system) |

**The Barkley Marathons** deserve special treatment as the endgame boss:
- Entry is randomized (you submit a "letter of intent" and may or may not be accepted -- mimicking the real entry process).
- No course markings. Navigation skill matters (a unique stat built only by doing specific trail races).
- 5 loops, each harder. You can "finish" 1-3 loops for partial credit ("Fun Run") but the real goal is all 5.
- Extreme time pressure. Weather is always punishing.
- Most attempts end in DNF. This is expected and celebrated. Each attempt teaches you something.
- Finishing the Barkley is the game's ultimate achievement.

---

## 5. Equipment & Consumables

### Equipment Categories

**Shoes** (The most important gear category)

| Tier | Name | Cost | Effect | Durability |
|------|------|------|--------|------------|
| 1 | Basic Trainers | $80 | No bonuses | 300 miles |
| 2 | Cushioned Road | $130 | +5% road speed | 400 miles |
| 3 | Trail Shoes | $140 | +10% trail grip, -5% road speed | 350 miles |
| 4 | Carbon Racer | $250 | +8% speed (road only), fragile | 150 miles |
| 5 | Premium Trail | $200 | +15% trail grip, +5% strength (descents) | 300 miles |
| 6 | Ultra-Specific | $180 | +10% comfort over 50+ miles, drainage | 500 miles |
| 7 | Custom Fit (late-game) | $300 | +10% all terrain, +blister resistance | 400 miles |

Durability matters. Shoes wear out based on miles trained and raced. Running in worn-out shoes increases injury risk. This is a steady money sink that feels natural to runners.

**Apparel**

| Slot | Examples | Effects |
|------|----------|---------|
| Shirt | Tech tee, singlet, long sleeve | Temperature regulation, chafe resistance |
| Shorts/Pants | Split shorts, tights, rain pants | Comfort, weather protection |
| Hat/Visor | Trucker cap, sun hat, beanie | Sun/rain protection, heat management |
| Socks | Thin, cushioned, wool, toe socks | Blister resistance, warmth |
| Gloves | Running gloves, mittens | Cold weather stat protection |

Apparel has durability but is much longer-lasting than shoes. The key mechanic is **weather matching** -- wearing the wrong gear for conditions penalizes you. A tank top in freezing rain is bad. A long sleeve in desert heat is bad. Players learn to check forecasts and pack appropriately.

**Hydration Systems**

| Type | Capacity | Effect |
|------|----------|--------|
| Handheld bottle | 500ml | Light, cheap, limited fluid |
| Belt with bottles | 1L | Moderate, bounces at speed |
| Hydration vest (small) | 1.5L | Good capacity, enables carrying fuel |
| Hydration vest (large) | 2L+ | Maximum capacity, slight speed penalty |
| Crew support (100mi+) | Unlimited (at aid) | Unlocked at ultra distances, no carry penalty |

Hydration becomes increasingly important as distances grow. In a 5K you do not need anything. In a 100-miler, running out of water between aid stations can end your race.

**Accessories & Recovery Tools**

| Item | Effect |
|------|--------|
| GPS Watch (tiers 1-4) | Better pace awareness, unlocks split tracking |
| Headlamp | Required for night sections, tiers affect brightness/battery |
| Trekking poles | +20% climbing efficiency, -5% flat speed, required for some ultras |
| Foam roller | +10% passive recovery speed |
| Massage gun | +15% passive recovery speed |
| Compression boots | +20% passive recovery speed |
| Ice bath setup | -25% post-race recovery time |

### Consumables (Nutrition/Fuel)

Consumables are single-use items loaded into your race plan. They are consumed at aid stations or between segments.

| Category | Examples | Effect |
|----------|----------|--------|
| Gels | Basic gel, caffeinated gel, natural gel | Quick energy. +stamina. Risk of GI distress if overused. |
| Chews | Gummy blocks, fruit chews | Moderate energy. Lower GI risk. |
| Real food | PB&J, boiled potatoes, broth, quesadilla | High energy restore, slower to eat. Best for ultras. |
| Electrolytes | Tabs, powder, capsules | Prevents cramping (cramping events). |
| Caffeine | Pills, caffeinated gels, cola | +temporary speed boost, -sleep quality in overnight ultras |
| Anti-chafe | Body glide, tape | Prevents chafe events for X segments |
| Blister kit | Tape, needle, antiseptic | Treats blister events at aid stations |
| Pain relief | Ibuprofen, Tylenol | Reduces pain penalty but masks injury risk (dangerous trade-off) |

**Nutrition Strategy** is a real mechanic: you set a fueling plan (calories per hour, fluid per hour, electrolytes per hour). Too little and you bonk. Too much and you get GI distress. The "right" amount depends on your Nutrition IQ stat, pace, temperature, and altitude. Learning your runner's fueling sweet spot is a genuine skill.

---

## 6. Idle/Active Balance

This is critical to get right. The game needs to respect the player's time while rewarding active engagement.

### When the Player Is Away (Idle)

- **Training auto-continues** at a reduced efficiency (~40-60% of active training gains). The player's last-set training plan repeats on autopilot. Easy runs and rest days are handled automatically.
- **Recovery happens in real time.** Fatigue drops while away. This incentivizes natural play sessions with breaks between -- just like real running recovery.
- **Sponsorship income accumulates.** Money from sponsors ticks in passively.
- **Auto-run easy workouts.** The game will auto-complete easy/recovery runs from your plan but will NOT auto-complete hard workouts (intervals, long runs) or races. These require active play. This way, idle play maintains your base but does not advance you into new territory.

### When the Player Is Active

- **Full training efficiency.** Clicking through workouts gives 100% stat gains.
- **Race execution.** Races are always active. You cannot idle through a race.
- **Strategic decisions.** Gear purchasing, training plan adjustments, race selection -- all require active thought.
- **Bonus workout quality.** Active play can trigger "runner's high" moments -- random bonus multipliers on stats during workouts.

### The Tension

The idle/active balance should feel like this: "My runner is maintaining fitness while I'm away, but I need to come back and do the hard work to actually improve." Idle play is the floor. Active play is the ceiling. The gap between them is the motivation to engage.

### Offline Catch-Up Cap

Idle gains are capped at ~8 hours of accumulated training. This prevents someone from leaving the game for a month and coming back to a maxed character. After 8 hours, the game shows your runner "resting" (which still provides recovery value). On return, you get a summary: "While you were away, your runner completed 3 easy runs and 2 rest days. Endurance +2, Recovery +1."

---

## 7. Retention Hooks

### Daily Systems

- **Daily Workout Bonus:** Complete at least one workout per day for bonus XP. Streak counter with escalating rewards (7-day streak = bonus cash, 30-day streak = rare gear).
- **Daily Challenge:** A specific mini-goal each day (e.g., "Complete a tempo run with 90%+ effort," "Finish a workout with zero injury risk"). Rewards: premium currency or consumables.
- **Recovery Check-In:** A 10-second daily action where you set sleep quality and do a "body scan" (tap areas that are sore). This feeds into the injury system and makes players feel connected to their runner.

### Weekly Systems

- **Weekly Race Calendar:** New races appear each week. Some are limited-entry. Creates urgency to train and register.
- **Training Block Review:** Every 7 days, the game gives a summary of your training week with a letter grade (A through F). Good grades give bonus stats. This mimics the satisfaction of reviewing a training log.
- **Weekly Challenges:** Harder goals (e.g., "Run 50 total training miles this week," "Complete a long run over 15 miles"). Rewards: gear, money, XP.

### Monthly/Seasonal Systems

- **Race Seasons:** The game operates on a seasonal calendar (Spring, Summer, Fall, Winter). Each season has a race series (3-5 races) that give bonus rewards for completing all races in the series.
- **Seasonal Leaderboards:** Compare your race results to other players (or simulated runners). Ranking up on leaderboards gives reputation and sponsor interest.
- **Monthly Challenges:** Major goals (e.g., "Complete your first 50K," "Run 200 training miles in a month").

### Collections & Achievements

- **Race Medal Collection:** Every completed race earns a medal/buckle displayed in a trophy case. Collectors will want to fill this out.
- **Shoe Collection:** A display wall for every shoe model you have owned. Retired shoes (worn out) go here with their mileage stats.
- **Achievement System:** ~200 achievements tracking milestones (first 5K, first marathon, first DNF, first Barkley attempt, etc.). Mix of common and extremely rare.
- **Runner Journal:** Auto-generated entries from race events. "Mile 72: The rain hasn't stopped. I almost quit at the last aid station but a volunteer handed me warm broth and I found the will to continue." This creates narrative attachment.

### Social/Competitive

- **Crew System:** Recruit NPC crew members for ultra races. Better crew = better aid station support.
- **Running Club:** Join or create a club. Club members contribute to group challenges. Social glue.
- **Rival Runners:** The game generates rival NPCs who race against you. Beating your rival is a recurring satisfaction loop. They level up as you do.

---

## 8. Risk/Reward Mechanics

This is where the game gets interesting. Running ultras is fundamentally about managing risk, and the game should reflect that.

### Injury System

Injuries exist on a spectrum:

| Severity | Examples | Effect | Recovery |
|----------|----------|--------|----------|
| **Niggle** | Sore knee, tight hamstring | -5% performance, warning sign | 1-2 rest days |
| **Minor** | Mild strain, shin splints | -15% performance, -1 training slot/week | 3-7 days |
| **Moderate** | Stress reaction, IT band syndrome | Cannot race, limited training | 2-4 weeks |
| **Severe** | Stress fracture, torn muscle | No running at all | 4-12 weeks |
| **Catastrophic** | Major injury from fall/accident | Extended layoff, stat regression | 3-6 months |

**Injury Risk Factors:**
- High training volume without adequate recovery
- Racing on insufficient training
- Worn-out shoes
- Ignoring niggles (they escalate)
- Aggressive pacing in races
- Technical terrain with low Strength stat
- Taking pain relievers to mask problems (hides injury warnings)

**The Key Design Insight:** Injuries should feel like they were the player's fault. "I pushed too hard," "I should have rested," "I knew those shoes were shot." This creates learning and mastery. It is never random punishment -- there are always warning signs the player could have heeded.

### Overtraining

A hidden-but-inferrable "overtraining" meter. Signs:
- Stats stop improving despite hard workouts
- Fatigue doesn't clear on rest days
- Performance drops in races
- Mood indicator on your runner turns negative
- Resting heart rate (a UI element) starts climbing

The fix: forced easy week or complete rest. Players who recognize the signs early and back off recover quickly. Players who push through dig a deeper hole. This teaches the real running principle that rest IS training.

### Bonking

During races, if calorie intake is insufficient relative to effort:
- Performance drops sharply at a threshold (the wall)
- Speed becomes locked to "survival shuffle" pace
- Mental Toughness is heavily tested
- Can be partially reversed by eating/drinking but takes 1-2 segments to recover

Bonking is the game's most dramatic in-race event. A well-fueled runner cruises. A bonking runner faces a crisis. Getting your nutrition right is a learnable skill that directly translates to better results.

### DNF (Did Not Finish)

DNF is a real possibility and should NOT be treated as a pure failure state. The game should normalize it:
- You can voluntarily drop at any aid station
- Involuntary DNF happens if: morale hits zero (and you choose to quit), time cutoff is missed, injury severity goes critical mid-race
- DNFs still reward some XP and money (reduced)
- DNFs can increase Mental Toughness (learning from failure)
- A "DNF Journal" tracks your dropped races with reasons, creating narrative
- Some achievements specifically require DNFs ("Drop at mile 90 of a 100-miler," "Attempt the Barkley 3 times")

**The Barkley Angle:** At the Barkley, DNF is the expected outcome. The game should make each Barkley attempt feel like a learning expedition. You get a little further each time. You learn the navigation. You figure out the pacing. The eventual finish (if it ever comes) is the culmination of accumulated knowledge.

### Risk/Reward Decision Points

Throughout the game, players face trade-offs:
- Race on a niggle for the sponsorship bonus, or rest and risk losing the sponsor?
- Take the aggressive pace to hit a time goal, or run conservative and guarantee a finish?
- Push through the night section sleep-deprived, or nap at the aid station and lose 30 minutes?
- Take ibuprofen to mask the knee pain, or slow down and let it resolve?
- Enter the lottery for Western States (prestige) or run a guaranteed-entry race (safe XP)?

These decisions are where the game transcends simple clicking and becomes genuinely engaging.

---

## 9. Tech Stack Suggestions

### Primary Recommendation: Web-Based (Progressive Web App)

**Frontend:** React or Vue.js with TypeScript
- Component-based UI is perfect for the many panels (training, stats, gear, races)
- TypeScript catches bugs in game logic early
- Canvas or Pixi.js for the race visualization and runner animation
- CSS animations for the clicker feedback (satisfying number pop-ups, progress bars)

**State Management:** Zustand or Redux Toolkit
- Game state is complex (stats, inventory, calendar, race state, economy)
- Need reliable state persistence to localStorage/IndexedDB
- Time-travel debugging helps during development

**Backend (optional, for social features):**
- Supabase or Firebase for leaderboards, clubs, and cloud saves
- Lightweight -- most game logic runs client-side
- Serverless functions for leaderboard validation

**Why Web:**
- Zero friction to start playing (no app store, no download)
- PWA gives "app-like" experience with offline support
- Cross-platform by default (desktop, mobile, tablet)
- Easy to update and iterate
- Idle games live on the web historically (Cookie Clicker, Universal Paperclips, NGU Idle)

### Alternative: Unity (if targeting mobile stores)

If the goal is a polished mobile game with richer visuals:
- Unity with C# gives access to iOS/Android stores
- Better animation and visual polish potential
- Asset store has idle game frameworks
- Monetization SDK integration is easier
- Downside: heavier development, longer iteration cycles

### Alternative: Godot (if solo/small team, open source preference)

- GDScript is easy to learn and fast to iterate
- Excellent for 2D games with UI-heavy designs
- Exports to web, mobile, and desktop
- Growing community and ecosystem
- Free with no royalties

### Data Layer

Regardless of stack:
- Game state serialized to JSON for save/load
- Offline-first architecture (game works without internet)
- Cloud sync as an optional layer for cross-device play
- All game balance data in external JSON/YAML files for easy tuning

### Recommended Starting Point

For a solo developer or small team wanting to ship fast:

```
React + TypeScript + Zustand + Pixi.js + Supabase
```

This gives you rapid iteration, a rich UI, smooth animations, and optional multiplayer/social features with minimal backend work. Ship as a web game first, wrap in Capacitor or Electron later if you want native apps.

---

## 10. Bonus: Monetization Thoughts (If Applicable)

If the game ever needs to make money, here are non-predatory options:

- **One-time purchase:** "Pro Runner" upgrade ($5-10) that doubles idle gains, adds cosmetics, unlocks cloud save
- **Cosmetic shop:** Runner outfits, shoe colorways, medal display themes, trail themes. Zero gameplay impact.
- **Season pass:** Each real-world month brings a "race series" with exclusive cosmetic rewards for completing it. $3-5/season.
- **NO pay-to-skip-training. NO pay-to-win-races. NO energy systems.** The game's identity is about the journey. Letting players buy their way to the Barkley finish line defeats the entire point.

---

## 11. Bonus: Narrative & Tone

The game should feel:
- **Warm and encouraging.** Running culture is supportive. The game should celebrate effort, not just results.
- **Quietly humorous.** Running has great absurdist humor ("I paid $300 to run 100 miles through the desert and eat gas station food at 3am").
- **Genuine.** Real running wisdom woven into the game. Players who know nothing about ultrarunning should learn real things. Players who are ultrarunners should feel seen.
- **Meditative.** The training loop should feel calming. The clicking rhythm should be satisfying, not stressful. Music and sound design should evoke early morning runs and mountain trails.

Sample UI text:
- After a DNF: "Not every run ends at the finish line. But every run teaches you something. Rest up. The trail will be there tomorrow."
- After a PR: "You've never run this fast. Remember this feeling -- you earned every second of it."
- On the Barkley entry screen: "The Barkley doesn't care about your stats. The Barkley cares about your stubbornness."

---

## Summary

Ultra Runner Simulator succeeds by combining three things:

1. **The satisfaction of numbers going up** (clicker/idle core)
2. **Meaningful decisions with real consequences** (sim/strategy layer)
3. **An authentic and emotionally resonant progression arc** (narrative wrapper)

The game is about the journey. Every blister, every bonk, every DNF, and every finish line is part of your runner's story. The Barkley finish is not a reward -- it is proof of everything you learned along the way.
