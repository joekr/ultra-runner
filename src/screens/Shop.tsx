import { useState } from "preact/hooks";
import { gameState, statValues } from "../state/gameState";
import { updateGameState } from "../state/actions";
import { Button } from "../components/Button";
import { ProgressBar } from "../components/ProgressBar";
import {
  getShoeTemplates,
  getApparelTemplates,
  getAccessoryTemplates,
  getConsumableTemplates,
  getGearTemplate,
  equipShoe,
  unequipShoe,
  equipApparel,
  unequipApparel,
  equipAccessory,
  unequipAccessory,
} from "../systems/gear";
import { buyGear, buyConsumable } from "../systems/economy";
import { ShoeIcon, ShirtIcon, WatchIcon, GelPacketIcon, getGearIcon, getConsumableIcon } from "../components/Icons";

type ShopTab = "shoes" | "apparel" | "accessories" | "fuel";

function tierStars(tier: number): string {
  return "\u2605".repeat(tier) + "\u2606".repeat(Math.max(0, 4 - tier));
}

function formatEffectName(key: string): string {
  const names: Record<string, string> = {
    speedBonus: "Speed",
    terrain: "Terrain",
    roadPenalty: "Road Penalty",
    blistReduction: "Blister Resist",
    chafePenalty: "Chafe Penalty",
    weatherProtection: "Weather Protect",
    heatProtection: "Heat Protect",
    recoveryBonus: "Recovery",
    xpBonus: "XP Bonus",
    nightBonus: "Night Vision",
  };
  return names[key] ?? key;
}

function formatEffectValue(key: string, value: number): string {
  if (key === "terrain") return String(value).replace(/_/g, " ");
  if (value < 0) return `${(value * 100).toFixed(0)}%`;
  return `+${(value * 100).toFixed(0)}%`;
}

