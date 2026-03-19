import { gameState } from "../state/gameState";
import { registerForRace, startRace, withdrawFromRace } from "../state/actions";
import { Button } from "../components/Button";
import { racePrize } from "../systems/economy";
import racesData from "../data/races.json";
import { MountainIcon } from "../components/Icons";

interface RaceDefinition {
  id: string;
  name: string;
  distance: number;
  unit: string;
  tier: number;
  terrain: string;
  segments: number;
  entryFee: number;
  basePrize: number;
  fieldSize: number[];
  cutoffMinutes: number | null;
  description: string;
}

const TIER_TO_DISTANCE: Record<number, string> = {
  1: "5k",
  2: "10k",
  3: "half_marathon",
  4: "marathon",
  5: "50k",
  6: "50_mile",
  7: "100k",
  8: "100_mile",
  9: "200_mile",
  10: "barkley",
};

// All distance tiers including future locked ones
const ALL_DISTANCE_TIERS = [
  { key: "5k", label: "5K", unlockLevel: 1 },
  { key: "10k", label: "10K", unlockLevel: 3 },
  { key: "half_marathon", label: "Half Marathon", unlockLevel: 5 },
  { key: "marathon", label: "Marathon", unlockLevel: 8 },
  { key: "50k", label: "50K", unlockLevel: 12 },
  { key: "50_mile", label: "50 Mile", unlockLevel: 18 },
  { key: "100k", label: "100K", unlockLevel: 24 },
  { key: "100_mile", label: "100 Mile", unlockLevel: 32 },
  { key: "200_mile", label: "200+ Mile", unlockLevel: 42 },
  { key: "barkley", label: "Barkley Marathons", unlockLevel: 50 },
];

