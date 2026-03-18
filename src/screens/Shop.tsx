import { useState } from "preact/hooks";
import { gameState } from "../state/gameState";
import { updateGameState } from "../state/actions";
import { Button } from "../components/Button";
import { ProgressBar } from "../components/ProgressBar";
import {
  getShoeTemplates,
  getApparelTemplates,
  getGearTemplate,
  equipShoe,
  unequipShoe,
  equipApparel,
  unequipApparel,
} from "../systems/gear";
import { buyGear } from "../systems/economy";

type ShopTab = "shoes" | "apparel";

function tierStars(tier: number): string {
  return "\u2605".repeat(tier) + "\u2606".repeat(Math.max(0, 3 - tier));
}

export function Shop() {
  const [tab, setTab] = useState<ShopTab>("shoes");
  const state = gameState.value;
  if (!state) return null;

  const { inventory } = state;
  const shoeTemplates = getShoeTemplates();
  const apparelTemplates = getApparelTemplates();

  function handleBuy(templateId: string) {
    if (!state) return;
    const result = buyGear(templateId, state.inventory);
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

  const templates = tab === "shoes" ? shoeTemplates : apparelTemplates;
  const ownedItems = tab === "shoes" ? inventory.shoes : inventory.apparel;

  return (
    <div class="screen">
      <h1 class="screen__header">Shop</h1>
      <div class="shop__balance">${inventory.money}</div>

      <div class="shop__tabs">
        <button
          class={`shop__tab ${tab === "shoes" ? "shop__tab--active" : ""}`}
          onClick={() => setTab("shoes")}
        >
          Shoes
        </button>
        <button
          class={`shop__tab ${tab === "apparel" ? "shop__tab--active" : ""}`}
          onClick={() => setTab("apparel")}
        >
          Apparel
        </button>
      </div>

      {/* Available items */}
      <div class="shop__section-title">Available</div>
      <div class="shop__items">
        {templates.map((tmpl) => {
          const canAfford = inventory.money >= tmpl.cost;
          return (
            <div key={tmpl.id} class="card shop__item">
              <div class="shop__item-header">
                <span class="shop__item-name">{tmpl.name}</span>
                <span class="shop__item-tier">{tierStars(tmpl.tier)}</span>
              </div>
              <div class="shop__item-desc">{tmpl.description}</div>
              {Object.keys(tmpl.effects).length > 0 && (
                <div
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--color-sage-dark)",
                    marginBottom: "var(--space-2)",
                  }}
                >
                  {Object.entries(tmpl.effects)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(", ")}
                </div>
              )}
              <div class="shop__item-footer">
                <span class="shop__item-cost">
                  {tmpl.cost > 0 ? `$${tmpl.cost}` : "Free"}
                </span>
                {tmpl.cost > 0 && (
                  <Button
                    label="Buy"
                    onClick={() => handleBuy(tmpl.id)}
                    disabled={!canAfford}
                  />
                )}
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
              const isEquipped =
                tab === "shoes"
                  ? inventory.equippedShoe === item.id
                  : inventory.equippedApparel.includes(item.id);

              return (
                <div key={item.id} class="card shop__owned-item">
                  <div class="shop__owned-item-info">
                    <div class="shop__owned-item-name">
                      {tmpl?.name ?? item.templateId}
                      {isEquipped && (
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
                  </div>
                  <div>
                    {isEquipped ? (
                      <Button
                        label="Unequip"
                        onClick={() =>
                          tab === "shoes"
                            ? handleUnequipShoe()
                            : handleUnequipApparel(item.id)
                        }
                        variant="secondary"
                      />
                    ) : (
                      <Button
                        label="Equip"
                        onClick={() =>
                          tab === "shoes"
                            ? handleEquipShoe(item.id)
                            : handleEquipApparel(item.id)
                        }
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
    </div>
  );
}
