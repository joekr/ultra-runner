import { gameState, statValues } from "../state/gameState";
import { navigateTo } from "../state/actions";
import { xpToNextLevel } from "../systems/progression";
import { StatBar } from "../components/StatBar";
import { ProgressBar } from "../components/ProgressBar";
import achievementsData from "../data/achievements.json";

interface AchievementDef {
  id: string;
  name: string;
  description: string;
  category: string;
}

const PB_DISTANCES: Array<{ key: string; label: string }> = [
  { key: "5k", label: "5K" },
  { key: "10k", label: "10K" },
  { key: "half_marathon", label: "Half Marathon" },
  { key: "marathon", label: "Marathon" },
];

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function StatsView() {
  const state = gameState.value;
  if (!state) return null;

  const { runner, training, history } = state;
  const stats = statValues.value;
  const levelProgress = xpToNextLevel(runner.xp);
  const allAchievements = achievementsData as AchievementDef[];
  const earnedSet = new Set(history.achievements);

  return (
    <div class="screen">
      <div class="stats-view__header">
        <h1 class="screen__header" style={{ marginBottom: 0 }}>Stats</h1>
        <button
          class="stats-view__settings-btn"
          onClick={() => navigateTo("settings")}
          aria-label="Settings"
        >
          {"\u2699"}
        </button>
      </div>

      {/* Level + XP */}
      <div style={{ marginBottom: "var(--space-4)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-1)" }}>
          <span style={{ fontWeight: 700 }}>Level {runner.level}</span>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
            {levelProgress.current} / {levelProgress.needed} XP
          </span>
        </div>
        <ProgressBar value={levelProgress.progress} color="var(--color-terracotta)" />
      </div>

      {/* Stats */}
      <div class="stats-view__stats">
        <StatBar label="Endurance" value={stats.endurance} color="var(--color-terracotta)" />
        <StatBar label="Speed" value={stats.speed} color="var(--color-sage)" />
        <StatBar label="Strength" value={stats.strength} color="var(--color-stone)" />
        <StatBar label="Mental" value={stats.mentalToughness} color="#5dade2" />
        <StatBar label="Recovery" value={stats.recovery} color="#d4a017" />
        <StatBar label="Nutrition IQ" value={stats.nutritionIQ} color="var(--color-sage-dark)" />
      </div>

      {/* Lifetime Stats */}
      <div class="stats-view__section">
        <h2 class="screen__subheader">Lifetime</h2>
        <div class="stats-view__lifetime">
          <div class="stats-view__lifetime-item">
            <div class="stats-view__lifetime-value">
              {training.totalMiles.toFixed(1)}
            </div>
            <div class="stats-view__lifetime-label">Total Miles</div>
          </div>
          <div class="stats-view__lifetime-item">
            <div class="stats-view__lifetime-value">
              {history.totalRacesFinished}
            </div>
            <div class="stats-view__lifetime-label">Races Finished</div>
          </div>
          <div class="stats-view__lifetime-item">
            <div class="stats-view__lifetime-value">
              {history.totalRacesDNF}
            </div>
            <div class="stats-view__lifetime-label">DNFs</div>
          </div>
          <div class="stats-view__lifetime-item">
            <div class="stats-view__lifetime-value">
              {history.completedRaces.filter((r) => r.personalBest).length}
            </div>
            <div class="stats-view__lifetime-label">PRs</div>
          </div>
        </div>
      </div>

      {/* Personal Bests */}
      <div class="stats-view__section">
        <h2 class="screen__subheader">Personal Bests</h2>
        <div class="stats-view__pb-list">
          {PB_DISTANCES.map((d) => {
            const pb = history.personalBests[d.key];
            return (
              <div key={d.key} class="stats-view__pb-row">
                <span>{d.label}</span>
                <span style={{ fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                  {pb != null ? formatTime(pb) : "\u2014"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Achievements */}
      <div class="stats-view__section">
        <h2 class="screen__subheader">
          Achievements ({earnedSet.size} / {allAchievements.length})
        </h2>
        <div class="stats-view__achievements">
          {allAchievements.map((ach) => {
            const earned = earnedSet.has(ach.id);
            return (
              <div
                key={ach.id}
                class={`stats-view__achievement ${earned ? "stats-view__achievement--earned" : "stats-view__achievement--locked"}`}
              >
                <div>
                  <div class="stats-view__achievement-name">
                    {earned ? "\u2713 " : "\u25CB "}
                    {ach.name}
                  </div>
                  <div class="stats-view__achievement-desc">
                    {ach.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
