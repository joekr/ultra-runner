import { gameState, fitnessLevel } from "../state/gameState";
import { navigateTo, startWorkout } from "../state/actions";
import { GaugeCircle } from "../components/GaugeCircle";
import { Button } from "../components/Button";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatWorkoutName(id: string): string {
  const map: Record<string, string> = {
    easy_run: "Easy Run",
    long_run: "Long Run",
    intervals: "Intervals",
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

  const { runner, condition, calendar, inventory, history } = state;
  const todayPlan = calendar.trainingPlan[calendar.weekDay];
  const fitness = fitnessLevel.value;

  const nextRace = calendar.scheduledRaces.length > 0
    ? calendar.scheduledRaces.reduce((a, b) =>
        a.gameDay <= b.gameDay ? a : b
      )
    : null;

  const daysUntilRace = nextRace
    ? nextRace.gameDay - calendar.gameDay
    : null;

  const recentRaces = history.completedRaces.slice(-3).reverse();

  return (
    <div class="screen">
      <div class="dashboard__runner-info">
        <span class="dashboard__name">{runner.name}</span>
        <span class="dashboard__level">Level {runner.level}</span>
      </div>

      <div class="dashboard__gauges">
        <GaugeCircle
          value={condition.fatigue}
          label="Fatigue"
          color="var(--color-terracotta)"
        />
        <GaugeCircle
          value={condition.energy}
          label="Energy"
          color="var(--color-sage)"
        />
        <GaugeCircle
          value={condition.health}
          label="Health"
          color="#5dade2"
        />
        <GaugeCircle
          value={condition.morale}
          label="Morale"
          color="#d4a017"
        />
      </div>

      <div class="dashboard__fitness">
        <div class="dashboard__fitness-value">{fitness}</div>
        <div class="dashboard__fitness-label">Fitness Level</div>
      </div>

      <div class="dashboard__money">$&thinsp;{inventory.money}</div>

      <div class="dashboard__section">
        <div class="card">
          <div style={{ marginBottom: "var(--space-2)" }}>
            <strong>Today: {DAY_NAMES[calendar.weekDay]}</strong>
          </div>
          <div style={{ fontSize: "var(--text-sm)", color: "var(--color-warm-gray-600)", marginBottom: "var(--space-3)" }}>
            {formatWorkoutName(todayPlan.workout)}
          </div>
          {todayPlan.workout !== "rest" && (
            <Button
              label="Start Training"
              onClick={() => startWorkout(todayPlan.workout)}
            />
          )}
        </div>
      </div>

      {nextRace && (
        <div class="dashboard__section">
          <div class="card">
            <div style={{ marginBottom: "var(--space-1)" }}>
              <strong>Next Race</strong>
            </div>
            <div style={{ fontSize: "var(--text-sm)", color: "var(--color-warm-gray-600)", marginBottom: "var(--space-2)" }}>
              {nextRace.raceId} &mdash; {daysUntilRace} day{daysUntilRace !== 1 ? "s" : ""} away
            </div>
            {daysUntilRace !== null && daysUntilRace <= 0 && (
              <Button
                label="Start Race"
                onClick={() => navigateTo("active_race")}
              />
            )}
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
