import { useEffect } from "preact/hooks";
import { gameState, currentScreen } from "./state/gameState";
import { hasSave, load, setupAutoSave } from "./engine/saveManager";
import { NavBar } from "./components/NavBar";
import { RunnerCreation } from "./screens/RunnerCreation";
import { Dashboard } from "./screens/Dashboard";
import { Training } from "./screens/Training";
import { ActiveWorkout } from "./screens/ActiveWorkout";
import { RaceSelect } from "./screens/RaceSelect";
import { ActiveRace } from "./screens/ActiveRace";
import { Shop } from "./screens/Shop";
import { StatsView } from "./screens/StatsView";
import { Settings } from "./screens/Settings";
import { CoachSelect } from "./screens/CoachSelect";
import { AchievementToast } from "./components/AchievementToast";

const FULLSCREEN_SCREENS = new Set(["active_workout", "active_race", "runner_creation"]);

export function App() {
  useEffect(() => {
    // On mount: check for existing save
    if (hasSave()) {
      const loaded = load();
      if (loaded) {
        gameState.value = loaded;
        currentScreen.value = "dashboard";
      }
    }

    // Set up auto-save
    setupAutoSave(() => gameState.value);
  }, []);

  const screen = currentScreen.value;
  const showNav = !FULLSCREEN_SCREENS.has(screen);

  function renderScreen() {
    switch (screen) {
      case "runner_creation":
        return <RunnerCreation />;
      case "dashboard":
        return <Dashboard />;
      case "training":
        return <Training />;
      case "active_workout":
        return <ActiveWorkout />;
      case "races":
        return <RaceSelect />;
      case "active_race":
        return <ActiveRace />;
      case "shop":
        return <Shop />;
      case "stats":
        return <StatsView />;
      case "settings":
        return <Settings />;
      case "coach":
        return <CoachSelect />;
      default:
        return <Dashboard />;
    }
  }

  return (
    <div id="app-root">
      {renderScreen()}
      {showNav && <NavBar />}
      <AchievementToast />
    </div>
  );
}
