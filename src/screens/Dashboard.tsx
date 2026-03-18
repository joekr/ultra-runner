import { useState } from "preact/hooks";
import { gameState, fitnessLevel, statValues } from "../state/gameState";
import { startWorkout, takeRestDay, startRace, navigateTo, updateGameState, volunteerAtRace, getVolunteerPay, coachOthers, getCoachOthersPay, getSponsoredRunPayout, trainFullWeek } from "../state/actions";
import type { WeekTrainingResult } from "../state/actions";
import { GaugeCircle } from "../components/GaugeCircle";
import { StatBar } from "../components/StatBar";
import { Button } from "../components/Button";
import { canTrainSafely, getPerformancePenalty } from "../systems/injury";
import { RunnerIcon, FoamRollerIcon, MassageGunIcon } from "../components/Icons";
import { EquippedLoadout } from "../components/EquippedLoadout";
import { save } from "../engine/saveManager";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatWorkoutName(id: string): string {
  const map: Record<string, string> = {
    easy_run: "Easy Run",
    long_run: "Long Run",
    intervals: "Intervals",
    tempo_run: "Tempo Run",
    hill_repeats: "Hill Repeats",
    rest: "Rest Day",
  };
  return map[id] ?? id;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const STAT_CONFIG = [
  { key: "endurance", label: "Endurance", color: "var(--color-sage)" },
  { key: "speed", label: "Speed", color: "#5dade2" },
  { key: "strength", label: "Strength", color: "var(--color-terracotta)" },
  { key: "mentalToughness", label: "Mental", color: "#d4a017" },
  { key: "recovery", label: "Recovery", color: "#8e44ad" },
  { key: "nutritionIQ", label: "Nutrition", color: "#27ae60" },
];

function StatsSection({ stats }: { stats: Record<string, number> }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          marginBottom: expanded ? "var(--space-2)" : 0,
        }}
      >
        <span class="screen__subheader" style={{ margin: 0 }}>Runner Stats</span>
        {!expanded && (
          <div style={{
            display: "flex",
            gap: "6px",
            alignItems: "center",
          }}>
            {STAT_CONFIG.map(({ key, label, color }) => (
              <div
                key={key}
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color,
                  textAlign: "center",
                  lineHeight: 1.1,
                }}
                title={`${label}: ${Math.round(stats[key] ?? 0)}`}
              >
                <div>{label}</div>
                <div style={{ fontSize: "11px" }}>{Math.round(stats[key] ?? 0)}</div>
              </div>
            ))}
          </div>
        )}
        <span style={{
          fontSize: "var(--text-xs)",
          color: "var(--color-text-muted)",
          marginLeft: "var(--space-2)",
        }}>
          {expanded ? "\u25B2" : "\u25BC"}
        </span>
      </div>
      {expanded && (
        <div>
          <StatBar label="Endurance" value={stats.endurance} color="var(--color-sage)" />
          <StatBar label="Speed" value={stats.speed} color="#5dade2" />
          <StatBar label="Strength" value={stats.strength} color="var(--color-terracotta)" />
          <StatBar label="Mental" value={stats.mentalToughness} color="#d4a017" />
          <StatBar label="Recovery" value={stats.recovery} color="#8e44ad" />
          <StatBar label="Nutrition" value={stats.nutritionIQ} color="#27ae60" />
        </div>
      )}
    </div>
  );
}