function terrainLabel(terrain: string): string {
  return terrain.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function RaceSelect() {
  const state = gameState.value;
  if (!state) return null;

  const { inventory, flags, calendar, history, runner } = state;
  const races = racesData as RaceDefinition[];

  const availableRaces = races.filter((race) => {
    const distKey = TIER_TO_DISTANCE[race.tier];
    return distKey && flags.unlockedDistances.includes(distKey);
  });

  const registeredIds = new Set(
    calendar.scheduledRaces.map((sr) => sr.raceId),
  );

  const upcomingRaces = calendar.scheduledRaces.filter(
    (sr) => sr.gameDay >= calendar.gameDay,
  );

  const hasUpcomingRace = upcomingRaces.length > 0;

  return (
    <div class="screen">
      <h1 class="screen__header">Races</h1>

      <div class="race-select__list">
        {availableRaces.map((race) => {
          const canAfford = inventory.money >= race.entryFee;
          const alreadyRegistered = registeredIds.has(race.id);

          return (
            <div
              key={race.id}
              class={`card race-card ${!canAfford && !alreadyRegistered ? "card--disabled" : ""}`}
            >
              <div class="race-card__header">
                <MountainIcon size={18} color="var(--color-warm-gray-400)" />
                <span class="race-card__name">{race.name}</span>
                <span class="race-card__distance">
                  {race.distance} {race.unit}
                </span>
              </div>
              <div class="race-card__terrain">
                {terrainLabel(race.terrain)} &middot; {race.segments} segments
              </div>
              <div class="race-card__description">{race.description}</div>
              <div class="race-card__footer">
                <div>
                  <div class="race-card__cost">
                    Entry: {race.entryFee === 0
                      ? <span style={{ color: "var(--color-sage)", fontWeight: 700 }}>FREE</span>
                      : `$${race.entryFee}`}
                  </div>
                  <div class="race-card__prize">
                    Prize: ${racePrize(race.tier, 1, 100)}-{racePrize(race.tier, 50, 100)}
                  </div>
                </div>
                {alreadyRegistered ? (
                  <Button
                    label="Registered"
                    onClick={() => {}}
                    variant="secondary"
                    disabled
                  />
                ) : hasUpcomingRace ? (
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", fontStyle: "italic" }}>
                    Finish current race first
                  </span>
                ) : (
                  <Button
                    label={race.entryFee === 0 ? "Register" : `Register ($${race.entryFee})`}
                    onClick={() => registerForRace(race.id, race.entryFee)}
                    disabled={!canAfford}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Locked distance tiers */}
      {(() => {
        const lockedTiers = ALL_DISTANCE_TIERS.filter(
          (t) => !flags.unlockedDistances.includes(t.key),
        );
        if (lockedTiers.length === 0) return null;
        return (
          <div style={{ marginTop: "var(--space-4)" }}>
            <h2 class="screen__subheader">Coming Soon</h2>
            {lockedTiers.map((tier) => (
              <div
                key={tier.key}
                class="card"
                style={{
                  marginBottom: "var(--space-2)",
                  opacity: 0.5,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>{tier.label}</div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                    Unlocks at Level {tier.unlockLevel}
                  </div>
                </div>
                <div style={{
                  fontSize: "var(--text-xs)",
                  color: runner.level >= tier.unlockLevel - 3
                    ? "#d4a017"
                    : "var(--color-text-muted)",
                  fontWeight: 600,
                }}>
                  {runner.level >= tier.unlockLevel - 3
                    ? `${tier.unlockLevel - runner.level} levels away!`
                    : `Lv ${tier.unlockLevel}`}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {calendar.scheduledRaces.length > 0 && (
        <div class="race-select__registered">
          <h2 class="screen__subheader">Registered Races</h2>
          {calendar.scheduledRaces.map((sr) => {
            const race = races.find((r) => r.id === sr.raceId);
            const daysAway = sr.gameDay - calendar.gameDay;
            const canStart = daysAway <= 0 && calendar.weekDay === 5;
            const missed = daysAway < 0;
            return (
              <div
                key={sr.raceId + sr.gameDay}
                class="card"
                style={{
                  marginBottom: "var(--space-2)",
                  borderLeft: missed ? "3px solid #c0392b" : canStart ? "3px solid var(--color-terracotta)" : undefined,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong>{race?.name ?? sr.raceId}</strong>
                    <div style={{
                      fontSize: "var(--text-sm)",
                      color: missed ? "#c0392b" : canStart ? "var(--color-terracotta)" : "var(--color-text-muted)",
                    }}>
                      {missed
                        ? "Missed — race day has passed"
                        : canStart
                          ? "Race day!"
                          : daysAway === 1
                            ? "Saturday (Tomorrow)"
                            : `Saturday (${daysAway} days away)`}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-1)" }}>
                    {canStart && (
                      <Button
                        label="Start Race"
                        onClick={() => startRace(sr.raceId)}
                      />
                    )}
                    <Button
                      label={missed ? "Clear" : "Withdraw"}
                      onClick={() => withdrawFromRace(sr.raceId)}
                      variant={missed ? "danger" : "secondary"}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Race History */}
      {history.completedRaces.length > 0 && (
        <div class="race-select__history">
          <h2 class="screen__subheader">Race History</h2>
          {[...history.completedRaces].reverse().map((race, i) => {
            const raceDef = races.find((r) => r.id === race.raceId);
            const h = Math.floor(race.finishTime / 3600);
            const m = Math.floor((race.finishTime % 3600) / 60);
            const s = Math.floor(race.finishTime % 60);
            const timeStr = `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
            return (
              <div key={i} class="card" style={{ marginBottom: "var(--space-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>
                    {raceDef?.name ?? race.raceId}
                    {race.personalBest && (
                      <span style={{ color: "#d4a017", marginLeft: "var(--space-1)" }}>PR</span>
                    )}
                  </div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                    {race.result === "dnf"
                      ? "DNF"
                      : `${timeStr} — #${race.position}/${race.totalRunners}`}
                  </div>
                </div>
                <div style={{ textAlign: "right", fontSize: "var(--text-xs)" }}>
                  {race.moneyEarned > 0 && (
                    <div style={{ color: "var(--color-sage)" }}>+${race.moneyEarned}</div>
                  )}
                  <div style={{ color: "var(--color-text-muted)" }}>+{race.xpEarned} XP</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
