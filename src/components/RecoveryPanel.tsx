// components/RecoveryPanel.tsx — Post-workout recovery tool usage

import { useState } from "preact/hooks";
import { gameState } from "../state/gameState";
import { updateGameState } from "../state/actions";
// Recovery tools with fixed fatigue reduction values
import { Button } from "./Button";
import { FoamRollerIcon, MassageGunIcon, CompressionSocksIcon } from "./Icons";

interface RecoveryTool {
  templateId: string;
  name: string;
  fatigueReduction: number;
  icon: (size: number, color: string) => preact.VNode;
}

const RECOVERY_TOOLS: RecoveryTool[] = [
  {
    templateId: "foam_roller",
    name: "Foam Roller",
    fatigueReduction: 8,
    icon: (size, color) => <FoamRollerIcon size={size} color={color} />,
  },
  {
    templateId: "massage_gun",
    name: "Massage Gun",
    fatigueReduction: 12,
    icon: (size, color) => <MassageGunIcon size={size} color={color} />,
  },
  {
    templateId: "compression_socks",
    name: "Compression Socks",
    fatigueReduction: 5,
    icon: (size, color) => <CompressionSocksIcon size={size} color={color} />,
  },
];

interface RecoveryPanelProps {
  onComplete: () => void;
}

export function RecoveryPanel({ onComplete }: RecoveryPanelProps) {
  const state = gameState.value;
  const [usedTools, setUsedTools] = useState<Set<string>>(() => {
    if (!state) return new Set<string>();
    const persistedUsed = state.training.recoveryToolsUsedOnDay ?? {};
    const gd = state.calendar.gameDay;
    const alreadyUsed = new Set<string>();
    for (const [toolId, day] of Object.entries(persistedUsed)) {
      if (day === gd) alreadyUsed.add(toolId);
    }
    return alreadyUsed;
  });
  const [autoApplied, setAutoApplied] = useState(false);

  if (!state) {
    onComplete();
    return null;
  }

  const gameDay = state.calendar.gameDay;

  // Determine which recovery tools the player owns AND has equipped
  const equippedAccessoryIds = state.inventory.equippedAccessories;
  const equippedAccessories = state.inventory.accessories.filter(
    (a) => equippedAccessoryIds.includes(a.id),
  );
  const equippedTemplateIds = new Set(equippedAccessories.map((a) => a.templateId));

  // Filter to tools the player actually has equipped
  const availableTools = RECOVERY_TOOLS.filter(
    (tool) => equippedTemplateIds.has(tool.templateId),
  );

  // Check for compression socks (passive, auto-applied)
  const hasCompressionSocks = equippedTemplateIds.has("compression_socks");

  // Auto-apply compression socks on first render (only if not already used today)
  const socksAlreadyUsed = usedTools.has("compression_socks");
  if (hasCompressionSocks && !autoApplied && !socksAlreadyUsed) {
    const socksTool = RECOVERY_TOOLS.find((t) => t.templateId === "compression_socks");
    if (socksTool) {
      const currentState = gameState.value!;
      const currentUsed = currentState.training.recoveryToolsUsedOnDay ?? {};
      const newFatigue = Math.max(0, state.condition.fatigue - socksTool.fatigueReduction);
      updateGameState({
        condition: {
          ...state.condition,
          fatigue: newFatigue,
        },
        training: {
          ...currentState.training,
          recoveryToolsUsedOnDay: {
            ...currentUsed,
            compression_socks: gameDay,
          },
        },
      });
      setUsedTools((prev) => new Set([...prev, "compression_socks"]));
      setAutoApplied(true);
    }
  }

  // Only show active tools (not compression socks, which is passive)
  const activeTools = availableTools.filter((t) => t.templateId !== "compression_socks");

  function handleUseTool(tool: RecoveryTool) {
    const currentState = gameState.value;
    if (!currentState) return;

    const newFatigue = Math.max(0, currentState.condition.fatigue - tool.fatigueReduction);
    const currentUsed = currentState.training.recoveryToolsUsedOnDay ?? {};

    updateGameState({
      condition: {
        ...currentState.condition,
        fatigue: newFatigue,
      },
      training: {
        ...currentState.training,
        recoveryToolsUsedOnDay: {
          ...currentUsed,
          [tool.templateId]: currentState.calendar.gameDay,
        },
      },
    });

    setUsedTools((prev) => new Set([...prev, tool.templateId]));
  }

  // If no recovery tools available, skip
  if (availableTools.length === 0) {
    onComplete();
    return null;
  }

  const currentFatigue = gameState.value?.condition.fatigue ?? 0;

  return (
    <div style={{
      padding: "var(--space-4)",
      maxWidth: "400px",
      margin: "0 auto",
    }}>
      <h2 style={{ textAlign: "center", marginBottom: "var(--space-4)" }}>Recovery</h2>

      <div style={{
        textAlign: "center",
        marginBottom: "var(--space-4)",
        fontSize: "var(--text-sm)",
        color: "var(--color-text-muted)",
      }}>
        Current Fatigue: {Math.round(currentFatigue)}%
      </div>

      {hasCompressionSocks && (
        <div style={{
          background: "var(--color-surface, #2a2a2a)",
          borderRadius: "var(--radius-lg, 12px)",
          padding: "var(--space-3)",
          marginBottom: "var(--space-3)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
        }}>
          <CompressionSocksIcon size={32} color="var(--color-sage)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>Compression Socks</div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--color-sage)" }}>
              -{RECOVERY_TOOLS.find((t) => t.templateId === "compression_socks")?.fatigueReduction} fatigue (auto-applied)
            </div>
          </div>
          <span style={{ color: "var(--color-sage)", fontWeight: 600, fontSize: "var(--text-sm)" }}>Applied</span>
        </div>
      )}

      {activeTools.map((tool) => {
        const isUsed = usedTools.has(tool.templateId);
        return (
          <div key={tool.templateId} style={{
            background: "var(--color-surface, #2a2a2a)",
            borderRadius: "var(--radius-lg, 12px)",
            padding: "var(--space-3)",
            marginBottom: "var(--space-3)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
          }}>
            {tool.icon(32, isUsed ? "var(--color-text-muted)" : "var(--color-sage)")}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{tool.name}</div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--color-sage)" }}>
                -{tool.fatigueReduction} fatigue
              </div>
            </div>
            {isUsed ? (
              <span style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>Used</span>
            ) : (
              <Button
                label="Use"
                onClick={() => handleUseTool(tool)}
              />
            )}
          </div>
        );
      })}

      <div style={{ marginTop: "var(--space-4)" }}>
        <Button
          label={activeTools.every((t) => usedTools.has(t.templateId)) ? "Continue" : "Skip"}
          onClick={onComplete}
        />
      </div>
    </div>
  );
}