export function Dashboard() {
  const state = gameState.value;
  if (!state) return null;

  const [weekTrainingResult, setWeekTrainingResult] = useState<WeekTrainingResult | null>(null);

  const { runner, condition, calendar, inventory, history, injuries } = state;
  const todayPlan = calendar.trainingPlan[calendar.weekDay];
  const fitness = fitnessLevel.value;
  const trainingSafety = canTrainSafely(injuries, condition.fatigue);
  const injuryPenalty = getPerformancePenalty(injuries);
  const stats = statValues.value;

  // Check which recovery tools are equipped
  const equippedTemplateIds = new Set(
    inventory.accessories
      .filter((a) => (inventory.equippedAccessories ?? []).includes(a.id))
      .map((a) => a.templateId),
  );
  const hasFoamRoller = equippedTemplateIds.has("foam_roller");
  const hasMassageGun = equippedTemplateIds.has("massage_gun");
  const hasAnyRecoveryTool = hasFoamRoller || hasMassageGun;

  // Recovery tool usage persisted in game state (survives page refresh)
  const usedRecovery = state.training.recoveryToolsUsedOnDay ?? {};

  function useRecoveryTool(toolId: string, reduction: number) {
    const s = gameState.value;
    if (!s) return;
    if (usedRecovery[toolId] === calendar.gameDay) return; // already used today
    const newFatigue = Math.max(0, condition.fatigue - reduction);
    updateGameState({
      condition: { ...condition, fatigue: newFatigue },
      training: {
        ...s.training,
        recoveryToolsUsedOnDay: {
          ...usedRecovery,
          [toolId]: calendar.gameDay,
        },
      },
    });
    save(gameState.value!);
  }

  // VO2 max estimate: weighted from endurance (40%), speed (30%), strength (15%), recovery (15%)
  // Scaled to real-world range: ~25 (untrained beginner) to ~85 (elite)
  const vo2max = Math.round(
    25 + ((stats.endurance * 0.4 + stats.speed * 0.3 + stats.strength * 0.15 + stats.recovery * 0.15) / 100) * 60
  );

  const nextRace = calendar.scheduledRaces.length > 0
    ? calendar.scheduledRaces.reduce((a, b) =>
        a.gameDay <= b.gameDay ? a : b
      )
    : null;

  const daysUntilRace = nextRace
    ? nextRace.gameDay - calendar.gameDay
    : null;

  // Race is only startable on Saturday (weekDay 5) AND when gameDay has arrived
  const isRaceDay = nextRace !== null && daysUntilRace !== null && daysUntilRace <= 0 && calendar.weekDay === 5;

  const recentRaces = history.completedRaces.slice(-3).reverse();

  // Week training results modal
  if (weekTrainingResult) {
    const r = weekTrainingResult;
    return (
      <div class="screen" style={{ padding: "var(--space-6)" }}>
        <h2 style={{ textAlign: "center", marginBottom: "var(--space-4)" }}>
          Week Training Complete
        </h2>

        <div class="card" style={{ marginBottom: "var(--space-3)", textAlign: "center" }}>
          <div style={{ fontSize: "var(--text-4xl)", fontWeight: 800, color: "var(--color-terracotta)" }}>
            {r.daysCompleted}
          </div>
          <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
            days trained
          </div>
        </div>

        {r.stoppedEarly && r.stopReason && (
          <div class="card" style={{ borderLeft: "3px solid #d4a017", marginBottom: "var(--space-3)" }}>
            <div style={{ fontSize: "var(--text-sm)", color: "#d4a017" }}>
              Stopped early: {r.stopReason}
            </div>
          </div>
        )}

        {r.injuries.length > 0 && (
          <div class="card" style={{ borderLeft: "3px solid var(--color-terracotta)", marginBottom: "var(--space-3)" }}>
            <div style={{ fontSize: "var(--text-sm)", color: "var(--color-terracotta)" }}>
              Injuries: {r.injuries.join(", ")}
            </div>
          </div>
        )}

        <div class="card" style={{ marginBottom: "var(--space-3)" }}>
          <div style={{ fontWeight: 700, marginBottom: "var(--space-2)" }}>Stat Gains</div>
          {Object.entries(r.totalStatGains).map(([stat, xp]) => (
            <div key={stat} style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-sm)", padding: "2px 0" }}>
              <span>{stat}</span>
              <span style={{ fontWeight: 600, color: "var(--color-sage)" }}>+{(xp as number).toFixed(1)} XP</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-sm)", padding: "var(--space-1) 0", borderTop: "1px solid var(--color-warm-gray-200)", marginTop: "var(--space-1)" }}>
            <span>Runner XP</span>
            <span style={{ fontWeight: 600 }}>+{r.totalXpEarned}</span>
          </div>
        </div>

        {r.leveledUp && (
          <div class="card" style={{ border: "2px solid #d4a017", marginBottom: "var(--space-3)", textAlign: "center" }}>
            <div style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "#d4a017" }}>
              Level Up! Now Level {r.newLevel}
            </div>
            {r.newUnlocks.length > 0 && (
              <div style={{ color: "var(--color-sage)", marginTop: "var(--space-1)" }}>
                {r.newUnlocks.map((d) => (
                  <div key={d}>{d.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} races unlocked!</div>
                ))}
              </div>
            )}
            {r.levelPerks.length > 0 && (
              <div style={{ marginTop: "var(--space-2)", textAlign: "left", background: "rgba(122,139,111,0.1)", borderRadius: "var(--radius-md, 8px)", padding: "var(--space-2) var(--space-3)" }}>
                <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--color-sage)", textTransform: "uppercase", marginBottom: "var(--space-1)" }}>Stats Improved</div>
                {r.levelPerks.map((perk, i) => (
                  <div key={i} style={{ fontSize: "var(--text-sm)", padding: "2px 0" }}>{perk}</div>
                ))}
              </div>
            )}
          </div>
        )}

        <Button label="Continue" onClick={() => setWeekTrainingResult(null)} />
      </div>
    );
  }

  return (
    <div class="screen">
      <div class="dashboard__runner-info">
        <RunnerIcon size={36} color="var(--color-terracotta)" />
        <span class="dashboard__name">{runner.name}</span>
        <span class="dashboard__level">Level {runner.level}</span>
      </div>

      <div class="dashboard__gauges">
        <GaugeCircle
          value={fitness}
          label="Fitness"
          color="#5dade2"
        />
        <GaugeCircle
          value={vo2max}
          label="VO2 Max"
          color="var(--color-terracotta)"
        />
        <GaugeCircle
          value={Math.round(condition.fatigue)}
          label="Fatigue"
          color={condition.fatigue > 85 ? "#c0392b" : condition.fatigue > 70 ? "var(--color-terracotta)" : condition.fatigue > 50 ? "#d4a017" : "var(--color-sage)"}
        />
      </div>

      <div class="dashboard__stats-row">
        <div class="dashboard__stat-item">
          <div class="dashboard__stat-value">{state.training.totalMiles.toFixed(1)}</div>
          <div class="dashboard__stat-label">Miles</div>
        </div>
        <div class="dashboard__stat-item">
          <div class="dashboard__stat-value">{history.totalRacesFinished}</div>
          <div class="dashboard__stat-label">Races</div>
        </div>
        <div class="dashboard__stat-item">
          <div class="dashboard__stat-value">{state.training.streak}</div>
          <div class="dashboard__stat-label">Streak</div>
        </div>
        <div class="dashboard__stat-item">
          <div class="dashboard__stat-value">${inventory.money}</div>
          <div class="dashboard__stat-label">Money</div>
        </div>
      </div>

      <div class="dashboard__section">
        <div class="screen__subheader">Equipped Gear</div>
        <div class="card" style={{ marginBottom: "var(--space-3)" }}>
          <EquippedLoadout />
        </div>

        <StatsSection stats={stats} />
      </div>

      {/* Injury alerts */}
      {injuries.length > 0 && (
        <div class="dashboard__section">
          <div class="card" style={{ borderLeft: "3px solid var(--color-terracotta)" }}>
            <div style={{ fontWeight: 700, marginBottom: "var(--space-1)", color: "var(--color-terracotta)" }}>
              Injuries
            </div>
            {injuries.map((inj) => (
              <div key={inj.id} style={{ fontSize: "var(--text-sm)", marginBottom: "var(--space-1)" }}>
                <span style={{ textTransform: "capitalize" }}>
                  {inj.type.replace(/_/g, " ")}
                </span>
                <span style={{ color: "var(--color-warm-gray-500)" }}>
                  {" "}— {inj.severity}, {inj.daysRemaining} day{inj.daysRemaining !== 1 ? "s" : ""} recovery
                  ({Math.round(inj.performancePenalty * 100)}% penalty)
                </span>
              </div>
            ))}
            {injuryPenalty > 0 && (
              <div style={{ fontSize: "var(--text-xs)", color: "var(--color-warm-gray-500)", marginTop: "var(--space-1)" }}>
                Total performance penalty: -{Math.round(injuryPenalty * 100)}%
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detraining warning */}
      {(state.training.consecutiveRestDays ?? 0) > 2 && (
        <div class="dashboard__section">
          <div class="card" style={{ borderLeft: "3px solid #8e44ad" }}>
            <div style={{ fontSize: "var(--text-sm)", color: "#8e44ad" }}>
              {(state.training.consecutiveRestDays ?? 0) > 3
                ? `Detraining! ${state.training.consecutiveRestDays} rest days in a row. Stats are declining. Get back to training!`
                : "3 rest days in a row. One more and your fitness will start declining."}
            </div>
          </div>
        </div>
      )}

      {/* Fatigue warnings */}
      {trainingSafety.warnings.length > 0 && (
        <div class="dashboard__section">
          <div class="card" style={{ borderLeft: `3px solid ${!trainingSafety.safe ? "#c0392b" : "#d4a017"}` }}>
            {trainingSafety.warnings.map((w, i) => (
              <div key={i} style={{ fontSize: "var(--text-sm)", color: !trainingSafety.safe ? "#c0392b" : "#d4a017" }}>
                {w}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recovery tools */}
      {hasAnyRecoveryTool && condition.fatigue > 0 && (
        <div class="dashboard__section">
          <div class="card" style={{ borderLeft: "3px solid #8e44ad" }}>
            <div style={{ fontWeight: 700, marginBottom: "var(--space-2)", color: "#8e44ad", fontSize: "var(--text-sm)" }}>
              Recovery Tools
            </div>
            {hasFoamRoller && (
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
                <FoamRollerIcon size={24} color="#8e44ad" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Foam Roller</div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>-8 fatigue</div>
                </div>
                {usedRecovery["foam_roller"] === calendar.gameDay ? (
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>Used today</span>
                ) : (
                  <Button label="Use" onClick={() => useRecoveryTool("foam_roller", 8)} variant="secondary" />
                )}
              </div>
            )}
            {hasMassageGun && (
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <MassageGunIcon size={24} color="#8e44ad" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Massage Gun</div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>-12 fatigue</div>
                </div>
                {usedRecovery["massage_gun"] === calendar.gameDay ? (
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>Used today</span>
                ) : (
                  <Button label="Use" onClick={() => useRecoveryTool("massage_gun", 12)} variant="secondary" />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Race day card — shown prominently above training on Saturday */}
      {isRaceDay && nextRace && (
        <div class="dashboard__section">
          <div class="card" style={{ borderLeft: "3px solid var(--color-terracotta)", background: "rgba(194, 112, 62, 0.06)" }}>
            <div style={{ fontWeight: 700, color: "var(--color-terracotta)", marginBottom: "var(--space-1)" }}>
              Race Day!
            </div>
            <div style={{ fontSize: "var(--text-sm)", color: "var(--color-warm-gray-600)", marginBottom: "var(--space-3)" }}>
              {nextRace.raceId} — Saturday
            </div>
            <Button
              label="Start Race"
              onClick={() => startRace(nextRace.raceId)}
            />
          </div>
        </div>
      )}

      <div class="dashboard__section">
        <div class="card">
          <div style={{ marginBottom: "var(--space-2)" }}>
            <strong>Today: {DAY_NAMES[calendar.weekDay]}</strong>
          </div>
          <div style={{ fontSize: "var(--text-sm)", color: "var(--color-warm-gray-600)", marginBottom: "var(--space-3)" }}>
            {formatWorkoutName(todayPlan.workout)}
          </div>
          {todayPlan.workout !== "rest" ? (
            <>
              <Button
                label={!trainingSafety.safe
                  ? "Train Anyway (Risky!)"
                  : state.flags.sponsoredRunTier >= 1
                    ? `Start Training (+$${getSponsoredRunPayout(state.flags.sponsoredRunTier)} sponsored)`
                    : "Start Training"}
                onClick={() => startWorkout(todayPlan.workout)}
                variant={!trainingSafety.safe ? "danger" : "primary"}
              />
              <div style={{ marginTop: "var(--space-2)" }}>
                <Button
                  label="Skip & Rest Instead"
                  onClick={takeRestDay}
                  variant="secondary"
                />
              </div>
            </>
          ) : (
            <Button
              label="Rest & Next Day"
              onClick={takeRestDay}
              variant="secondary"
            />
          )}
        </div>
      </div>

      {calendar.weekDay === 5 && !isRaceDay && (
        <div class="dashboard__section">
          <div class="card">
            <div style={{ marginBottom: "var(--space-1)" }}>
              <strong>Volunteer at a Race</strong>
            </div>
            <div style={{ fontSize: "var(--text-sm)", color: "var(--color-warm-gray-600)", marginBottom: "var(--space-3)" }}>
              Spend Saturday helping at an aid station. Earn $30-50.
            </div>
            <Button
              label={`Volunteer ($${getVolunteerPay(runner.level)})`}
              onClick={volunteerAtRace}
              variant="secondary"
            />
          </div>
        </div>
      )}

      {state.flags.firstUltraComplete && (
        <div class="dashboard__section">
          <div class="card">
            <div style={{ marginBottom: "var(--space-1)" }}>
              <strong>Coach Others</strong>
            </div>
            <div style={{ fontSize: "var(--text-sm)", color: "var(--color-warm-gray-600)", marginBottom: "var(--space-3)" }}>
              Share your experience with new runners. Earn $100-200/day.
            </div>
            <Button
              label={`Coach ($${getCoachOthersPay(runner.level)})`}
              onClick={coachOthers}
              variant="secondary"
            />
          </div>
        </div>
      )}

      <div class="dashboard__section">
        <div class="card">
          {state.coach ? (
            <>
              <div style={{ marginBottom: "var(--space-1)" }}>
                <strong>Coach: {state.coach.name}</strong>
              </div>
              <div style={{ fontSize: "var(--text-sm)", color: "var(--color-warm-gray-600)", marginBottom: "var(--space-2)" }}>
                Tier {state.coach.tier} &mdash; ${state.coach.weeklyCost}/week
                {state.coach.xpMultiplier > 1 && ` | +${Math.round((state.coach.xpMultiplier - 1) * 100)}% XP`}
                {" | "}-{Math.round(state.coach.fatigueReduction * 100)}% fatigue
              </div>
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <Button
                  label="Train Full Week"
                  onClick={() => {
                    const weekResult = trainFullWeek();
                    setWeekTrainingResult(weekResult);
                  }}
                />
                <Button
                  label="Manage"
                  onClick={() => navigateTo("coach")}
                  variant="secondary"
                />
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: "var(--space-1)" }}>
                <strong>Hire a Coach</strong>
              </div>
              <div style={{ fontSize: "var(--text-sm)", color: "var(--color-warm-gray-600)", marginBottom: "var(--space-2)" }}>
                A coach auto-runs your workouts at full XP with less fatigue.
              </div>
              <Button
                label="View Coaches"
                onClick={() => navigateTo("coach")}
                variant="secondary"
              />
            </>
          )}
        </div>
      </div>

      {nextRace && !isRaceDay && (
        <div class="dashboard__section">
          <div class="card">
            <div style={{ marginBottom: "var(--space-1)" }}>
              <strong>Next Race</strong>
            </div>
            <div style={{ fontSize: "var(--text-sm)", color: "var(--color-warm-gray-600)", marginBottom: "var(--space-2)" }}>
              {nextRace.raceId} &mdash; Saturday
              {daysUntilRace === 1
                ? " (Tomorrow)"
                : ` (${daysUntilRace} days away)`}
            </div>
          </div>
        </div>
      )}

      {recentRaces.length > 0 && (
        <div class="dashboard__section">
          <div class="screen__subheader">Recent Results</div>
          <div class="dashboard__race-results">
            {recentRaces.map((race, i) => (
              <div key={i} class="dashboard__race-result">
                <span>{race.raceId}</span>
                <span>
                  {race.result === "dnf"
                    ? "DNF"
                    : `${formatTime(race.finishTime)} - #${race.position}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
