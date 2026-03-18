import { useState, useEffect, useRef, useCallback } from "preact/hooks";
import { gameState, statValues } from "../state/gameState";
import { endWorkout, navigateTo, updateGameState } from "../state/actions";
import type { WorkoutCompletionInfo } from "../state/actions";
import { Button } from "../components/Button";
import {
  TapBuffer,
  scoreCadence,
  computeStatGains,
  computeFatigue,
  updateActiveWorkout,
  isWorkoutComplete,
  completeWorkout,
  getBaseMiles,
  computeWalkingFatigue,
  computeWalkingStatGains,
} from "../systems/training";
import type { CadenceResult } from "../systems/training";
import { fatigueCurveMultiplier } from "../systems/stats";
import { getEquippedBonuses, getConsumableTemplate } from "../systems/gear";
import { getConsumableIcon, RunnerIcon } from "../components/Icons";
import { RecoveryPanel } from "../components/RecoveryPanel";
import { EquippedLoadout } from "../components/EquippedLoadout";

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

const STAT_COLORS: Record<string, string> = {
  endurance: "var(--color-sage)",
  speed: "#5dade2",
  strength: "var(--color-terracotta)",
  mentalToughness: "#d4a017",
  recovery: "#8e44ad",
  nutritionIQ: "#27ae60",
};

const STAT_LABELS: Record<string, string> = {
  endurance: "Endurance",
  speed: "Speed",
  strength: "Strength",
  mentalToughness: "Mental",
  recovery: "Recovery",
  nutritionIQ: "Nutrition",
};

function qualityFeedback(quality: CadenceResult["quality"]): { text: string; color: string } {
  switch (quality) {
    case "sweet_spot":
      return { text: "Perfect!", color: "var(--color-sage)" };
    case "easy":
      return { text: "Good", color: "#d4a017" };
    case "hard":
      return { text: "Too Fast!", color: "#c0392b" };
    case "overtrained":
      return { text: "Too Fast!", color: "#c0392b" };
    case "undertrained":
      return { text: "Tap faster!", color: "var(--color-terracotta)" };
  }
}

function streakMultiplier(streak: number): number {
  if (streak >= 10) return 2.0;
  if (streak >= 5) return 1.5;
  return 1.0;
}

function workoutThemeBg(workoutType: string): string {
  switch (workoutType) {
    case "easy_run":
      return "rgba(122, 139, 111, 0.08)";
    case "long_run":
      return "rgba(212, 160, 23, 0.06)";
    case "intervals":
      return "rgba(93, 173, 226, 0.08)";
    case "tempo_run":
      return "rgba(230, 126, 34, 0.08)";
    case "hill_repeats":
      return "rgba(192, 57, 43, 0.08)";
    default:
      return "transparent";
  }
}

interface FloatingStat {
  id: number;
  text: string;
  color: string;
  x: number;
  y: number;
}

