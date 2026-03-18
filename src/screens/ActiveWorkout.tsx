import { useState, useEffect, useRef, useCallback } from "preact/hooks";
import { gameState, statValues } from "../state/gameState";
import { endWorkout, updateGameState } from "../state/actions";
import { Button } from "../components/Button";
import {
  TapBuffer,
  scoreCadence,
  computeStatGains,
  computeFatigue,
  updateActiveWorkout,
  isWorkoutComplete,
  completeWorkout,
} from "../systems/training";
import type { CadenceResult } from "../systems/training";

function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function fatigueColor(fatigue: number): string {
  if (fatigue < 50) return "var(--color-sage)";
  if (fatigue < 70) return "#d4a017";
  if (fatigue < 85) return "var(--color-terracotta)";
  return "#c0392b";
}

function cadenceZoneClass(quality: CadenceResult["quality"]): string {
  switch (quality) {
    case "sweet_spot":
      return "active-workout__tap-zone--green";
    case "easy":
    case "hard":
      return "active-workout__tap-zone--yellow";
    case "overtrained":
    case "undertrained":
      return "active-workout__tap-zone--red";
  }
}

interface FloatingStat {
  id: number;
  text: string;
  x: number;
  y: number;
}

export function ActiveWorkout() {
  const state = gameState.value;
  const workout = state?.training.currentWorkout;

  const tapBufferRef = useRef(new TapBuffer());
  const [cadence, setCadence] = useState<CadenceResult>({
    quality: "easy",
    multiplier: 0,
    injuryRisk: 0,
  });
  const [floats, setFloats] = useState<FloatingStat[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [fatigue, setFatigue] = useState(state?.condition.fatigue ?? 0);
  const floatIdRef = useRef(0);

  const handleTap = useCallback(() => {
    tapBufferRef.current.recordTap(Date.now());
  }, []);

  // Main game loop at 100ms intervals
  useEffect(() => {
    if (!workout || showSummary) return;
    if (workout.workoutType === "rest") {
      setShowSummary(true);
      return;
    }

    const dtMs = 100;
    const interval = setInterval(() => {
      const currentState = gameState.value;
      if (!currentState?.training.currentWorkout) return;

      const w = currentState.training.currentWorkout;
      const tps = tapBufferRef.current.getTapsPerSecond(1000);
      const cResult = scoreCadence(tps, w.workoutType);
      setCadence(cResult);

      const gains = computeStatGains(
        w.workoutType,
        cResult,
        currentState.condition.fatigue,
        dtMs,
      );

      const newFatigue = computeFatigue(
        w.workoutType,
        cResult,
        currentState.condition.fatigue,
        statValues.value.recovery,
        dtMs,
      );
      setFatigue(newFatigue);

      const updatedWorkout = updateActiveWorkout(w, dtMs, cResult, gains);

      // Add floating stat numbers
      const totalGain = Object.values(gains).reduce((a, b) => a + b, 0);
      if (totalGain > 0.1) {
        floatIdRef.current++;
        const newFloat: FloatingStat = {
          id: floatIdRef.current,
          text: `+${totalGain.toFixed(1)} XP`,
          x: 30 + Math.random() * 40,
          y: 50 + Math.random() * 30,
        };
        setFloats((prev) => [...prev.slice(-5), newFloat]);
      }

      const completed = isWorkoutComplete(updatedWorkout);

      updateGameState({
        training: {
          ...currentState.training,
          currentWorkout: updatedWorkout,
        },
        condition: {
          ...currentState.condition,
          fatigue: newFatigue,
        },
      });

      if (completed) {
        setShowSummary(true);
      }
    }, dtMs);

    return () => clearInterval(interval);
  }, [showSummary, workout?.workoutType]);

  // Clean up old floats
  useEffect(() => {
    if (floats.length === 0) return;
    const timer = setTimeout(() => {
      setFloats((prev) => prev.slice(1));
    }, 1100);
    return () => clearTimeout(timer);
  }, [floats.length]);

  if (!state || !workout) return null;

  if (showSummary) {
    const summary =
      workout.workoutType !== "rest"
        ? completeWorkout(workout)
        : { totalStatGains: {}, totalMiles: 0 };

    return (
      <div class="active-workout">
        <div class="active-workout__summary">
          <h2>Workout Complete</h2>
          <div class="active-workout__summary-stats">
            <div class="active-workout__summary-stat">
              <div class="active-workout__summary-stat-value">
                {formatMs(workout.elapsed)}
              </div>
              <div class="active-workout__summary-stat-label">Duration</div>
            </div>
            <div class="active-workout__summary-stat">
              <div class="active-workout__summary-stat-value">
                {summary.totalMiles.toFixed(1)} mi
              </div>
              <div class="active-workout__summary-stat-label">Distance</div>
            </div>
            <div class="active-workout__summary-stat">
              <div class="active-workout__summary-stat-value">
                {workout.sweetSpotHits}
              </div>
              <div class="active-workout__summary-stat-label">
                Sweet Spot Hits
              </div>
            </div>
            <div class="active-workout__summary-stat">
              <div class="active-workout__summary-stat-value">
                {Math.round(fatigue)}%
              </div>
              <div class="active-workout__summary-stat-label">Fatigue</div>
            </div>
          </div>
          {Object.entries(summary.totalStatGains).length > 0 && (
            <div style={{ marginBottom: "var(--space-4)" }}>
              <div class="screen__subheader">Stat Gains</div>
              {Object.entries(summary.totalStatGains).map(([stat, xp]) => (
                <div
                  key={stat}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "var(--text-sm)",
                    padding: "var(--space-1) 0",
                  }}
                >
                  <span>{stat}</span>
                  <span style={{ fontWeight: 700 }}>
                    +{(xp as number).toFixed(1)} XP
                  </span>
                </div>
              ))}
            </div>
          )}
          <Button label="Continue" onClick={endWorkout} />
        </div>
      </div>
    );
  }

  const elapsed = workout.elapsed;
  const duration = workout.duration;
  const effortPct = duration > 0 ? Math.min(1, elapsed / duration) * 100 : 0;

  return (
    <div class="active-workout">
      <div class="active-workout__header">
        <div class="active-workout__type">
          {workout.workoutType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
        </div>
      </div>

      <div class="active-workout__timer">
        {formatMs(elapsed)} / {formatMs(duration)}
      </div>

      <div class="active-workout__meters">
        <div class="active-workout__effort" style={{ flex: 1 }}>
          <div
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--color-text-muted)",
              marginBottom: "var(--space-1)",
            }}
          >
            Progress
          </div>
          <div class="active-workout__effort-bar">
            <div
              class="active-workout__effort-fill"
              style={{ width: `${effortPct}%` }}
            />
          </div>
        </div>
      </div>

      <div
        class="active-workout__cadence-label"
        style={{
          color:
            cadence.quality === "sweet_spot"
              ? "var(--color-sage)"
              : cadence.quality === "easy" || cadence.quality === "hard"
                ? "#d4a017"
                : "#c0392b",
        }}
      >
        {cadence.quality.replace(/_/g, " ").toUpperCase()}
      </div>

      <div>
        <div
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--color-text-muted)",
            marginBottom: "var(--space-1)",
          }}
        >
          Fatigue
        </div>
        <div class="active-workout__fatigue-bar">
          <div
            class="active-workout__fatigue-fill"
            style={{
              width: `${fatigue}%`,
              backgroundColor: fatigueColor(fatigue),
            }}
          />
        </div>
      </div>

      <div
        class={`active-workout__tap-zone active-workout__tap-zone--active ${cadenceZoneClass(cadence.quality)}`}
        onClick={handleTap}
        onTouchStart={(e) => {
          e.preventDefault();
          handleTap();
        }}
      >
        <span class="active-workout__tap-text">TAP</span>
        {floats.map((f) => (
          <span
            key={f.id}
            class="active-workout__stat-float"
            style={{ left: `${f.x}%`, top: `${f.y}%` }}
          >
            {f.text}
          </span>
        ))}
      </div>

      <Button
        label="End Workout"
        onClick={() => setShowSummary(true)}
        variant="secondary"
      />
    </div>
  );
}
