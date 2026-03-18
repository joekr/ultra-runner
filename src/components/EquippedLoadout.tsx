// components/EquippedLoadout.tsx — Shows currently equipped gear (shoe, apparel, accessories)

import { gameState } from "../state/gameState";
import { getGearTemplate, getShoeCondition } from "../systems/gear";
import { getGearIcon } from "./Icons";
import { ProgressBar } from "./ProgressBar";

interface EquippedLoadoutProps {
  compact?: boolean; // smaller version for workout/race screens
}

export function EquippedLoadout({ compact = false }: EquippedLoadoutProps) {
  const state = gameState.value;
  if (!state) return null;

  const { inventory } = state;

  const equippedShoe = inventory.shoes.find((s) => s.id === inventory.equippedShoe);
  const equippedApparel = inventory.apparel.filter((a) =>
    inventory.equippedApparel.includes(a.id),
  );
  const equippedAccessories = (inventory.accessories ?? []).filter((a) =>
    (inventory.equippedAccessories ?? []).includes(a.id),
  );

  const iconSize = compact ? 20 : 24;
  const fontSize = compact ? "var(--text-xs)" : "var(--text-sm)";

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: compact ? "var(--space-1)" : "var(--space-2)",
        alignItems: "center",
      }}
    >
      {/* Shoe */}
      {equippedShoe ? (() => {
        const tmpl = getGearTemplate(equippedShoe.templateId);
        const cond = getShoeCondition(equippedShoe);
        const color = cond.isWorn ? "#c0392b" : cond.durabilityPct < 0.4 ? "#d4a017" : "var(--color-sage)";
        return (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              background: "var(--color-warm-gray-100, rgba(0,0,0,0.05))",
              borderRadius: "var(--radius-sm, 6px)",
              padding: compact ? "2px 6px" : "4px 8px",
            }}
            title={`${tmpl?.name ?? equippedShoe.templateId} — ${Math.round(equippedShoe.durability)}mi left`}
          >
            {getGearIcon(equippedShoe.templateId, iconSize, color)}
            {!compact && (
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize, fontWeight: 600, lineHeight: 1.2 }}>
                  {tmpl?.name ?? equippedShoe.templateId}
                </div>
                <div style={{ width: "60px" }}>
                  <ProgressBar
                    value={cond.durabilityPct}
                    label=""
                    color={color}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })() : (
        <div
          style={{
            fontSize: "var(--text-xs)",
            color: "#c0392b",
            padding: compact ? "2px 6px" : "4px 8px",
          }}
        >
          No shoes!
        </div>
      )}

      {/* Apparel */}
      {equippedApparel.map((item) => {
        const tmpl = getGearTemplate(item.templateId);
        return (
          <div
            key={item.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              background: "var(--color-warm-gray-100, rgba(0,0,0,0.05))",
              borderRadius: "var(--radius-sm, 6px)",
              padding: compact ? "2px 6px" : "4px 8px",
            }}
            title={tmpl?.name ?? item.templateId}
          >
            {getGearIcon(item.templateId, iconSize, "var(--color-warm-gray-500)")}
            {!compact && (
              <span style={{ fontSize, lineHeight: 1.2 }}>{tmpl?.name ?? item.templateId}</span>
            )}
          </div>
        );
      })}

      {/* Accessories */}
      {equippedAccessories.map((item) => {
        const tmpl = getGearTemplate(item.templateId);
        return (
          <div
            key={item.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              background: "var(--color-warm-gray-100, rgba(0,0,0,0.05))",
              borderRadius: "var(--radius-sm, 6px)",
              padding: compact ? "2px 6px" : "4px 8px",
            }}
            title={tmpl?.name ?? item.templateId}
          >
            {getGearIcon(item.templateId, iconSize, "#8e44ad")}
            {!compact && (
              <span style={{ fontSize, lineHeight: 1.2 }}>{tmpl?.name ?? item.templateId}</span>
            )}
          </div>
        );
      })}

      {equippedApparel.length === 0 && equippedAccessories.length === 0 && !equippedShoe && (
        <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", fontStyle: "italic" }}>
          No gear equipped
        </div>
      )}
    </div>
  );
}
