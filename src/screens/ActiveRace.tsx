import { useState } from "preact/hooks";
import { gameState } from "../state/gameState";
import { updateGameState, navigateTo, completeRaceAction, dnfRaceAction } from "../state/actions";
import type { RaceCompletionInfo, DNFCompletionInfo } from "../state/actions";
import { resolveEventChoice, applyDebuffsToSegment, findConsumableByCategory } from "../systems/race";
import type { RaceEvent, RaceEventChoice } from "../systems/race";
import type { RaceDebuff } from "../types";
import { Button } from "../components/Button";
import { ProgressBar } from "../components/ProgressBar";
import { EventModal } from "../components/EventModal";
import { AidStationPanel } from "../components/AidStationPanel";
import racesData from "../data/races.json";
import eventsData from "../data/events.json";
import { fatigueCurveMultiplier } from "../systems/stats";
import { EquippedLoadout } from "../components/EquippedLoadout";
import { getConsumableTemplate } from "../systems/gear";
import type { ConsumableTemplate } from "../systems/gear";
import { getConsumableIcon } from "../components/Icons";
import { xpToStat } from "../state/gameState";

type Pace = "conservative" | "steady" | "aggressive";

interface RaceDefinition {
  id: string;
  name: string;
  distance: number;
  segments: number;
  segmentDefinitions: Array<{ terrain: string; hasAidStation: boolean }>;
}

interface EventDef {
  id: string;
  name: string;
  description: string;
  type: string;
  baseProbability: number;
  terrainTypes: string[];
  minTier: number;
  minSegment?: number;
  oncePerRace?: boolean;
  statCheck?: string | null;
  gearCheck?: string;
  effect: Record<string, number> | null;
  choices: RaceEventChoice[] | null;
  autoDebuff?: RaceDebuff;
}

function formatRaceTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const FUEL_CATEGORY_LABELS: Record<string, string> = {
  gel: "Gel",
  chew: "Chew",
  food: "Food",
  drink: "Drink",
};

function formatDistanceLabel(key: string): string {
  const labels: Record<string, string> = {
    "5k": "5K",
    "10k": "10K",
    "half_marathon": "Half Marathon",
    "marathon": "Marathon",
  };
  return labels[key] ?? key;
}