export function ActiveWorkout() {
  const state = gameState.value;
  const liveWorkout = state?.training.currentWorkout;
  const [savedWorkout, setSavedWorkout] = useState(liveWorkout);
  // Use live workout while running, saved snapshot once summary shown
  const workout = liveWorkout ?? savedWorkout;

  const tapBufferRef = useRef(new TapBuffer());
  const [cadence, setCadence] = useState<CadenceResult>({
    quality: "easy",
    multiplier: 0,
    injuryRisk: 0,
  });
  const [floats, setFloats] = useState<FloatingStat[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [workoutResult, setWorkoutResult] = useState<WorkoutCompletionInfo | null>(null);
  const [fatigue, setFatigue] = useState(state?.condition.fatigue ?? 0);
  const [startFatigue] = useState(state?.condition.fatigue ?? 0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [isWalking, setIsWalking] = useState(false);
  const [walkingMessage, setWalkingMessage] = useState<string | null>(null);
  const [consumableCooldown, setConsumableCooldown] = useState(false);
  const [consumableMessage, setConsumableMessage] = useState<string | null>(null);
  const consumableMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const walkingMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [startStats] = useState(() => {
    const sv = statValues.value;
    return { ...sv };
  });
  const floatIdRef = useRef(0);
  const statCycleRef = useRef(0);

  const handleTap = useCallback(() => {
    tapBufferRef.current.recordTap(Date.now());
  }, []);

  // Helper to show walking messages with auto-dismiss
  const showWalkingMessage = useCallback((msg: string) => {
    setWalkingMessage(msg);
    if (walkingMessageTimerRef.current) {
      clearTimeout(walkingMessageTimerRef.current);
    }
    walkingMessageTimerRef.current = setTimeout(() => {
      setWalkingMessage(null);
    }, 3000);
  }, []);

  const handleUseConsumable = useCallback((templateId: string) => {
    const currentState = gameState.value;
    if (!currentState) return;

    const template = getConsumableTemplate(templateId);
    if (!template) return;

    const owned = currentState.inventory.consumables[templateId] ?? 0;
    if (owned <= 0) return;

    // Decrement quantity
    const newConsumables = {
      ...currentState.inventory.consumables,
      [templateId]: owned - 1,
    };

    // Reduce fatigue
    const newFatigue = Math.max(0, currentState.condition.fatigue - template.effects.fatigueReduction);

    // Using consumables trains Nutrition IQ + gives a small speed boost
    const nutritionXpGain = 10 + template.tier * 5;
    const speedBoost = template.effects.fatigueReduction * 0.5; // half of fatigue reduction as speed XP
    const updatedStats = { ...currentState.stats };
    updatedStats.nutritionIQ = {
      trainingXp: currentState.stats.nutritionIQ.trainingXp + nutritionXpGain,
    };
    updatedStats.speed = {
      trainingXp: currentState.stats.speed.trainingXp + speedBoost,
    };

    updateGameState({
      stats: updatedStats,
      inventory: {
        ...currentState.inventory,
        consumables: newConsumables,
      },
      condition: {
        ...currentState.condition,
        fatigue: newFatigue,
      },
    });

    setFatigue(newFatigue);

    // Show message
    setConsumableMessage(`+${template.effects.fatigueReduction} fatigue recovered (${template.name})`);
    if (consumableMessageTimerRef.current) {
      clearTimeout(consumableMessageTimerRef.current);
    }
    consumableMessageTimerRef.current = setTimeout(() => {
      setConsumableMessage(null);
    }, 3000);

    // Set cooldown
    setConsumableCooldown(true);
    setTimeout(() => {
      setConsumableCooldown(false);
    }, 3000);
  }, []);

  const isCoached = !!state?.coach?.hired;

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
      const currentFatigue = currentState.condition.fatigue;
      const bonuses = getEquippedBonuses(currentState.inventory);
      const coach = currentState.coach;

      let gains: Record<string, number>;
      let newFatigue: number;
      let cResult: CadenceResult;

      if (coach?.hired) {
        // Coached mode — still affected by walking at high fatigue

        // Auto-transition to walking if fatigue >= 95
        setIsWalking((wasWalking) => {
          if (!wasWalking && currentFatigue >= 95) {
            showWalkingMessage("Too fatigued to run. Walking to recover.");
            return true;
          }
          if (wasWalking && currentFatigue < 80) {
            showWalkingMessage("Ready to run again!");
            setIsWalking(false);
            return false;
          }
          return wasWalking;
        });

        let walkingNow = false;
        setIsWalking((current) => {
          walkingNow = current;
          return current;
        });

        if (walkingNow) {
          // Walking mode even with coach — reduced XP, fatigue recovery
          cResult = { quality: "easy", multiplier: 0, injuryRisk: 0 };
          setCadence(cResult);
          gains = computeWalkingStatGains(currentFatigue, dtMs);
          newFatigue = computeWalkingFatigue(currentFatigue, bonuses.recoveryBonus, dtMs);
        } else {
          // Coached running: auto sweet_spot, reduced fatigue, coach XP multiplier
          cResult = { quality: "sweet_spot", multiplier: 1.0, injuryRisk: 0 };
          setCadence(cResult);

          gains = computeStatGains(
            w.workoutType,
            cResult,
            currentFatigue,
            dtMs,
          );

          // Apply coach XP multiplier (tier 3 gets 1.1x)
          if (coach.xpMultiplier !== 1.0) {
            for (const [stat, val] of Object.entries(gains)) {
              gains[stat] = val * coach.xpMultiplier;
            }
          }

          // Compute fatigue with coach reduction
          const baseFatigue = computeFatigue(
            w.workoutType,
            cResult,
            currentFatigue,
            statValues.value.recovery,
            dtMs,
            fatigueCurveMultiplier(currentState.stats, currentState.runner.level),
          );
          const fatigueIncrease = baseFatigue - currentFatigue;
          if (fatigueIncrease > 0) {
            newFatigue = currentFatigue + fatigueIncrease * (1 - coach.fatigueReduction);
          } else {
            newFatigue = baseFatigue;
          }
          newFatigue = Math.min(100, Math.max(0, newFatigue));
        }
      } else {
        // Non-coached mode
        // Auto-transition to walking if fatigue >= 95
        setIsWalking((wasWalking) => {
          if (!wasWalking && currentFatigue >= 95) {
            showWalkingMessage("Too fatigued to run. Walking to recover.");
            return true;
          }
          if (wasWalking && currentFatigue < 80) {
            showWalkingMessage("Ready to run again!");
          }
          return wasWalking;
        });

        // Read current walking state synchronously via ref-like pattern
        let walkingNow = false;
        setIsWalking((current) => {
          walkingNow = current;
          return current;
        });

        if (walkingNow) {
          // Walking mode: no tapping needed, reduced XP, fatigue recovery
          cResult = { quality: "easy", multiplier: 0, injuryRisk: 0 };
          setCadence(cResult);
          setStreak(0);

          gains = computeWalkingStatGains(currentFatigue, dtMs);
          newFatigue = computeWalkingFatigue(currentFatigue, bonuses.recoveryBonus, dtMs);
        } else {
          // Normal running mode
          const tps = tapBufferRef.current.getTapsPerSecond(1000);
          cResult = scoreCadence(tps, w.workoutType);
          setCadence(cResult);

          // Streak tracking
          if (cResult.quality === "sweet_spot") {
            setStreak((prev) => {
              const next = prev + 1;
              setBestStreak((best) => Math.max(best, next));
              return next;
            });
          } else {
            setStreak(0);
          }

          gains = computeStatGains(
            w.workoutType,
            cResult,
            currentFatigue,
            dtMs,
          );

          // Apply streak multiplier
          const currentStreak = cResult.quality === "sweet_spot" ? streak + 1 : 0;
          const sMult = streakMultiplier(currentStreak);
          for (const [stat, val] of Object.entries(gains)) {
            gains[stat] = val * sMult;
          }

          newFatigue = computeFatigue(
            w.workoutType,
            cResult,
            currentFatigue,
            statValues.value.recovery,
            dtMs,
            fatigueCurveMultiplier(currentState.stats, currentState.runner.level),
          );
        }
      }

      setFatigue(newFatigue);

      // While walking (non-coached), elapsed advances at 50% speed
      const walkingNowForElapsed = !coach?.hired && isWalking;
      const effectiveDtMs = walkingNowForElapsed ? dtMs * 0.5 : dtMs;
      const updatedWorkout = updateActiveWorkout(w, effectiveDtMs, cResult, gains);

      // Add floating stat numbers - show actual stat being trained
      const gainEntries = Object.entries(gains).filter(([, v]) => v > 0.01);
      if (gainEntries.length > 0) {
        statCycleRef.current = (statCycleRef.current + 1) % gainEntries.length;
        const [stat, val] = gainEntries[statCycleRef.current];
        floatIdRef.current++;
        const newFloat: FloatingStat = {
          id: floatIdRef.current,
          text: `+${val.toFixed(2)} ${STAT_LABELS[stat] ?? stat}`,
          color: STAT_COLORS[stat] ?? "var(--color-sage)",
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
        setSavedWorkout(updatedWorkout);
        setShowSummary(true);
      }
    }, dtMs);

    return () => clearInterval(interval);
  }, [showSummary, workout?.workoutType, streak, showWalkingMessage, isCoached]);

  // Clean up old floats
  useEffect(() => {
    if (floats.length === 0) return;
    const timer = setTimeout(() => {
      setFloats((prev) => prev.slice(1));
    }, 1100);
    return () => clearTimeout(timer);
  }, [floats.length]);

  if (!state || !workout) return null;

  if (showRecovery) {
    return (
      <div class="active-workout">
        <RecoveryPanel onComplete={() => navigateTo("dashboard")} />
      </div>
    );
  }

  if (showSummary) {
    const summary =
      workout.workoutType !== "rest"
        ? completeWorkout(workout)
        : { totalStatGains: {}, totalMiles: 0 };

    const totalTicks = workout.sweetSpotHits + workout.sweetSpotMisses;
    const sweetSpotPct = totalTicks > 0 ? Math.round((workout.sweetSpotHits / totalTicks) * 100) : 0;
    const fatigueGained = Math.max(0, fatigue - startFatigue);
    const endStats = statValues.value;

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
                {bestStreak}
              </div>
              <div class="active-workout__summary-stat-label">Best Streak</div>
            </div>
            <div class="active-workout__summary-stat">
              <div class="active-workout__summary-stat-value">
                {sweetSpotPct}%
              </div>
              <div class="active-workout__summary-stat-label">Sweet Spot %</div>
            </div>
            <div class="active-workout__summary-stat">
              <div class="active-workout__summary-stat-value">
                +{fatigueGained.toFixed(0)}%
              </div>
              <div class="active-workout__summary-stat-label">Fatigue Gained</div>
            </div>
            <div class="active-workout__summary-stat">
              <div class="active-workout__summary-stat-value">
                {Math.round(fatigue)}%
              </div>
              <div class="active-workout__summary-stat-label">Total Fatigue</div>
            </div>
          </div>
          {Object.entries(summary.totalStatGains).length > 0 && (
            <div style={{ marginBottom: "var(--space-4)" }}>
              <div class="screen__subheader">Stat Gains</div>
              {Object.entries(summary.totalStatGains).map(([stat, xp]) => {
                const label = STAT_LABELS[stat] ?? stat;
                const color = STAT_COLORS[stat] ?? "var(--color-text)";
                const before = startStats[stat as keyof typeof startStats] ?? 0;
                const after = endStats[stat as keyof typeof endStats] ?? before;
                return (
                  <div
                    key={stat}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "var(--text-sm)",
                      padding: "var(--space-1) 0",
                    }}
                  >
                    <span style={{ color }}>{label}</span>
                    <span>
                      <span style={{ color: "var(--color-text-muted)", fontSize: "var(--text-xs)" }}>
                        {(typeof before === "number" ? before : 0).toFixed(1)} &rarr; {(typeof after === "number" ? after : 0).toFixed(1)}
                      </span>
                      {" "}
                      <span style={{ fontWeight: 700, color }}>
                        +{(xp as number).toFixed(1)} XP
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          {workoutResult ? (
            <>
              {workoutResult.leveledUp ? (
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
                    You're now Level {workoutResult.newLevel}
                  </div>
                  {workoutResult.newUnlocks.length > 0 && (
                    <div style={{ marginTop: "var(--space-2)", color: "var(--color-sage)" }}>
                      {workoutResult.newUnlocks.map((d) => {
                        const labels: Record<string, string> = {
                          "5k": "5K", "10k": "10K",
                          "half_marathon": "Half Marathon", "marathon": "Marathon",
                        };
                        return <div key={d}>{labels[d] ?? d} races are now available!</div>;
                      })}
                    </div>
                  )}
                  {workoutResult.levelPerks.length > 0 && (
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
                      {workoutResult.levelPerks.map((perk, i) => (
                        <div key={i} style={{ fontSize: "var(--text-sm)", color: "var(--color-text)", padding: "2px 0" }}>
                          {perk}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: "center", marginBottom: "var(--space-3)" }}>
                  <span style={{ color: "var(--color-sage)", fontWeight: 600 }}>
                    +{workoutResult.xpEarned} XP
                  </span>
                </div>
              )}
              <Button label="Continue" onClick={() => setShowRecovery(true)} />
            </>
          ) : (
            <Button label="Continue" onClick={() => {
              const result = endWorkout();
              setWorkoutResult(result);
              if (!result || (!result.leveledUp && result.newUnlocks.length === 0)) {
                setShowRecovery(true);
              }
            }} />
          )}
        </div>
      </div>
    );
  }

  const elapsed = workout.elapsed;
  const duration = workout.duration;
  const effortPct = duration > 0 ? Math.min(1, elapsed / duration) * 100 : 0;
  const feedback = qualityFeedback(cadence.quality);
  const isSweetSpot = cadence.quality === "sweet_spot";
  const sMult = streakMultiplier(streak);

  // Mileage calculation
  const baseMiles = getBaseMiles(workout.workoutType);
  const currentMiles = baseMiles * (duration > 0 ? Math.min(1, elapsed / duration) : 0);
  const totalCareerMiles = state.training.totalMiles + currentMiles;

  // Recovery gear bonus
  const bonuses = getEquippedBonuses(state.inventory);
  const recoveryBonusPct = Math.round(bonuses.recoveryBonus * 100);

  // Coached mode render
  if (isCoached && state.coach) {
    const coachName = state.coach.name;
    return (
      <div class="active-workout" style={{ background: "linear-gradient(180deg, rgba(34, 87, 102, 0.15) 0%, transparent 40%)" }}>
        <div style={{
          background: "rgba(34, 87, 102, 0.3)",
          padding: "var(--space-2) var(--space-3)",
          borderRadius: "var(--radius-md, 8px)",
          textAlign: "center",
          marginBottom: "var(--space-3)",
          fontWeight: 700,
          fontSize: "var(--text-sm)",
          color: "#5dade2",
          letterSpacing: "0.05em",
        }}>
          Coached Session
        </div>

        <div class="active-workout__header">
          <div class="active-workout__type">
            {workout.workoutType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </div>
          <div style={{ marginTop: "var(--space-1)" }}>
            <EquippedLoadout compact />
          </div>
        </div>

        <div class="active-workout__timer">
          {formatMs(elapsed)} / {formatMs(duration)}
        </div>

        <div class="active-workout__mileage">
          {currentMiles.toFixed(1)} / {baseMiles.toFixed(1)} mi
        </div>

        <div class="active-workout__meters">
          <div class="active-workout__effort" style={{ flex: 1 }}>
            <div style={{
              fontSize: "var(--text-xs)",
              color: "var(--color-text-muted)",
              marginBottom: "var(--space-1)",
            }}>
              Progress
            </div>
            <div class="active-workout__effort-bar">
              <div
                class="active-workout__effort-fill"
                style={{ width: `${effortPct}%`, backgroundColor: "#5dade2" }}
              />
            </div>
          </div>
        </div>

        <div>
          <div style={{
            fontSize: "var(--text-xs)",
            color: "var(--color-text-muted)",
            marginBottom: "var(--space-1)",
          }}>
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

        {walkingMessage && (
          <div class="active-workout__walking-message">
            {walkingMessage}
          </div>
        )}

        {isWalking && bonuses.recoveryBonus > 0 && (
          <div class="active-workout__recovery-gear">
            Recovery gear: +{Math.round(bonuses.recoveryBonus * 100)}%
          </div>
        )}

        <div
          class={`active-workout__tap-zone ${isWalking ? "active-workout__tap-zone--walking" : ""}`}
          style={isWalking ? undefined : {
            backgroundColor: "rgba(34, 87, 102, 0.12)",
            border: "2px solid rgba(93, 173, 226, 0.3)",
            cursor: "default",
            position: "relative",
          }}
        >
          {isWalking ? (
            <div class="active-workout__walking-label">
              <span class="active-workout__tap-text" style={{ color: "var(--color-text-muted)" }}>WALKING</span>
              <span class="active-workout__walking-sub">recovering...</span>
            </div>
          ) : (
            <>
              <RunnerIcon size={48} color="#5dade2" />
              <div style={{
                fontSize: "var(--text-sm)",
                color: "#5dade2",
                fontWeight: 600,
                marginTop: "var(--space-2)",
              }}>
                Coach {coachName} is training you
              </div>
            </>
          )}
          {floats.map((f) => (
            <span
              key={f.id}
              class="active-workout__stat-float"
              style={{ left: `${f.x}%`, top: `${f.y}%`, color: f.color }}
            >
              {f.text}
            </span>
          ))}
        </div>

        {/* Consumables — same as normal training */}
        {(() => {
          const consumables = state.inventory.consumables;
          const nutritionStat = statValues.value.nutritionIQ ?? 1;
          const items = Object.entries(consumables).filter(([, qty]) => qty > 0);
          if (items.length === 0) return null;
          return (
            <div style={{ marginBottom: "var(--space-2)" }}>
              <div style={{
                fontSize: "var(--text-xs)",
                fontWeight: 700,
                color: "var(--color-text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "var(--space-1)",
                textAlign: "center",
              }}>
                Fuel — tap to use
              </div>
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "6px",
                justifyContent: "center",
              }}>
                {items.map(([id, qty]) => {
                  const tmpl = getConsumableTemplate(id);
                  if (!tmpl) return null;
                  const locked = nutritionStat < tmpl.requiredNutritionIQ;
                  const disabled = consumableCooldown || locked;
                  return (
                    <button
                      key={id}
                      onClick={() => !disabled && handleUseConsumable(id)}
                      disabled={disabled}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 10px",
                        borderRadius: "var(--radius-sm, 6px)",
                        border: "1px solid",
                        borderColor: disabled ? "var(--color-warm-gray-300)" : "var(--color-sage)",
                        background: disabled ? "var(--color-warm-gray-100, rgba(0,0,0,0.05))" : "rgba(122, 139, 111, 0.1)",
                        cursor: disabled ? "not-allowed" : "pointer",
                        opacity: locked ? 0.4 : consumableCooldown ? 0.6 : 1,
                        textAlign: "left",
                      }}
                    >
                      {getConsumableIcon(id, 20, disabled ? "var(--color-warm-gray-400)" : "var(--color-sage)")}
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          color: disabled ? "var(--color-text-muted)" : "var(--color-text)",
                          lineHeight: 1.2,
                          whiteSpace: "nowrap",
                        }}>
                          {tmpl.name} <span style={{ fontWeight: 400, color: "var(--color-text-muted)" }}>x{qty}</span>
                        </div>
                        <div style={{
                          fontSize: "10px",
                          color: locked ? "#c0392b" : "var(--color-sage)",
                          lineHeight: 1.2,
                        }}>
                          {locked
                            ? `NutIQ ${tmpl.requiredNutritionIQ} needed`
                            : `-${tmpl.effects.fatigueReduction} fatigue, +${(tmpl.effects.fatigueReduction * 0.5).toFixed(1)} speed`}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        <div class="active-workout__bottom-buttons">
          <Button
            label={isWalking ? "Run" : "Walk"}
            onClick={() => setIsWalking(!isWalking)}
            variant="secondary"
          />
          <Button
            label="End Workout"
            onClick={() => {
              setSavedWorkout(state?.training.currentWorkout ?? null);
              setShowSummary(true);
            }}
            variant="secondary"
          />
        </div>
      </div>
    );
  }

  // Normal (non-coached) mode render
  return (
    <div class="active-workout">
      <div class="active-workout__header">
        <div class="active-workout__type">
          {workout.workoutType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
        </div>
        <div style={{ marginTop: "var(--space-1)" }}>
          <EquippedLoadout compact />
        </div>
      </div>

      <div class="active-workout__timer">
        {formatMs(elapsed)} / {formatMs(duration)}
      </div>

      <div class="active-workout__mileage">
        {currentMiles.toFixed(1)} / {baseMiles.toFixed(1)} mi
      </div>
      <div class="active-workout__career-miles">
        Total: {totalCareerMiles.toFixed(1)} mi
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
        style={{ color: isWalking ? "var(--color-text-muted)" : feedback.color }}
      >
        {isWalking ? "Walking" : feedback.text}
        {!isWalking && streak > 0 && (
          <span class="active-workout__streak-badge">
            {" "}Streak: {streak}{sMult > 1 ? ` (${sMult}x)` : ""}
          </span>
        )}
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

      {walkingMessage && (
        <div class="active-workout__walking-message">
          {walkingMessage}
        </div>
      )}

      {isWalking && bonuses.recoveryBonus > 0 && (
        <div class="active-workout__recovery-gear">
          Recovery gear: +{recoveryBonusPct}%
        </div>
      )}

      <div
        class={`active-workout__tap-zone ${
          isWalking
            ? "active-workout__tap-zone--walking"
            : `active-workout__tap-zone--active ${cadenceZoneClass(cadence.quality)}${isSweetSpot ? " active-workout__tap-zone--pulse" : ""}`
        }`}
        style={isWalking ? undefined : { backgroundColor: workoutThemeBg(workout.workoutType) }}
        onClick={isWalking ? undefined : handleTap}
        onTouchStart={isWalking ? undefined : (e) => {
          e.preventDefault();
          handleTap();
        }}
      >
        {isWalking ? (
          <div class="active-workout__walking-label">
            <span class="active-workout__tap-text" style={{ color: "var(--color-text-muted)" }}>WALKING</span>
            <span class="active-workout__walking-sub">recovering...</span>
          </div>
        ) : (
          <span class="active-workout__tap-text">TAP</span>
        )}
        {floats.map((f) => (
          <span
            key={f.id}
            class="active-workout__stat-float"
            style={{ left: `${f.x}%`, top: `${f.y}%`, color: f.color }}
          >
            {f.text}
          </span>
        ))}
      </div>

      {consumableMessage && (
        <div class="active-workout__walking-message" style={{ color: "var(--color-sage)", fontWeight: 600 }}>
          {consumableMessage}
        </div>
      )}

      {/* Consumables — always visible when items owned */}
      {(() => {
        const consumables = state.inventory.consumables;
        const nutritionStat = statValues.value.nutritionIQ ?? 1;
        const items = Object.entries(consumables).filter(([, qty]) => qty > 0);
        if (items.length === 0) return null;
        return (
          <div style={{ marginBottom: "var(--space-2)" }}>
            <div style={{
              fontSize: "var(--text-xs)",
              fontWeight: 700,
              color: "var(--color-text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "var(--space-1)",
              textAlign: "center",
            }}>
              Fuel — tap to use
            </div>
            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              justifyContent: "center",
            }}>
              {items.map(([id, qty]) => {
                const tmpl = getConsumableTemplate(id);
                if (!tmpl) return null;
                const locked = nutritionStat < tmpl.requiredNutritionIQ;
                const disabled = consumableCooldown || locked;
                return (
                  <button
                    key={id}
                    onClick={() => !disabled && handleUseConsumable(id)}
                    disabled={disabled}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 10px",
                      borderRadius: "var(--radius-sm, 6px)",
                      border: "1px solid",
                      borderColor: disabled ? "var(--color-warm-gray-300)" : "var(--color-sage)",
                      background: disabled ? "var(--color-warm-gray-100, rgba(0,0,0,0.05))" : "rgba(122, 139, 111, 0.1)",
                      cursor: disabled ? "not-allowed" : "pointer",
                      opacity: locked ? 0.4 : consumableCooldown ? 0.6 : 1,
                      textAlign: "left",
                    }}
                  >
                    {getConsumableIcon(id, 20, disabled ? "var(--color-warm-gray-400)" : "var(--color-sage)")}
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: disabled ? "var(--color-text-muted)" : "var(--color-text)",
                        lineHeight: 1.2,
                        whiteSpace: "nowrap",
                      }}>
                        {tmpl.name} <span style={{ fontWeight: 400, color: "var(--color-text-muted)" }}>x{qty}</span>
                      </div>
                      <div style={{
                        fontSize: "10px",
                        color: locked ? "#c0392b" : "var(--color-sage)",
                        lineHeight: 1.2,
                      }}>
                        {locked
                          ? `NutIQ ${tmpl.requiredNutritionIQ} needed`
                          : `-${tmpl.effects.fatigueReduction} fatigue, +${(tmpl.effects.fatigueReduction * 0.5).toFixed(1)} speed`}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      <div class="active-workout__bottom-buttons">
        <Button
          label={isWalking ? "Run" : "Walk"}
          onClick={() => {
            if (isWalking) {
              setIsWalking(false);
            } else {
              setIsWalking(true);
            }
          }}
          variant="secondary"
        />
        <Button
          label="End Workout"
          onClick={() => {
            setSavedWorkout(state?.training.currentWorkout ?? null);
            setShowSummary(true);
          }}
          variant="secondary"
        />
      </div>
    </div>
  );
}
