import { currentScreen } from "../state/gameState";
import { navigateTo } from "../state/actions";
import type { Screen } from "../types";

interface Tab {
  screen: Screen;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { screen: "dashboard", label: "Dashboard", icon: "\u2302" },
  { screen: "training", label: "Training", icon: "\u{1F3C3}" },
  { screen: "races", label: "Races", icon: "\u{1F3C1}" },
  { screen: "shop", label: "Shop", icon: "\u{1F6CD}" },
  { screen: "stats", label: "Stats", icon: "\u{1F4CA}" },
];

export function NavBar() {
  const active = currentScreen.value;

  return (
    <nav class="navbar">
      {TABS.map((tab) => (
        <button
          key={tab.screen}
          class={`navbar__tab ${active === tab.screen ? "navbar__tab--active" : ""}`}
          onClick={() => navigateTo(tab.screen)}
        >
          <span class="navbar__tab-icon">{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
