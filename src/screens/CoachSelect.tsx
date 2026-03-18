import { useState } from "preact/hooks";
import { gameState } from "../state/gameState";
import { hireCoach, fireCoach, navigateTo, getCoachTiers } from "../state/actions";
import { Button } from "../components/Button";
import { RunnerIcon } from "../components/Icons";

const TIER_COLORS: Record<number, string> = {
  1: "var(--color-sage)",
  2: "#5dade2",
  3: "#d4a017",
};

export function CoachSelect() {
  const state = gameState.value;
  const [message, setMessage] = useState<string | null>(null);

  if (!state) return null;

  const currentCoach = state.coach;
  const tiers = getCoachTiers();

  const handleHire = (tier: number) => {
    const result = hireCoach(tier);
    setMessage(result.message);
  };

  const handleFire = () => {
    fireCoach();
    setMessage("Coach dismissed.");
  };

  return (
    <div class="screen">
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
        <Button label="Back" onClick={() => navigateTo("dashboard")} variant="secondary" />
        <h2 style={{ margin: 0 }}>Coaching</h2>
      </div>

      {message && (
        <div class="card" style={{
          borderLeft: "3px solid var(--color-sage)",
          marginBottom: "var(--space-3)",
          fontSize: "var(--text-sm)",
        }}>
          {message}
        </div>
      )}

      {currentCoach && (
        <div class="card" style={{
          borderLeft: `3px solid ${TIER_COLORS[currentCoach.tier] ?? "var(--color-sage)"}`,
          marginBottom: "var(--space-4)",
        }}>
          <div style={{ fontWeight: 700, marginBottom: "var(--space-1)" }}>
            Current Coach
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
            <RunnerIcon size={28} color={TIER_COLORS[currentCoach.tier] ?? "var(--color-sage)"} />
            <div>
              <div style={{ fontWeight: 600 }}>{currentCoach.name}</div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                Tier {currentCoach.tier} &mdash; ${currentCoach.weeklyCost}/week
              </div>
            </div>
          </div>
          <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>
            {currentCoach.xpMultiplier > 1.0 && (
              <div>XP Bonus: +{Math.round((currentCoach.xpMultiplier - 1) * 100)}%</div>
            )}
            <div>Fatigue Reduction: -{Math.round(currentCoach.fatigueReduction * 100)}%</div>
          </div>
          <Button label="Fire Coach" onClick={handleFire} variant="danger" />
        </div>
      )}

      <div class="screen__subheader">Available Coaches</div>

      {tiers.map((t) => {
        const canAfford = state.inventory.money >= t.weeklyCost;
        const meetsLevel = state.runner.level >= t.levelRequired;
        const isCurrentTier = currentCoach?.tier === t.tier;
        const tierColor = TIER_COLORS[t.tier] ?? "var(--color-sage)";

        return (
          <div
            key={t.tier}
            class="card"
            style={{
              marginBottom: "var(--space-3)",
              borderLeft: `3px solid ${tierColor}`,
              opacity: (!meetsLevel && !isCurrentTier) ? 0.5 : 1,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 700, color: tierColor }}>
                  {t.name}
                </div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>
                  Tier {t.tier}
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: "var(--text-sm)" }}>
                ${t.weeklyCost}/wk
              </div>
            </div>

            <div style={{ fontSize: "var(--text-sm)", fontStyle: "italic", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>
              "{t.description}"
            </div>

            <div style={{ fontSize: "var(--text-sm)", marginBottom: "var(--space-2)" }}>
              {t.xpMultiplier > 1.0 && (
                <div style={{ color: tierColor }}>
                  +{Math.round((t.xpMultiplier - 1) * 100)}% XP bonus
                </div>
              )}
              <div>-{Math.round(t.fatigueReduction * 100)}% fatigue</div>
              <div>Full sweet-spot XP (auto-pacing)</div>
              {!meetsLevel && (
                <div style={{ color: "var(--color-terracotta)" }}>
                  Requires Level {t.levelRequired}
                </div>
              )}
            </div>

            {isCurrentTier ? (
              <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: tierColor }}>
                Currently Hired
              </div>
            ) : (
              <Button
                label={
                  !meetsLevel
                    ? `Lvl ${t.levelRequired} Required`
                    : !canAfford
                      ? `Need $${t.weeklyCost}`
                      : `Hire - $${t.weeklyCost}`
                }
                onClick={() => handleHire(t.tier)}
                disabled={!canAfford || !meetsLevel || !!currentCoach}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
