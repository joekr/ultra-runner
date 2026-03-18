import { currentScreen } from "../state/gameState";
import { navigateTo } from "../state/actions";
import type { Screen } from "../types";
import type { ComponentChildren } from "preact";

interface Tab {
  screen: Screen;
  label: string;
  icon: ComponentChildren;
}

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 12L12 3L21 12" />
      <path d="M5 10V20H19V10" />
      <path d="M9 20V14H15V20" />
    </svg>
  );
}

function TrainIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="14" cy="5" r="2.5" fill="currentColor" />
      <path d="M10 10L13 8L17 11L15 17L18 21" />
      <path d="M13 8L9 12L6 14" />
      <path d="M15 17L11 19L8 23" />
    </svg>
  );
}

function RaceIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 15L8 4L12 12L16 6L20 15" />
      <path d="M4 20H20" />
    </svg>
  );
}

function ShopIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 9H21L19 20H5L3 9Z" />
      <path d="M8 9V6C8 4 10 2 12 2C14 2 16 4 16 6V9" />
    </svg>
  );
}

function StatsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 20V12" />
      <path d="M9 20V8" />
      <path d="M14 20V4" />
      <path d="M19 20V10" />
    </svg>
  );
}

const TABS: Tab[] = [
  { screen: "dashboard", label: "Home", icon: <HomeIcon /> },
  { screen: "training", label: "Train", icon: <TrainIcon /> },
  { screen: "races", label: "Race", icon: <RaceIcon /> },
  { screen: "shop", label: "Shop", icon: <ShopIcon /> },
  { screen: "stats", label: "Stats", icon: <StatsIcon /> },
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
