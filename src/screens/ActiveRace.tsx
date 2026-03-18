import { useState } from "preact/hooks";
import { gameState } from "../state/gameState";
import { updateGameState, navigateTo } from "../state/actions";
import { Button } from "../components/Button";
import { ProgressBar } from "../components/ProgressBar";
import { EventModal } from "../components/EventModal";
import { AidStationPanel } from "../components/AidStationPanel";
import racesData from "../data/races.json";
import eventsData from "../data/events.json";

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
  choices: Array<{ label: string; effect: Record<string, number>; outcome: string }> | null;
  effect: Record<string, number> | null;
}

function formatRaceTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ActiveRace() {
  const state = gameState.value;
  const activeRace = state?.race.active;

  const [pendingEvent, setPendingEvent] = useState<EventDef | null>(null);
  const [showAidStation, setShowAidStation] = useState(false);
  const [raceComplete, setRaceComplete] = useState(false);

  if (!state || !activeRace) {
    // If no active race, try to initialize one from scheduled races
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
    if (!state || !activeRace || raceComplete) return;

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

    const fatigueCost: Record<Pace, number> = {
      conservative: 4,
      steady: 7,
      aggressive: 12,
    };

    const moraleDelta: Record<Pace, number> = {
      conservative: 1,
      steady: 0,
      aggressive: -2,
    };

    const newEnergy = Math.max(0, activeRace.energy - energyCost[pace]);
    const newFatigue = Math.min(100, activeRace.fatigue + fatigueCost[pace]);
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

    const segmentResult = {
      segment: activeRace.currentSegment,
      time: segmentTime,
      events: [],
      statChanges: {},
    };

    const updatedRace = {
      ...activeRace,
      currentSegment: newSegment,
      elapsedTime: activeRace.elapsedTime + segmentTime,
      position: newPosition,
      energy: newEnergy,
      fatigue: newFatigue,
      morale: newMorale,
      pacePerSegment: [...activeRace.pacePerSegment, pace],
      segmentResults: [...activeRace.segmentResults, segmentResult],
    };

    updateGameState({
      race: { active: updatedRace },
    });

    if (isComplete) {
      setRaceComplete(true);
      return;
    }

    // Check for random event (simplified)
    const eventRoll = Math.random();
    if (eventRoll < 0.25) {
      const validEvents = (eventsData as EventDef[]).filter(
        (e) => e.choices && e.choices.length > 0,
      );
      if (validEvents.length > 0) {
        const randomEvent =
          validEvents[Math.floor(Math.random() * validEvents.length)];
        setPendingEvent(randomEvent);
        return;
      }
    }

    // Check for aid station
    if (segDef?.hasAidStation) {
      setShowAidStation(true);
    }
  }

  function handleEventChoice(_index: number) {
    // Apply event choice effects (simplified - just dismiss)
    setPendingEvent(null);

    // Check for aid station after event
    if (segDef?.hasAidStation) {
      setShowAidStation(true);
    }
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

    const completedRace = {
      raceId: activeRace.raceId,
      gameDay: state.calendar.gameDay,
      finishTime: activeRace.elapsedTime,
      position: activeRace.totalRunners,
      totalRunners: activeRace.totalRunners,
      result: "dnf" as const,
      xpEarned: 25,
      moneyEarned: 0,
      personalBest: false,
    };

    updateGameState({
      race: { active: null },
      history: {
        ...state.history,
        completedRaces: [...state.history.completedRaces, completedRace],
        totalRacesDNF: state.history.totalRacesDNF + 1,
      },
    });

    navigateTo("dashboard");
  }

  if (raceComplete) {
    // Show results inline (will navigate to results screen)
    const completedRace = {
      raceId: activeRace.raceId,
      gameDay: state.calendar.gameDay,
      finishTime: activeRace.elapsedTime,
      position: activeRace.position,
      totalRunners: activeRace.totalRunners,
      result: "finished" as const,
      xpEarned: 100,
      moneyEarned: 50,
      personalBest: false, // TODO: check actual PB
    };

    updateGameState({
      race: { active: null },
      history: {
        ...state.history,
        completedRaces: [...state.history.completedRaces, completedRace],
        totalRacesFinished: state.history.totalRacesFinished + 1,
      },
      inventory: {
        ...state.inventory,
        money: state.inventory.money + completedRace.moneyEarned,
      },
    });

    // Navigate handled by render below
  }

  return (
    <div class="active-race">
      <div class="active-race__header">
        <div class="active-race__name">{raceName}</div>
        <div class="active-race__distance">{raceDistance} miles</div>
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

      <div class="active-race__drop-out">
        <Button
          label="Drop Out (DNF)"
          onClick={handleDNF}
          variant="danger"
        />
      </div>

      {/* Event Modal */}
      {pendingEvent && (
        <EventModal
          event={{
            name: pendingEvent.name,
            description: pendingEvent.description,
            choices: pendingEvent.choices,
          }}
          onChoice={handleEventChoice}
        />
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