export function Shop() {
  const [tab, setTab] = useState<ShopTab>("shoes");
  const state = gameState.value;
  if (!state) return null;

  const { inventory } = state;
  const shoeTemplates = getShoeTemplates();
  const apparelTemplates = getApparelTemplates();
  const accessoryTemplates = getAccessoryTemplates();
  const consumableTemps = getConsumableTemplates();

  function handleBuy(templateId: string) {
    if (!state) return;
    const result = buyGear(templateId, state.inventory);
    if (result.success) {
      updateGameState({ inventory: result.inventory });
    }
  }

  function handleBuyConsumable(templateId: string, quantity: number) {
    if (!state) return;
    const result = buyConsumable(templateId, quantity, state.inventory);
    if (result.success) {
      updateGameState({ inventory: result.inventory });
    }
  }

  function handleEquipShoe(gearId: string) {
    if (!state) return;
    updateGameState({ inventory: equipShoe(gearId, state.inventory) });
  }

  function handleUnequipShoe() {
    if (!state) return;
    updateGameState({ inventory: unequipShoe(state.inventory) });
  }

  function handleEquipApparel(gearId: string) {
    if (!state) return;
    updateGameState({ inventory: equipApparel(gearId, state.inventory) });
  }

  function handleUnequipApparel(gearId: string) {
    if (!state) return;
    updateGameState({ inventory: unequipApparel(gearId, state.inventory) });
  }

  function handleEquipAccessory(gearId: string) {
    if (!state) return;
    updateGameState({ inventory: equipAccessory(gearId, state.inventory) });
  }

  function handleUnequipAccessory(gearId: string) {
    if (!state) return;
    updateGameState({ inventory: unequipAccessory(gearId, state.inventory) });
  }

  const templates =
    tab === "shoes"
      ? shoeTemplates
      : tab === "apparel"
        ? apparelTemplates
        : tab === "accessories"
          ? accessoryTemplates
          : [];

  const ownedItems =
    tab === "shoes"
      ? inventory.shoes
      : tab === "apparel"
        ? inventory.apparel
        : tab === "accessories"
          ? (inventory.accessories ?? [])
          : [];

  function isEquipped(itemId: string): boolean {
    if (tab === "shoes") return inventory.equippedShoe === itemId;
    if (tab === "apparel") return inventory.equippedApparel.includes(itemId);
    return inventory.equippedAccessories.includes(itemId);
  }

  function handleEquip(itemId: string) {
    if (tab === "shoes") handleEquipShoe(itemId);
    else if (tab === "apparel") handleEquipApparel(itemId);
    else handleEquipAccessory(itemId);
  }

  function handleUnequip(itemId: string) {
    if (tab === "shoes") handleUnequipShoe();
    else if (tab === "apparel") handleUnequipApparel(itemId);
    else handleUnequipAccessory(itemId);
  }

  return (
    <div class="screen">
      <h1 class="screen__header">Shop</h1>
      <div class="shop__balance">${inventory.money}</div>

      <div class="shop__tabs">
        <button
          class={`shop__tab ${tab === "shoes" ? "shop__tab--active" : ""}`}
          onClick={() => setTab("shoes")}
        >
          <ShoeIcon size={16} /> Shoes
        </button>
        <button
          class={`shop__tab ${tab === "apparel" ? "shop__tab--active" : ""}`}
          onClick={() => setTab("apparel")}
        >
          <ShirtIcon size={16} /> Apparel
        </button>
        <button
          class={`shop__tab ${tab === "accessories" ? "shop__tab--active" : ""}`}
          onClick={() => setTab("accessories")}
        >
          <WatchIcon size={16} /> Accessories
        </button>
        <button
          class={`shop__tab ${tab === "fuel" ? "shop__tab--active" : ""}`}
          onClick={() => setTab("fuel")}
        >
          <GelPacketIcon size={16} /> Fuel
        </button>
      </div>

      {tab === "fuel" ? (
        <>
          {/* Consumable items */}
          <div class="shop__section-title">Available</div>
          <div class="shop__items">
            {consumableTemps.map((tmpl) => {
              const nutritionStat = statValues.value.nutritionIQ ?? 1;
              const meetsRequirement = nutritionStat >= tmpl.requiredNutritionIQ;
              const afford1 = inventory.money >= tmpl.cost;
              const afford5 = inventory.money >= tmpl.cost * 5;
              const owned = inventory.consumables[tmpl.id] ?? 0;
              const locked = !meetsRequirement;
              return (
                <div
                  key={tmpl.id}
                  class={`card shop__item ${locked ? "card--disabled" : ""}`}
                  style={{ display: "flex", flexDirection: "row", gap: "var(--space-3)", opacity: locked ? 0.6 : 1 }}
                >
                  <div style={{ flexShrink: 0, display: "flex", alignItems: "flex-start", paddingTop: "var(--space-1)" }}>
                    {getConsumableIcon(tmpl.id, 36, locked ? "var(--color-warm-gray-300)" : "var(--color-warm-gray-500)")}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div class="shop__item-header">
                      <span class="shop__item-name">{tmpl.name}</span>
                      <span class="shop__item-tier">{tierStars(tmpl.tier)}</span>
                    </div>
                    <div class="shop__item-desc">{tmpl.description}</div>
                    <div
                      style={{
                        fontSize: "var(--text-xs)",
                        color: "var(--color-sage-dark)",
                        fontWeight: 600,
                        marginBottom: "var(--space-1)",
                      }}
                    >
                      Reduces fatigue by {tmpl.effects.fatigueReduction}
                    </div>
                    {tmpl.requiredNutritionIQ > 0 && (
                      <div
                        style={{
                          fontSize: "var(--text-xs)",
                          color: locked ? "#c0392b" : "var(--color-text-muted)",
                          marginBottom: "var(--space-1)",
                        }}
                      >
                        {locked
                          ? `Requires Nutrition IQ ${tmpl.requiredNutritionIQ} (yours: ${Math.round(nutritionStat)})`
                          : `Nutrition IQ ${tmpl.requiredNutritionIQ} ✓`}
                      </div>
                    )}
                    {owned > 0 && (
                      <div
                        style={{
                          fontSize: "var(--text-xs)",
                          color: "var(--color-sage)",
                          marginBottom: "var(--space-2)",
                        }}
                      >
                        Owned: {owned}
                      </div>
                    )}
                    {locked ? (
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", fontStyle: "italic" }}>
                        Train your gut to unlock this fuel
                      </div>
                    ) : (
                      <div class="shop__item-footer" style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                        <span class="shop__item-cost">${tmpl.cost}</span>
                        <Button
                          label="Buy"
                          onClick={() => handleBuyConsumable(tmpl.id, 1)}
                          disabled={!afford1}
                        />
                        <Button
                          label={`Buy 5 ($${tmpl.cost * 5})`}
                          onClick={() => handleBuyConsumable(tmpl.id, 5)}
                          disabled={!afford5}
                          variant="secondary"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          {/* Available items */}
          <div class="shop__section-title">Available</div>
          <div class="shop__items">
            {templates.map((tmpl) => {
              const canAfford = inventory.money >= tmpl.cost;
              const effectEntries = Object.entries(tmpl.effects).filter(
                ([k]) => k !== "terrain",
              );
              // Check if already owned (for non-consumable one-time items like accessories)
              const alreadyOwned = ownedItems.some((item) => item.templateId === tmpl.id);
              const isOneTimePurchase = tmpl.slot === "accessories";
              return (
                <div key={tmpl.id} class="card shop__item" style={{ display: "flex", flexDirection: "row", gap: "var(--space-3)" }}>
                  <div style={{ flexShrink: 0, display: "flex", alignItems: "flex-start", paddingTop: "var(--space-1)" }}>
                    {getGearIcon(tmpl.id, 36, alreadyOwned && isOneTimePurchase ? "var(--color-sage)" : "var(--color-warm-gray-500)")}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                  <div class="shop__item-header">
                    <span class="shop__item-name">{tmpl.name}</span>
                    <span class="shop__item-tier">{tierStars(tmpl.tier)}</span>
                  </div>
                  <div class="shop__item-desc">{tmpl.description}</div>
                  {effectEntries.length > 0 && (
                    <div
                      style={{
                        fontSize: "var(--text-xs)",
                        color: "var(--color-sage-dark)",
                        marginBottom: "var(--space-2)",
                      }}
                    >
                      {effectEntries
                        .map(([k, v]) => `${formatEffectName(k)}: ${formatEffectValue(k, v as number)}`)
                        .join(", ")}
                    </div>
                  )}
                  {tab === "shoes" && (
                    <div
                      style={{
                        fontSize: "var(--text-xs)",
                        color: "var(--color-text-muted)",
                        marginBottom: "var(--space-2)",
                      }}
                    >
                      Durability: {tmpl.durability} mi
                    </div>
                  )}
                  <div class="shop__item-footer">
                    <span class="shop__item-cost">
                      {tmpl.cost > 0 ? `$${tmpl.cost}` : "Free"}
                    </span>
                    {isOneTimePurchase && alreadyOwned ? (
                      <span style={{ color: "var(--color-sage)", fontWeight: 600, fontSize: "var(--text-sm)" }}>
                        Owned
                      </span>
                    ) : tmpl.cost > 0 ? (
                      <Button
                        label="Buy"
                        onClick={() => handleBuy(tmpl.id)}
                        disabled={!canAfford}
                      />
                    ) : null}
                  </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Owned items */}
          {ownedItems.length > 0 && (
            <>
              <div class="shop__section-title">Owned</div>
              <div class="shop__items">
                {ownedItems.map((item) => {
                  const tmpl = getGearTemplate(item.templateId);
                  const equipped = isEquipped(item.id);

                  return (
                    <div key={item.id} class="card shop__owned-item" style={{ display: "flex", flexDirection: "row", gap: "var(--space-3)", alignItems: "flex-start" }}>
                      <div style={{ flexShrink: 0, display: "flex", alignItems: "flex-start", paddingTop: "var(--space-1)" }}>
                        {getGearIcon(item.templateId, 28, "var(--color-sage)")}
                      </div>
                      <div class="shop__owned-item-info" style={{ flex: 1, minWidth: 0 }}>
                        <div class="shop__owned-item-name">
                          {tmpl?.name ?? item.templateId}
                          {equipped && (
                            <span
                              style={{
                                color: "var(--color-sage)",
                                fontSize: "var(--text-xs)",
                                marginLeft: "var(--space-2)",
                              }}
                            >
                              Equipped
                            </span>
                          )}
                        </div>
                        {tab === "shoes" && (
                          <div class="shop__owned-item-durability">
                            <ProgressBar
                              value={
                                item.maxDurability > 0
                                  ? item.durability / item.maxDurability
                                  : 1
                              }
                              label={`${Math.round(item.durability)} mi left`}
                              color="var(--color-sage)"
                            />
                          </div>
                        )}
                        {tmpl && Object.keys(tmpl.effects).filter((k) => k !== "terrain").length > 0 && (
                          <div
                            style={{
                              fontSize: "var(--text-xs)",
                              color: "var(--color-text-muted)",
                              marginTop: "var(--space-1)",
                            }}
                          >
                            {Object.entries(tmpl.effects)
                              .filter(([k]) => k !== "terrain")
                              .map(([k, v]) => `${formatEffectName(k)}: ${formatEffectValue(k, v as number)}`)
                              .join(", ")}
                          </div>
                        )}
                      </div>
                      <div>
                        {equipped ? (
                          <Button
                            label="Unequip"
                            onClick={() => handleUnequip(item.id)}
                            variant="secondary"
                          />
                        ) : (
                          <Button
                            label="Equip"
                            onClick={() => handleEquip(item.id)}
                            variant="secondary"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
