import { gameState } from "../state/gameState";
import { registerForRace, startRace } from "../state/actions";
import { Button } from "../components/Button";
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
};

function terrainLabel(terrain: string): string {
  return terrain.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function RaceSelect() {
  const state = gameState.value;
  if (!state) return null;

  const { inventory, flags, calendar } = state;
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
                    Prize: ${race.basePrize}+
                  </div>
                </div>
                {alreadyRegistered ? (
                  <Button
                    label="Registered"
                    onClick={() => {}}
                    variant="secondary"
                    disabled
                  />
                ) : (
                  <Button
                    label="Register"
                    onClick={() => registerForRace(race.id, race.entryFee)}
                    disabled={!canAfford}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {upcomingRaces.length > 0 && (
        <div class="race-select__registered">
          <h2 class="screen__subheader">Upcoming Races</h2>
          {upcomingRaces.map((sr) => {
            const race = races.find((r) => r.id === sr.raceId);
            const daysAway = sr.gameDay - calendar.gameDay;
            const canStart = daysAway <= 0 && calendar.weekDay === 5; // Saturday only
            return (
              <div key={sr.raceId + sr.gameDay} class="card" style={{ marginBottom: "var(--space-2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong>{race?.name ?? sr.raceId}</strong>
                    <div style={{ fontSize: "var(--text-sm)", color: canStart ? "var(--color-terracotta)" : "var(--color-text-muted)" }}>
                      {canStart
                        ? "Race day!"
                        : daysAway === 1
                          ? "Saturday (Tomorrow)"
                          : `Saturday (${daysAway} days away)`}
                    </div>
                  </div>
                  {canStart && (
                    <Button
                      label="Start Race"
                      onClick={() => startRace(sr.raceId)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
