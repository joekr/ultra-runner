import { gameState, fitnessLevel, statValues } from "../state/gameState";
import { startWorkout, takeRestDay, startRace, navigateTo, updateGameState, volunteerAtRace, getVolunteerPay, coachOthers, getCoachOthersPay, getSponsoredRunPayout } from "../state/actions";
import { GaugeCircle } from "../components/GaugeCircle";
import { StatBar } from "../components/StatBar";
import { Button } from "../components/Button";
import { canTrainSafely, getPerformancePenalty } from "../systems/injury";
import { RunnerIcon, FoamRollerIcon, MassageGunIcon, getGearIcon } from "../components/Icons";
import { getGearTemplate, getShoeCondition } from "../systems/gear";
import { ProgressBar } from "../components/ProgressBar";
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

export function Dashboard() {
  const state = gameState.value;
  if (!state) return null;

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
        {/* Equipped shoe */}
        {(() => {
          const equippedShoe = inventory.shoes.find((s) => s.id === inventory.equippedShoe);
          if (!equippedShoe) return (
            <div class="card" style={{ marginBottom: "var(--space-3)", borderLeft: "3px solid #c0392b" }}>
              <div style={{ fontSize: "var(--text-sm)", color: "#c0392b" }}>No shoes equipped!</div>
            </div>
          );
          const template = getGearTemplate(equippedShoe.templateId);
          const condition = getShoeCondition(equippedShoe);
          const barColor = condition.isWorn ? "#c0392b" : condition.durabilityPct < 0.4 ? "#d4a017" : "var(--color-sage)";
          return (
            <div class="card" style={{ marginBottom: "var(--space-3)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              {getGearIcon(equippedShoe.templateId, 28, barColor)}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
                  {template?.name ?? equippedShoe.templateId}
                </div>
                <ProgressBar
                  value={condition.durabilityPct}
                  label={`${Math.round(equippedShoe.durability)} / ${equippedShoe.maxDurability} mi`}
                  color={barColor}
                />
              </div>
              {condition.isWorn && (
                <div style={{ fontSize: "var(--text-xs)", color: "#c0392b", fontWeight: 600, whiteSpace: "nowrap" }}>
                  Replace!
                </div>
              )}
            </div>
          );
        })()}

        <div class="screen__subheader">Runner Stats</div>
        <StatBar label="Endurance" value={stats.endurance} color="var(--color-sage)" />
        <StatBar label="Speed" value={stats.speed} color="#5dade2" />
        <StatBar label="Strength" value={stats.strength} color="var(--color-terracotta)" />
        <StatBar label="Mental" value={stats.mentalToughness} color="#d4a017" />
        <StatBar label="Recovery" value={stats.recovery} color="#8e44ad" />
        <StatBar label="Nutrition" value={stats.nutritionIQ} color="#27ae60" />
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
              <Button
                label="Manage"
                onClick={() => navigateTo("coach")}
                variant="secondary"
              />
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