export function ActiveRace() {
  const state = gameState.value;
  const activeRace = state?.race.active;

  const [pendingEvent, setPendingEvent] = useState<EventDef | null>(null);
  const [outcomeText, setOutcomeText] = useState<string | null>(null);
  const [showAidStation, setShowAidStation] = useState(false);
  const [showFuelPicker, setShowFuelPicker] = useState(false);
  const [usedCategoriesThisSegment, setUsedCategoriesThisSegment] = useState<Set<string>>(new Set());
  const [fuelMessage, setFuelMessage] = useState<string | null>(null);
  const [raceResult, setRaceResult] = useState<RaceCompletionInfo | null>(null);
  const [dnfResult, setDnfResult] = useState<DNFCompletionInfo | null>(null);
  const [debuffWarning, setDebuffWarning] = useState<string | null>(null);
  const [newDebuffFlash, setNewDebuffFlash] = useState<string | null>(null);

  if (!state || !activeRace) {
    // Check if we have a result to show (race just completed and state was updated)
    if (raceResult) {
      return renderFinishScreen();
    }
    if (dnfResult) {
      return renderDNFScreen();
    }
    return (
      <div class="active-race">
        <div style={{ textAlign: "center", paddingTop: "var(--space-16)" }}>
          <h2>No Active Race</h2>
          <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>
            Register for a race first.
          </p>
          <Button label="Back to Races" onClick={() => navigateTo("races")} />
        </div>
      </div>
    );
  }

  const raceData = (racesData as RaceDefinition[]).find(
    (r) => r.id === activeRace.raceId,
  );
  const raceName = raceData?.name ?? activeRace.raceId;
  const raceDistance = raceData?.distance ?? 0;
  const segDef = raceData?.segmentDefinitions[activeRace.currentSegment];

  function choosePace(pace: Pace) {
    if (!state || !activeRace || raceResult || dnfResult) return;

    // Simple segment simulation
    const paceModifiers: Record<Pace, number> = {
      conservative: 1.15,
      steady: 1.0,
      aggressive: 0.88,
    };

    const basePace = 600; // 10 min/mi base in seconds
    const segmentTime = Math.round(
      basePace * paceModifiers[pace] * (1 + activeRace.fatigue / 200),
    );

    const energyCost: Record<Pace, number> = {
      conservative: 5,
      steady: 8,
      aggressive: 14,
    };

    const baseFatigueCost: Record<Pace, number> = {
      conservative: 4,
      steady: 7,
      aggressive: 12,
    };

    // Fitness reduces fatigue accumulation during races
    const fitnessMult = state ? fatigueCurveMultiplier(state.stats, state.runner.level) : 1;
    const fatigueCost = baseFatigueCost[pace] * fitnessMult;

    const moraleDelta: Record<Pace, number> = {
      conservative: 1,
      steady: 0,
      aggressive: -2,
    };

    const newEnergy = Math.max(0, activeRace.energy - energyCost[pace]);
    const newFatigue = Math.min(100, activeRace.fatigue + fatigueCost);
    const newMorale = Math.max(
      0,
      Math.min(100, activeRace.morale + moraleDelta[pace]),
    );

    // Position delta (simplified)
    const positionDelta =
      pace === "aggressive" ? -3 : pace === "conservative" ? 2 : 0;
    const newPosition = Math.max(
      1,
      Math.min(activeRace.totalRunners, activeRace.position + positionDelta),
    );

    const newSegment = activeRace.currentSegment + 1;
    const isComplete = newSegment >= activeRace.totalSegments;

    // Apply debuffs to segment
    const preDebuffRace = {
      ...activeRace,
      energy: newEnergy,
      fatigue: newFatigue,
      morale: newMorale,
      raceDebuffs: activeRace.raceDebuffs ?? [],
    };
    const { race: postDebuffRace, speedMultiplier, warning } = applyDebuffsToSegment(preDebuffRace);

    // Apply speed penalty from debuffs to segment time
    const adjustedSegmentTime = Math.round(segmentTime * speedMultiplier);

    if (warning) {
      setDebuffWarning(warning);
      setTimeout(() => setDebuffWarning(null), 3000);
    }

    const segmentResult = {
      segment: activeRace.currentSegment,
      time: adjustedSegmentTime,
      events: [] as string[],
      statChanges: {},
    };

    const updatedRace = {
      ...postDebuffRace,
      currentSegment: newSegment,
      elapsedTime: activeRace.elapsedTime + adjustedSegmentTime,
      position: newPosition,
      pacePerSegment: [...activeRace.pacePerSegment, pace],
      segmentResults: [...activeRace.segmentResults, segmentResult],
    };

    // Auto-DNF checks
    if (updatedRace.morale <= 0) {
      updateGameState({ race: { active: updatedRace } });
      const info = dnfRaceAction("Lost the will to continue");
      if (info) setDnfResult(info);
      return;
    }
    if (updatedRace.fatigue >= 100 && updatedRace.energy <= 0) {
      updateGameState({ race: { active: updatedRace } });
      const info = dnfRaceAction("Complete exhaustion");
      if (info) setDnfResult(info);
      return;
    }

    updateGameState({
      race: { active: updatedRace },
    });

    if (isComplete) {
      // Use the real race completion system
      const info = completeRaceAction();
      if (info) {
        setRaceResult(info);
      }
      return;
    }

    // Check for random event (simplified)
    const eventRoll = Math.random();
    if (eventRoll < 0.3) {
      const currentState = gameState.value;
      const currentRace = currentState?.race.active;
      if (currentRace) {
        const rDef = (racesData as RaceDefinition[]).find(r => r.id === currentRace.raceId);
        const raceTier = (rDef as any)?.tier ?? 1;
        const validEvents = (eventsData as EventDef[]).filter((e) => {
          if (e.minTier > raceTier) return false;
          if (e.minSegment !== undefined && e.minSegment > currentRace.currentSegment) return false;
          return true;
        });
        if (validEvents.length > 0) {
          const randomEvent = validEvents[Math.floor(Math.random() * validEvents.length)];

          // Auto-apply events (no choices) get resolved immediately
          if (!randomEvent.choices || randomEvent.choices.length === 0) {
            const { race: autoRace, newDebuffs } = resolveEventChoice(
              randomEvent as RaceEvent,
              0,
              currentRace,
              currentState?.stats,
            );
            updateGameState({ race: { active: autoRace } });

            if (newDebuffs.length > 0) {
              setNewDebuffFlash(newDebuffs[0].name);
              setTimeout(() => setNewDebuffFlash(null), 2000);
            }

            // Show the event description briefly
            setOutcomeText(`${randomEvent.name}: ${randomEvent.description}`);
            setTimeout(() => {
              setOutcomeText(null);
              setUsedCategoriesThisSegment(new Set());
              setShowFuelPicker(true);
            }, 2000);
            return;
          }

          // Event with choices — show modal
          setPendingEvent(randomEvent);
          return;
        }
      }
    }

    // Reset fuel categories for the new segment and show fuel picker
    setUsedCategoriesThisSegment(new Set());
    setShowFuelPicker(true);
  }

  function handleUseFuel(templateId: string) {
    const current = gameState.value;
    if (!current || !current.race.active) return;

    const tmpl = getConsumableTemplate(templateId);
    if (!tmpl) return;

    const owned = current.inventory.consumables[templateId] ?? 0;
    if (owned <= 0) return;

    // Check nutrition IQ requirement
    const nutritionStat = xpToStat(current.stats.nutritionIQ.trainingXp);
    if (nutritionStat < tmpl.requiredNutritionIQ) return;

    // Check if category already used this segment
    if (usedCategoriesThisSegment.has(tmpl.fuelCategory)) return;

    // Apply fuel
    const race = current.race.active;
    const newFatigue = Math.max(0, race.fatigue - tmpl.effects.fatigueReduction);
    const energyBoost = tmpl.effects.fatigueReduction * 0.5;
    const newEnergy = Math.min(100, race.energy + energyBoost);
    const newMorale = Math.min(100, race.morale + 2); // eating boosts morale

    updateGameState({
      race: {
        active: { ...race, fatigue: newFatigue, energy: newEnergy, morale: newMorale },
      },
      inventory: {
        ...current.inventory,
        consumables: {
          ...current.inventory.consumables,
          [templateId]: owned - 1,
        },
      },
    });

    setUsedCategoriesThisSegment((prev) => new Set([...prev, tmpl.fuelCategory]));
    setFuelMessage(`${tmpl.name} — fatigue -${tmpl.effects.fatigueReduction}, energy +${energyBoost.toFixed(0)}`);
    setTimeout(() => setFuelMessage(null), 2000);
  }

  function handleCloseFuelPicker() {
    setShowFuelPicker(false);
    // After fuel picker, check for aid station
    if (segDef?.hasAidStation) {
      setShowAidStation(true);
    }
  }

  function handleEventChoice(index: number) {
    if (!pendingEvent || !state || !state.race.active) {
      setPendingEvent(null);
      return;
    }

    const choice = pendingEvent.choices?.[index];

    // Handle consumable requirement: deduct from inventory
    if (choice?.requiresConsumable) {
      const category = choice.requiresConsumable;
      const templateId = findConsumableByCategory(
        state.inventory.consumables,
        category,
        (id) => getConsumableTemplate(id),
      );
      if (templateId) {
        const owned = state.inventory.consumables[templateId] ?? 0;
        updateGameState({
          inventory: {
            ...state.inventory,
            consumables: {
              ...state.inventory.consumables,
              [templateId]: owned - 1,
            },
          },
        });
      }
    }

    // Wire up resolveEventChoice from race.ts
    const { race: updatedRace, outcomeText: text, newDebuffs, dnfReason } = resolveEventChoice(
      pendingEvent as RaceEvent,
      index,
      state.race.active,
      state.stats,
    );

    // Handle DNF from event choice (e.g. twisted ankle drop out)
    if (dnfReason) {
      updateGameState({ race: { active: updatedRace } });
      const info = dnfRaceAction(dnfReason);
      if (info) setDnfResult(info);
      setPendingEvent(null);
      return;
    }

    // Apply the updated race state
    updateGameState({
      race: { active: updatedRace },
    });

    // Flash new debuffs
    if (newDebuffs.length > 0) {
      setNewDebuffFlash(newDebuffs[0].name);
      setTimeout(() => setNewDebuffFlash(null), 2000);
    }

    // Show outcome text briefly
    setPendingEvent(null);
    setOutcomeText(text);

    // Auto-dismiss outcome after 2 seconds, then show fuel picker
    setTimeout(() => {
      setOutcomeText(null);
      // Reset fuel categories for the new segment and show fuel picker
      setUsedCategoriesThisSegment(new Set());
      setShowFuelPicker(true);
    }, 2000);
  }

  function handleAidStation(timeSpent: number) {
    if (!state || !activeRace) return;

    const recoveryPct = Math.min(20, timeSpent / 15);
    const updatedRace = {
      ...activeRace,
      elapsedTime: activeRace.elapsedTime + timeSpent,
      energy: Math.min(100, activeRace.energy + recoveryPct),
      fatigue: Math.max(0, activeRace.fatigue - recoveryPct * 0.5),
      morale: Math.min(100, activeRace.morale + 3),
    };

    updateGameState({ race: { active: updatedRace } });
    setShowAidStation(false);
  }

  function handleDNF() {
    if (!state || !activeRace) return;

    const info = dnfRaceAction("Dropped out");
    if (info) {
      setDnfResult(info);
    }
  }

  // ── Results screens ─────────────────────────────────────────────────

  function renderFinishScreen() {
    if (!raceResult) return null;
    const { result, leveledUp, newLevel, newUnlocks, levelPerks } = raceResult;
    const percentile = Math.round((result.position / result.totalRunners) * 100);

    return (
      <div class="active-race" style={{ padding: "var(--space-6)" }}>
        <div style={{ textAlign: "center" }}>
          {result.isPR && (
            <div style={{
              fontSize: "var(--text-3xl, 2rem)",
              fontWeight: 800,
              color: "#d4a017",
              textShadow: "0 0 20px rgba(212, 160, 23, 0.4)",
              marginBottom: "var(--space-3)",
              animation: "pulse 1.5s ease-in-out infinite",
            }}>
              PERSONAL BEST!
            </div>
          )}

          <div style={{
            fontSize: "var(--text-3xl, 2rem)",
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            marginBottom: "var(--space-2)",
          }}>
            {formatRaceTime(result.finishTime)}
          </div>

          <div style={{
            fontSize: "var(--text-lg, 1.125rem)",
            color: "var(--color-text-muted)",
            marginBottom: "var(--space-4)",
          }}>
            {ordinal(result.position)} / {result.totalRunners} — top {percentile}%
          </div>

          <div style={{
            display: "flex",
            justifyContent: "center",
            gap: "var(--space-6)",
            marginBottom: "var(--space-4)",
          }}>
            <div>
              <div style={{ fontSize: "var(--text-xl, 1.25rem)", fontWeight: 600, color: "var(--color-sage)" }}>
                +{result.xpEarned} XP
              </div>
              <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                Experience
              </div>
            </div>
            <div>
              <div style={{ fontSize: "var(--text-xl, 1.25rem)", fontWeight: 600, color: "var(--color-sage)" }}>
                ${result.moneyEarned}
              </div>
              <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                Prize Money
              </div>
            </div>
          </div>

          {leveledUp && (
            <div style={{
              background: "var(--color-surface, #2a2a2a)",
              border: "2px solid #d4a017",
              borderRadius: "var(--radius-lg, 12px)",
              padding: "var(--space-4)",
              marginBottom: "var(--space-4)",
              textAlign: "center",
            }}>
              <div style={{ fontSize: "var(--text-lg, 1.125rem)", fontWeight: 700, color: "#d4a017" }}>
                Level Up!
              </div>
              <div style={{ color: "var(--color-text-muted)" }}>
                You're now Level {newLevel}
              </div>
              {newUnlocks.length > 0 && (
                <div style={{ marginTop: "var(--space-2)", color: "var(--color-sage)" }}>
                  {newUnlocks.map((d) => (
                    <div key={d}>{formatDistanceLabel(d)} races are now available!</div>
                  ))}
                </div>
              )}
              {levelPerks.length > 0 && (
                <div style={{
                  marginTop: "var(--space-3)",
                  textAlign: "left",
                  background: "rgba(122, 139, 111, 0.1)",
                  borderRadius: "var(--radius-md, 8px)",
                  padding: "var(--space-2) var(--space-3)",
                }}>
                  <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--color-sage)", marginBottom: "var(--space-1)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Stats Improved
                  </div>
                  {levelPerks.map((perk, i) => (
                    <div key={i} style={{ fontSize: "var(--text-sm)", color: "var(--color-text)", padding: "2px 0" }}>
                      {perk}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!leveledUp && newUnlocks.length > 0 && (
            <div style={{
              background: "var(--color-surface, #2a2a2a)",
              border: "1px solid var(--color-sage)",
              borderRadius: "var(--radius-lg, 12px)",
              padding: "var(--space-3)",
              marginBottom: "var(--space-4)",
            }}>
              {newUnlocks.map((d) => (
                <div key={d} style={{ color: "var(--color-sage)" }}>
                  {formatDistanceLabel(d)} races are now available!
                </div>
              ))}
            </div>
          )}

          <Button label="Continue" onClick={() => navigateTo("dashboard")} />
        </div>
      </div>
    );
  }

  function renderDNFScreen() {
    if (!dnfResult) return null;
    const { result, leveledUp, newLevel, newUnlocks } = dnfResult;

    return (
      <div class="active-race" style={{ padding: "var(--space-6)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontSize: "var(--text-2xl, 1.5rem)",
            fontWeight: 700,
            marginBottom: "var(--space-3)",
          }}>
            DNF
          </div>

          <p style={{
            color: "var(--color-text-muted)",
            fontStyle: "italic",
            marginBottom: "var(--space-4)",
            lineHeight: 1.6,
          }}>
            Not every run ends at the finish line. But every run teaches you something.
          </p>

          {result.xpEarned > 0 && (
            <div style={{ marginBottom: "var(--space-4)" }}>
              <div style={{ fontSize: "var(--text-lg, 1.125rem)", fontWeight: 600, color: "var(--color-sage)" }}>
                +{result.xpEarned} XP
              </div>
              <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                Partial experience earned
              </div>
            </div>
          )}

          {leveledUp && (
            <div style={{
              background: "var(--color-surface, #2a2a2a)",
              border: "2px solid #d4a017",
              borderRadius: "var(--radius-lg, 12px)",
              padding: "var(--space-4)",
              marginBottom: "var(--space-4)",
            }}>
              <div style={{ fontSize: "var(--text-lg, 1.125rem)", fontWeight: 700, color: "#d4a017" }}>
                Level Up!
              </div>
              <div style={{ color: "var(--color-text-muted)" }}>
                You're now Level {newLevel}
              </div>
              {newUnlocks.length > 0 && (
                <div style={{ marginTop: "var(--space-2)", color: "var(--color-sage)" }}>
                  {newUnlocks.map((d) => (
                    <div key={d}>{formatDistanceLabel(d)} races are now available!</div>
                  ))}
                </div>
              )}
            </div>
          )}

          <Button label="Continue" onClick={() => navigateTo("dashboard")} />
        </div>
      </div>
    );
  }

  // If we have a result, show the results screen
  if (raceResult) return renderFinishScreen();
  if (dnfResult) return renderDNFScreen();

  return (
    <div class="active-race">
      <div class="active-race__header">
        <div class="active-race__name">{raceName}</div>
        <div class="active-race__distance">{raceDistance} miles</div>
        <div style={{ marginTop: "var(--space-1)" }}>
          <EquippedLoadout compact />
        </div>
      </div>

      {/* Segment dots */}
      <div class="active-race__segments">
        {Array.from({ length: activeRace.totalSegments }).map((_, i) => (
          <div
            key={i}
            class={`active-race__segment-dot ${
              i < activeRace.currentSegment
                ? "active-race__segment-dot--done"
                : i === activeRace.currentSegment
                  ? "active-race__segment-dot--current"
                  : ""
            }`}
          />
        ))}
      </div>

      <div class="active-race__position">
        #{activeRace.position} / {activeRace.totalRunners}
      </div>

      {segDef && (
        <div class="active-race__terrain">
          {segDef.terrain.replace(/_/g, " ")}
        </div>
      )}

      <div style={{ fontSize: "var(--text-sm)", textAlign: "center", color: "var(--color-text-muted)", marginBottom: "var(--space-3)" }}>
        Time: {formatRaceTime(activeRace.elapsedTime)}
      </div>

      {/* Pace buttons */}
      <div class="active-race__paces">
        <Button
          label="Conservative"
          onClick={() => choosePace("conservative")}
          variant="secondary"
        />
        <Button
          label="Steady"
          onClick={() => choosePace("steady")}
        />
        <Button
          label="Aggressive"
          onClick={() => choosePace("aggressive")}
          variant="danger"
        />
      </div>

      {/* Gauges */}
      <div class="active-race__gauges">
        <ProgressBar
          value={activeRace.energy / 100}
          label="Energy"
          color="var(--color-sage)"
        />
        <ProgressBar
          value={activeRace.fatigue / 100}
          label="Fatigue"
          color="var(--color-terracotta)"
        />
        <ProgressBar
          value={activeRace.morale / 100}
          label="Morale"
          color="#d4a017"
        />
      </div>

      {/* Active Debuffs */}
      {(activeRace.raceDebuffs ?? []).length > 0 && (
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--space-1)",
          justifyContent: "center",
          marginBottom: "var(--space-3)",
        }}>
          {(activeRace.raceDebuffs ?? []).map((debuff, i) => (
            <div
              key={`${debuff.id}-${i}`}
              style={{
                background: debuff.speedPenalty < 1 ? "var(--color-sage)" : "#c0392b",
                color: "#fff",
                fontSize: "var(--text-xs)",
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: "var(--radius-md, 8px)",
                animation: newDebuffFlash === debuff.name ? "pulse 0.5s ease-in-out 3" : undefined,
              }}
            >
              {debuff.name} ({debuff.segmentsRemaining === -1 ? "rest of race" : `${debuff.segmentsRemaining} seg`})
            </div>
          ))}
        </div>
      )}

      {/* Debuff Warning */}
      {debuffWarning && (
        <div style={{
          textAlign: "center",
          color: "#c0392b",
          fontWeight: 700,
          fontSize: "var(--text-sm)",
          marginBottom: "var(--space-2)",
          animation: "pulse 1s ease-in-out infinite",
        }}>
          {debuffWarning}
        </div>
      )}

      <div class="active-race__drop-out">
        <Button
          label="Drop Out (DNF)"
          onClick={handleDNF}
          variant="danger"
        />
      </div>

      {/* Outcome text overlay */}
      {outcomeText && (
        <div class="modal-overlay">
          <div class="modal-content" style={{ textAlign: "center" }}>
            <p style={{ marginBottom: "var(--space-3)", lineHeight: 1.5 }}>
              {outcomeText}
            </p>
          </div>
        </div>
      )}

      {/* Event Modal */}
      {pendingEvent && !outcomeText && (
        <EventModal
          event={{
            name: pendingEvent.name,
            description: pendingEvent.description,
            choices: pendingEvent.choices ? pendingEvent.choices.map((c) => {
              if (c.requiresConsumable) {
                const hasItem = state ? findConsumableByCategory(
                  state.inventory.consumables,
                  c.requiresConsumable,
                  (id) => getConsumableTemplate(id),
                ) !== null : false;
                return {
                  label: c.label,
                  disabled: !hasItem,
                  disabledReason: !hasItem ? "(no items)" : undefined,
                };
              }
              return { label: c.label };
            }) : null,
          }}
          onChoice={handleEventChoice}
        />
      )}

      {/* Fuel Picker */}
      {showFuelPicker && !pendingEvent && !outcomeText && (
        <div class="modal-overlay">
          <div style={{
            background: "var(--color-bg, #fff)",
            borderRadius: "var(--radius-lg, 12px)",
            padding: "var(--space-4)",
            maxWidth: "360px",
            width: "calc(100% - 32px)",
            maxHeight: "70vh",
            overflowY: "auto",
          }}>
            <div style={{ fontWeight: 700, marginBottom: "var(--space-2)", textAlign: "center" }}>
              Fuel Up
            </div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", textAlign: "center", marginBottom: "var(--space-3)" }}>
              One item per category per segment
            </div>
            {(() => {
              const consumables = state.inventory.consumables;
              const nutritionStat = xpToStat(state.stats.nutritionIQ.trainingXp);
              const available = Object.entries(consumables)
                .filter(([, qty]) => qty > 0)
                .map(([id, qty]) => ({ id, qty, tmpl: getConsumableTemplate(id) }))
                .filter((item): item is { id: string; qty: number; tmpl: ConsumableTemplate } => item.tmpl != null);

              if (available.length === 0) {
                return (
                  <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", textAlign: "center", marginBottom: "var(--space-3)" }}>
                    No fuel available. Buy some from the shop!
                  </div>
                );
              }

              // Group by category
              const categories = ["gel", "chew", "food", "drink"] as const;
              return categories.map((cat) => {
                const items = available.filter((a) => a.tmpl.fuelCategory === cat);
                if (items.length === 0) return null;
                const categoryUsed = usedCategoriesThisSegment.has(cat);
                return (
                  <div key={cat} style={{ marginBottom: "var(--space-2)" }}>
                    <div style={{
                      fontSize: "var(--text-xs)",
                      fontWeight: 700,
                      color: categoryUsed ? "var(--color-text-muted)" : "var(--color-warm-gray-600)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: "var(--space-1)",
                    }}>
                      {FUEL_CATEGORY_LABELS[cat]} {categoryUsed && "— used"}
                    </div>
                    {items.map(({ id, qty, tmpl }) => {
                      const locked = nutritionStat < tmpl.requiredNutritionIQ;
                      const disabled = categoryUsed || locked;
                      return (
                        <div key={id} style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--space-2)",
                          padding: "var(--space-1) 0",
                          opacity: disabled ? 0.5 : 1,
                        }}>
                          {getConsumableIcon(id, 22, disabled ? "var(--color-warm-gray-300)" : "var(--color-sage)")}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
                              {tmpl.name} <span style={{ fontWeight: 400, color: "var(--color-text-muted)" }}>x{qty}</span>
                            </div>
                            {locked ? (
                              <div style={{ fontSize: "var(--text-xs)", color: "#c0392b" }}>
                                Nutrition IQ {tmpl.requiredNutritionIQ} needed
                              </div>
                            ) : (
                              <div style={{ fontSize: "var(--text-xs)", color: "var(--color-sage)" }}>
                                -{tmpl.effects.fatigueReduction} fatigue, +{(tmpl.effects.fatigueReduction * 0.5).toFixed(0)} energy
                              </div>
                            )}
                          </div>
                          <Button
                            label="Use"
                            onClick={() => handleUseFuel(id)}
                            disabled={disabled}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              });
            })()}
            {fuelMessage && (
              <div style={{
                textAlign: "center",
                fontSize: "var(--text-sm)",
                color: "var(--color-sage)",
                fontWeight: 600,
                marginBottom: "var(--space-2)",
              }}>
                {fuelMessage}
              </div>
            )}
            <div style={{ marginTop: "var(--space-3)" }}>
              <Button label="Continue" onClick={handleCloseFuelPicker} />
            </div>
          </div>
        </div>
      )}

      {/* Aid Station */}
      {showAidStation && (
        <div class="modal-overlay">
          <AidStationPanel onContinue={handleAidStation} />
        </div>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
